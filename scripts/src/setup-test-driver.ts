import { createClient } from '@supabase/supabase-js';
import { db } from '@workspace/db';
import { sql } from 'drizzle-orm';

const supabaseAdmin = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const email = 'wisamsamir78@gmail.com';
  console.log(`🚀 Setting up test driver account for: ${email}...`);

  // 1. Create auth user via Supabase Admin API
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: email,
    email_confirm: true,
    user_metadata: {
      full_name: 'Wisam Samir',
      role: 'driver',
    }
  });

  let userId;
  if (authError) {
    // @ts-ignore
    if (authError.code === 'email_exists' || authError.message.includes('already')) {
        console.log('User already exists in auth.users, fetching ID...');
        const { data: users } = await supabaseAdmin.auth.admin.listUsers();
        const user = users.users.find(u => u.email === email);
        if (!user) throw new Error("Could not find existing user.");
        userId = user.id;
    } else {
        console.error('Error creating user:', authError);
        return;
    }
  } else {
      userId = authData.user.id;
  }

  console.log('✅ Auth User ID:', userId);

  const randomPhone = `0770${Math.floor(100000 + Math.random() * 900000)}`;

  // 2. Upsert Profile
  console.log('👤 Creating/Updating Profile...');
  await db.execute(sql`
    INSERT INTO profiles (id, full_name, phone, role, is_activated, is_deleted, created_at, updated_at)
    VALUES (${userId}, 'Wisam (Test Driver)', ${randomPhone}, 'driver', true, false, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET role = 'driver', is_activated = true, full_name = 'Wisam (Test Driver)'
  `);

  // 3. Insert Driver details
  console.log('🚗 Assigning Vehicle (Nissan Sunny)...');
  await db.execute(sql`
    INSERT INTO drivers (id, user_id, vehicle_info, vehicle_plate, vehicle_color, capacity, available_seats, monthly_fee, commission_bps, is_available, is_online, is_deleted, created_at, updated_at)
    VALUES (gen_random_uuid(), ${userId}, 'نيسان صني', 'B 999999', 'أسود', 4, 4, 100000, 1500, true, false, false, NOW(), NOW())
    ON CONFLICT (user_id) DO NOTHING
  `);

  // Get driver id
  const driverResult = await db.execute(sql`SELECT id FROM drivers WHERE user_id = ${userId}`);
  const driverId = driverResult.rows[0].id;

  // 4. Create a route
  console.log('🛣️  Assigning Route (المنصور -> جامعة بغداد)...');
  await db.execute(sql`
    INSERT INTO routes (id, driver_id, from_area, to_university, departure_morning, departure_evening, total_seats, monthly_fare, is_active, created_at)
    VALUES (gen_random_uuid(), ${driverId}, 'المنصور', 'جامعة بغداد', '07:30', '14:30', 4, 100000, true, NOW())
    ON CONFLICT DO NOTHING
  `);

  console.log('🎉 Test driver setup complete! You can now log into the mobile app.');
}

main().catch(console.error);
