import { createClient } from '@supabase/supabase-js';
import { db } from '@workspace/db';
import { sql } from 'drizzle-orm';

/**
 * Seed data script for staging/testing
 * Creates profiles AND auth.users so test accounts can log in.
 * Run with: `npx tsx scripts/src/seed.ts`
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function seed() {
  if (process.env.NODE_ENV === 'production') {
    console.error("Cannot run seed in production!");
    process.exit(1);
  }

  console.log('🌱 Starting database seed...');

  const adminClient = supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

  // Clear existing data
  console.log('🗑️  Clearing existing data...');
  try {
    await db.execute(sql`DELETE FROM trip_students`);
    await db.execute(sql`DELETE FROM trips`);
    await db.execute(sql`DELETE FROM subscription_requests`);
    await db.execute(sql`DELETE FROM subscriptions`);
    await db.execute(sql`DELETE FROM routes`);
    await db.execute(sql`DELETE FROM driver_schedules`);
    await db.execute(sql`DELETE FROM driver_absences`);
    await db.execute(sql`DELETE FROM cards`);
    await db.execute(sql`DELETE FROM student_preferences`);
    await db.execute(sql`DELETE FROM drivers`);
    await db.execute(sql`DELETE FROM reviews`);
    await db.execute(sql`DELETE FROM notifications`);
    await db.execute(sql`DELETE FROM profiles`);
    await db.execute(sql`DELETE FROM institutions`);
  } catch (err) {
    console.error('Error clearing data:', err);
  }

  // Clean auth.users if admin client available
  if (adminClient) {
    console.log('🗑️  Cleaning auth users...');
    try {
      const { data: authUsers } = await adminClient.auth.admin.listUsers({ perPage: 100 });
      if (authUsers?.users) {
        for (const u of authUsers.users) {
          if (u.email?.includes('seed') || u.email?.includes('uniride.local')) {
            await adminClient.auth.admin.deleteUser(u.id);
          }
        }
      }
    } catch (err) {
      console.error('Error cleaning auth users:', err);
    }
  }

  // Create institutions
  console.log('🏫 Creating institutions...');
  const instIds: string[] = [];
  const institutions = [
    { name: 'جامعة بغداد', location: 'بغداد' },
    { name: 'جامعة المستنصرية', location: 'بغداد' },
    { name: 'جامعة كربلاء', location: 'كربلاء' },
  ];

  for (const inst of institutions) {
    try {
      const result = await db.execute(sql`
        INSERT INTO institutions (id, name, location, created_at)
        VALUES (gen_random_uuid(), ${inst.name}, ${inst.location}, NOW())
        RETURNING id
      `);
      const row = (result as any).rows ? (result as any).rows[0] : (result as any)[0];
      if (row) instIds.push((row as any).id);
    } catch (err) {
      console.error(`Error creating institution ${inst.name}:`, err);
    }
  }

  // Create auth.users + profiles
  console.log('👥 Creating profiles and auth users...');
  type SeedProfile = { fullName: string; phone: string; email: string; password: string; role: string; institutionId: string | null; isActivated: boolean };

  const seedProfiles: SeedProfile[] = [
    { fullName: 'أحمد محمد', phone: '0770000001', email: 'seed_student1@uniride.local', password: '123456', role: 'student', institutionId: instIds[0] || null, isActivated: true },
    { fullName: 'سارة علي', phone: '0770000002', email: 'seed_student2@uniride.local', password: '123456', role: 'student', institutionId: instIds[0] || null, isActivated: true },
    { fullName: 'خالد حسين', phone: '0770000003', email: 'seed_student3@uniride.local', password: '123456', role: 'student', institutionId: instIds[1] || null, isActivated: true },
    { fullName: 'محمد كاظم', phone: '0770000004', email: 'seed_driver1@uniride.local', password: '123456', role: 'driver', institutionId: instIds[0] || null, isActivated: true },
    { fullName: 'علي فاضل', phone: '0770000005', email: 'seed_driver2@uniride.local', password: '123456', role: 'driver', institutionId: instIds[1] || null, isActivated: true },
    { fullName: 'إدارة النظام', phone: '0770000000', email: 'seed_admin@uniride.local', password: '123456', role: 'admin', institutionId: null, isActivated: true },
  ];

  const profileMap = new Map<string, string>(); // phone -> profile id

  for (const p of seedProfiles) {
    try {
      let userId: string;

      if (adminClient) {
        // Create auth user
        const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
          email: p.email,
          phone: p.phone,
          password: p.password,
          email_confirm: true,
          phone_confirm: true,
          user_metadata: { full_name: p.fullName, role: p.role },
        });

        if (authError) {
          console.warn(`  ⚠️ Could not create auth user for ${p.email}: ${authError.message}`);
          continue;
        }
        userId = authUser.user.id;
        console.log(`  ✅ Created auth user: ${p.email} (${p.role})`);
      } else {
        userId = crypto.randomUUID();
        console.warn(`  ⚠️ No admin client - creating profile only (user cannot log in)`);
      }

      // Create profile
      await db.execute(sql`
        INSERT INTO profiles (id, full_name, phone, role, institution_id, is_activated, is_deleted, created_at, updated_at)
        VALUES (${userId}, ${p.fullName}, ${p.phone}, ${p.role}, ${p.institutionId}, ${p.isActivated}, false, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role
      `);

      profileMap.set(p.phone, userId);
    } catch (err) {
      console.error(`Error creating profile/user for ${p.fullName}:`, err);
    }
  }

  // Create drivers
  console.log('🚗 Creating driver records...');
  const driverProfiles = seedProfiles.filter(p => p.role === 'driver');
  const driverMap = new Map<string, string>(); // profile_id -> driver_id

  for (const dp of driverProfiles) {
    try {
      const userId = profileMap.get(dp.phone);
      if (!userId) continue;

      const capacity = 4 + driverProfiles.indexOf(dp);
      await db.execute(sql`
        INSERT INTO drivers (id, user_id, vehicle_info, vehicle_plate, vehicle_color, capacity, available_seats, monthly_fee, commission_bps, is_available, is_online, is_deleted, created_at, updated_at)
        VALUES (gen_random_uuid(), ${userId}, ${dp.fullName === 'محمد كاظم' ? 'تويوتا كورولا' : 'هيونداي إلنترا'}, ${dp.fullName === 'محمد كاظم' ? 'B 123456' : 'B 654321'}, ${dp.fullName === 'محمد كاظم' ? 'أبيض' : 'فضي'}, ${capacity}, ${capacity}, 90000, 1500, true, false, false, NOW(), NOW())
        RETURNING id
      `).then(r => {
        const rows = (r as any).rows || r;
        if (rows && rows.length > 0) driverMap.set(userId, (rows[0] as any).id);
      });
    } catch (err) {
      console.error(`Error creating driver record for ${dp.fullName}:`, err);
    }
  }

  // Create routes
  console.log('🛣️  Creating routes...');
  const routeMap = new Map<string, string>(); // driver_id -> route_id

  for (const dp of driverProfiles) {
    try {
      const userId = profileMap.get(dp.phone);
      const driverId = driverMap.get(userId || '');
      if (!driverId) continue;

      const fromArea = dp.fullName === 'محمد كاظم' ? 'المنصور' : 'الكرادة';
      const university = dp.fullName === 'محمد كاظم' ? 'جامعة بغداد' : 'جامعة المستنصرية';

      await db.execute(sql`
        INSERT INTO routes (id, driver_id, from_area, from_city, to_university, institution_id, departure_morning, departure_evening, total_seats, available_seats, monthly_fare, gender_preference, rating_bps, total_students, notes, is_active, is_deleted, created_at)
        VALUES (gen_random_uuid(), ${driverId}, ${fromArea}, 'بغداد', ${university}, ${dp.institutionId}, '07:00', '14:00', 4, 4, 90000, 'any', 5000, 0, '', true, false, NOW())
        RETURNING id
      `).then(r => {
        const rows = (r as any).rows || r;
        if (rows && rows.length > 0) routeMap.set(driverId, rows[0].id);
      });
    } catch (err) {
      console.error(`Error creating route for driver ${dp.fullName}:`, err);
    }
  }

  // Create subscriptions
  console.log('📋 Creating subscriptions...');
  const today = new Date();
  const endDate = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
  const studentProfiles = seedProfiles.filter(p => p.role === 'student');

  for (let i = 0; i < Math.min(studentProfiles.length, driverProfiles.length); i++) {
    try {
      const studentId = profileMap.get(studentProfiles[i].phone);
      const dp = driverProfiles[i];
      const driverUserId = profileMap.get(dp.phone);
      const driverId = driverMap.get(driverUserId || '');
      if (!studentId || !driverId) continue;

      const commissionAmount = Math.round(90000 * 0.15);
      const driverPayout = 90000 - commissionAmount;

      await db.execute(sql`
        INSERT INTO subscriptions (id, student_id, driver_id, driver_name, start_date, end_date, monthly_fee, commission_bps, commission_amount, driver_payout, payment_status, trips_used, trips_per_month, status, is_deleted, created_at, updated_at)
        VALUES (gen_random_uuid(), ${studentId}, ${driverId}, ${dp.fullName}, ${today.toISOString().split('T')[0]}, ${endDate.toISOString().split('T')[0]}, 90000, 1500, ${commissionAmount}, ${driverPayout}, 'active', 0, 44, 'active', false, NOW(), NOW())
        ON CONFLICT DO NOTHING
      `);
    } catch (err) {
      console.error(`Error creating subscription for student ${studentProfiles[i].fullName}:`, err);
    }
  }

  // Create trips
  console.log('🚌 Creating trips...');
  for (const dp of driverProfiles) {
    try {
      const driverUserId = profileMap.get(dp.phone);
      const driverId = driverMap.get(driverUserId || '');
      if (!driverId) continue;

      // Yesterday's completed trip
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      await db.execute(sql`
        INSERT INTO trips (id, driver_id, direction, trip_date, status, started_at, ended_at, created_at)
        VALUES (gen_random_uuid(), ${driverId}, 'go', ${yesterday}, 'completed', NOW() - INTERVAL '1 day', NOW() - INTERVAL '23 hours', NOW() - INTERVAL '1 day')
      `);

      // Today's scheduled trip
      await db.execute(sql`
        INSERT INTO trips (id, driver_id, direction, trip_date, status, created_at)
        VALUES (gen_random_uuid(), ${driverId}, 'go', ${today.toISOString().split('T')[0]}, 'scheduled', NOW())
      `);
    } catch (err) {
      console.error(`Error creating trips for driver ${dp.fullName}:`, err);
    }
  }

  console.log('✅ Seed completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`   - Institutions: ${institutions.length}`);
  console.log(`   - Profiles: ${seedProfiles.length} (${studentProfiles.length} students, ${driverProfiles.length} drivers, 1 admin)`);
  console.log(`   - Drivers: ${driverProfiles.length}`);
  console.log(`   - Routes: ${driverProfiles.length}`);

  if (adminClient) {
    console.log('\n🔑 Test Accounts (password: 123456 for all):');
    for (const p of seedProfiles) {
      console.log(`   ${p.email} (${p.role})`);
    }
  } else {
    console.log('\n⚠️  Set SUPABASE_SERVICE_ROLE_KEY to create auth users automatically.');
  }
}

seed().then(() => process.exit(0)).catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});