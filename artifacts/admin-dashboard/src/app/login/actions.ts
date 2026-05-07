'use server';

import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { rateLimit } from '@/lib/rate-limit';

export async function loginAction(prevState: { error: string } | undefined, formData: FormData) {
  const { success } = await rateLimit('login');
  if (!success) {
    return { error: 'عدد محاولات الدخول كثيرة. حاول لاحقاً.' };
  }

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'يرجى ملء جميع الحقول' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { error: 'البريد الإلكتروني غير صالح' };
  }

  if (password.length < 6) {
    return { error: 'كلمة المرور يجب أن تكون ٦ أحرف على الأقل' };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' };
  }

  redirect('/dashboard');
}
