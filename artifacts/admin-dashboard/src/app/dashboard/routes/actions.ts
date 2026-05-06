'use server';

import { db } from '@workspace/db';
import { routesTable, institutionsTable } from '@workspace/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const routeSchema = z.object({
  driverId: z.string().uuid('يجب اختيار السائق'),
  fromArea: z.string().min(2, 'منطقة الانطلاق مطلوبة'),
  toUniversity: z.string().min(2, 'اسم الجامعة مطلوب'),
  departureMorning: z.string().min(1, 'وقت الذهاب الصباحي مطلوب'),
  departureEvening: z.string().min(1, 'وقت العودة المسائي مطلوب'),
  totalSeats: z.coerce.number().int().min(1, 'المقاعد يجب أن تكون 1 على الأقل'),
  monthlyFare: z.coerce.number().int().min(0, 'الأجرة الشهرية غير صالحة'),
  genderPreference: z.enum(['any', 'female', 'male']),
  institutionId: z.string().uuid().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function createRoute(formData: FormData) {
  try {
    const data = {
      driverId: formData.get('driverId') as string,
      fromArea: formData.get('fromArea') as string,
      toUniversity: formData.get('toUniversity') as string,
      departureMorning: formData.get('departureMorning') as string,
      departureEvening: formData.get('departureEvening') as string,
      totalSeats: formData.get('totalSeats') as string,
      monthlyFare: formData.get('monthlyFare') as string,
      genderPreference: formData.get('genderPreference') as string ?? 'any',
      institutionId: formData.get('institutionId') as string || null,
      notes: formData.get('notes') as string || null,
    };

    const parsed = routeSchema.safeParse(data);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return { error: firstError?.message || 'بيانات غير صالحة' };
    }

    const { institutionId, notes, ...routeData } = parsed.data;

    await db.insert(routesTable).values({
      ...routeData,
      availableSeats: routeData.totalSeats,
      institutionId: institutionId ?? undefined,
      notes: notes ?? undefined,
    });

    revalidatePath('/dashboard/routes');
    return { success: true };
  } catch (error: any) {
    console.error('Create route error:', error);
    return { error: 'حدث خطأ أثناء إنشاء المسار.' };
  }
}

export async function updateRoute(id: string, formData: FormData) {
  try {
    const data = {
      driverId: formData.get('driverId') as string,
      fromArea: formData.get('fromArea') as string,
      toUniversity: formData.get('toUniversity') as string,
      departureMorning: formData.get('departureMorning') as string,
      departureEvening: formData.get('departureEvening') as string,
      totalSeats: formData.get('totalSeats') as string,
      monthlyFare: formData.get('monthlyFare') as string,
      genderPreference: formData.get('genderPreference') as string ?? 'any',
      institutionId: formData.get('institutionId') as string || null,
      notes: formData.get('notes') as string || null,
    };

    const parsed = routeSchema.safeParse(data);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return { error: firstError?.message || 'بيانات غير صالحة' };
    }

    const { institutionId, notes, ...routeData } = parsed.data;

    await db.update(routesTable)
      .set({
        ...routeData,
        totalSeats: routeData.totalSeats,
        institutionId: institutionId ?? undefined,
        notes: notes ?? undefined,
      })
      .where(eq(routesTable.id, id));

    revalidatePath('/dashboard/routes');
    return { success: true };
  } catch (error: any) {
    console.error('Update route error:', error);
    return { error: 'حدث خطأ أثناء تحديث المسار.' };
  }
}

export async function deleteRoute(id: string) {
  try {
    await db.update(routesTable)
      .set({ isDeleted: true })
      .where(eq(routesTable.id, id));

    revalidatePath('/dashboard/routes');
    return { success: true };
  } catch (error: any) {
    console.error('Delete route error:', error);
    return { error: 'حدث خطأ أثناء حذف المسار.' };
  }
}

export async function toggleRouteActive(id: string, isActive: boolean) {
  try {
    await db.update(routesTable)
      .set({ isActive })
      .where(eq(routesTable.id, id));

    revalidatePath('/dashboard/routes');
    return { success: true };
  } catch (error: any) {
    console.error('Toggle route error:', error);
    return { error: 'حدث خطأ أثناء تغيير حالة المسار.' };
  }
}