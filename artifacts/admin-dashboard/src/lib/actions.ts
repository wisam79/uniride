'use server';

import { getAdminClient } from './supabase-admin';
import { db } from '@workspace/db';
import { profilesTable, driversTable } from '@workspace/db/schema';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from './auth';
import { rateLimit } from './rate-limit';

const userSchema = z.object({
  fullName: z.string().min(2, 'الاسم يجب أن يكون أكثر من حرفين'),
  phone: z.string().min(10, 'رقم الهاتف غير صالح'),
  role: z.enum(['student', 'driver']),
  password: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
  institutionId: z.string().uuid().optional().nullable(),
  parentName: z.string().optional().nullable(),
  parentPhone: z.string().optional().nullable(),
  vehicleInfo: z.string().optional().nullable(),
  capacity: z.number().int().min(1).optional().nullable(),
  monthlyFee: z.number().int().min(0).optional().nullable(),
});

export async function createUser(formData: FormData) {
  await requireAdmin();
  const supabaseAdmin = getAdminClient();

  const { success } = await rateLimit('userCreation');
  if (!success) {
    return { error: 'عدد عمليات إنشاء المستخدمين كثيرة. حاول لاحقاً.' };
  }

  try {
    const data = {
      fullName: formData.get('fullName') as string,
      phone: formData.get('phone') as string,
      role: formData.get('role') as 'student' | 'driver',
      password: formData.get('password') as string,
      institutionId: (formData.get('institutionId') as string) || null,
      parentName: (formData.get('parentName') as string) || null,
      parentPhone: (formData.get('parentPhone') as string) || null,
      vehicleInfo: (formData.get('vehicleInfo') as string) || null,
      capacity: formData.get('capacity') ? parseInt(formData.get('capacity') as string) : null,
      monthlyFee: formData.get('monthlyFee')
        ? parseInt(formData.get('monthlyFee') as string)
        : null,
    };

    const parsed = userSchema.safeParse(data);
    if (!parsed.success) {
      return { error: 'بيانات غير صالحة', details: parsed.error.flatten() };
    }

    // 1. Create user in Supabase auth.users using Admin API
    // We use a dummy email based on phone since Supabase strongly prefers email for default auth setups,
    // or just rely on phone. The mobile app uses email for OTP now according to the Google OAuth session.
    // Wait, the mobile app OTP might still be using phone or email. Let's provide a dummy email.
    const dummyEmail = `user_${Date.now()}_${data.phone}@uniride.local`;

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: dummyEmail,
      phone: data.phone,
      password: data.password,
      email_confirm: true,
      phone_confirm: true,
      user_metadata: {
        full_name: data.fullName,
        role: data.role,
      },
    });

    if (authError) {
      return { error: `فشل إنشاء الحساب: ${authError.message}` };
    }

    const userId = authData.user.id;

    try {
      await db.insert(profilesTable).values({
        id: userId,
        fullName: data.fullName,
        phone: data.phone,
        role: data.role,
        institutionId: data.institutionId ?? undefined,
        parentName: data.parentName ?? undefined,
        parentPhone: data.parentPhone ?? undefined,
        isActivated: true,
      });

      if (data.role === 'driver') {
        await db.insert(driversTable).values({
          userId: userId,
          vehicleInfo: data.vehicleInfo ?? 'غير محدد',
          capacity: data.capacity ?? 4,
          availableSeats: data.capacity ?? 4,
          monthlyFee: data.monthlyFee ?? 90000,
          institutionId: data.institutionId ?? undefined,
        });
      }
    } catch (dbError: any) {
      // Rollback: delete auth user since profile/driver creation failed
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return { error: `فشل إنشاء الملف الشخصي: ${dbError.message}` };
    }

    revalidatePath('/dashboard/users');
    return { success: true };
  } catch (error: any) {
    console.error('Create user error:', error);
    return { error: 'حدث خطأ داخلي أثناء إنشاء المستخدم.' };
  }
}
