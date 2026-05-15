import { z } from 'zod';

export const UserRole = z.enum(['admin', 'student', 'driver']);
export type UserRole = z.infer<typeof UserRole>;

export const MoneyAmount = z.number().int().min(0);

export const TripStatus = z.enum([
  'scheduled',
  'driver_waiting',
  'in_transit',
  'completed',
  'absent',
  'cancelled',
]);
export type TripStatus = z.infer<typeof TripStatus>;

export const ValidTransitions: Record<TripStatus, TripStatus[]> = {
  scheduled: ['driver_waiting', 'cancelled'],
  driver_waiting: ['in_transit', 'cancelled'],
  in_transit: ['completed', 'absent'],
  completed: [],
  absent: [],
  cancelled: [],
};

export function canTransition(from: TripStatus, to: TripStatus): boolean {
  return ValidTransitions[from]?.includes(to) ?? false;
}

export const GeoCoordinates = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const BookingRequest = z.object({
  routeId: z.string().uuid(),
  studentId: z.string().uuid(),
});
export type BookingRequest = z.infer<typeof BookingRequest>;

export const CheckoutRequest = z.object({
  routeId: z.string().uuid(),
});
export type CheckoutRequest = z.infer<typeof CheckoutRequest>;

export const NotificationRequest = z
  .object({
    targetUserId: z.string().uuid().optional(),
    targetRole: z.enum(['all', 'student', 'driver']).optional(),
    title: z.string().min(1),
    body: z.string().min(1),
    data: z.record(z.unknown()).optional(),
  })
  .refine((data) => data.targetUserId || data.targetRole, {
    message: 'Must provide either targetUserId or targetRole',
  });
export type NotificationRequest = z.infer<typeof NotificationRequest>;

export const ZainCashWebhookRequest = z.object({
  token: z.string().min(1),
});
export type ZainCashWebhookRequest = z.infer<typeof ZainCashWebhookRequest>;

export const TripUpdateRequest = z.object({
  tripId: z.string().uuid(),
  newStatus: TripStatus,
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
});
export type TripUpdateRequest = z.infer<typeof TripUpdateRequest>;

export const SubscriptionStatus = z.enum(['pending', 'active', 'expired', 'cancelled']);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatus>;

export const InstitutionSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  city: z.string().nullable().optional(),
  created_at: z.string(),
});
export type Institution = z.infer<typeof InstitutionSchema>;

export const RouteSchema = z.object({
  id: z.string().uuid(),
  driver_id: z.string().uuid(),
  institution_id: z.string().uuid().nullable().optional(),
  title: z.string().min(1),
  start_location: z.string().min(1),
  end_location: z.string().min(1),
  price: z.number().int().min(0),
  capacity: z.number().int().min(1),
  available_seats: z.number().int().min(0),
  is_active: z.boolean(),
  start_lat: z.number().nullable().optional(),
  start_lng: z.number().nullable().optional(),
  end_lat: z.number().nullable().optional(),
  end_lng: z.number().nullable().optional(),
  departure_time: z.string().nullable().optional(),
  return_time: z.string().nullable().optional(),
});
export type Route = z.infer<typeof RouteSchema>;

export const RatingSchema = z.object({
  id: z.string().uuid(),
  trip_id: z.string().uuid(),
  student_id: z.string().uuid(),
  driver_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().nullable().optional(),
  created_at: z.string(),
});
export type Rating = z.infer<typeof RatingSchema>;

export const TripSchema = z.object({
  id: z.string().uuid(),
  route_id: z.string().uuid(),
  driver_id: z.string().uuid(),
  status: TripStatus,
  scheduled_at: z.string(),
  started_at: z.string().nullable(),
  ended_at: z.string().nullable(),
  last_lat: z.number().nullable(),
  last_lng: z.number().nullable(),
});
export type Trip = z.infer<typeof TripSchema>;

export const SubscriptionSchema = z.object({
  id: z.string().uuid(),
  student_id: z.string().uuid(),
  route_id: z.string().uuid(),
  status: SubscriptionStatus,
  start_date: z.string(),
  end_date: z.string(),
  created_at: z.string(),
});
export type Subscription = z.infer<typeof SubscriptionSchema>;

export const LicenseStatus = z.enum(['active', 'used', 'revoked']);
export type LicenseStatus = z.infer<typeof LicenseStatus>;

export const LicenseSchema = z.object({
  id: z.string().uuid(),
  batch_id: z.string().uuid(),
  route_id: z.string().uuid(),
  code: z.string(),
  status: LicenseStatus,
  used_by: z.string().uuid().nullable().optional(),
  used_at: z.string().nullable().optional(),
  valid_days: z.number().int().min(1),
  created_at: z.string(),
});
export type License = z.infer<typeof LicenseSchema>;

export const LicenseBatchSchema = z.object({
  id: z.string().uuid(),
  created_by: z.string().uuid(),
  route_id: z.string().uuid(),
  batch_name: z.string(),
  quantity: z.number().int().min(1),
  price: z.number().min(0),
  valid_days: z.number().int().min(1),
  created_at: z.string(),
});
export type LicenseBatch = z.infer<typeof LicenseBatchSchema>;

export const DriverPayoutStatus = z.enum(['pending', 'completed', 'rejected']);
export type DriverPayoutStatus = z.infer<typeof DriverPayoutStatus>;

export const DriverPayoutSchema = z.object({
  id: z.string().uuid(),
  driver_id: z.string().uuid(),
  amount: z.number().min(0.01),
  status: DriverPayoutStatus,
  reference_note: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type DriverPayout = z.infer<typeof DriverPayoutSchema>;

export const ProfileSchema = z.object({
  id: z.string().uuid(),
  full_name: z.string().min(1),
  phone: z.string().min(1),
  role: UserRole,
  institution_id: z.string().uuid().nullable(),
  is_verified: z.boolean().default(false),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Profile = z.infer<typeof ProfileSchema>;

export const Languages = z.enum(['ar', 'en']);
export type Language = z.infer<typeof Languages>;

export const Translations: Record<Language, Record<string, string>> = {
  ar: {
    welcome: 'مرحباً بك في يونيرايد',
    book_now: 'احجز الآن',
    no_seats: 'عذراً، لا توجد مقاعد متاحة',
    trip_started: 'بدأت الرحلة',
    login: 'تسجيل الدخول',
    signup: 'إنشاء حساب',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    loading: 'جاري التحميل...',
    available_routes: 'الخطوط المتاحة',
    my_subscriptions: 'اشتراكاتي',
    profile: 'الملف الشخصي',
    logout: 'تسجيل الخروج',
    driver_dashboard: 'لوحة السائق',
    start_trip: 'بدء الرحلة',
    end_trip: 'إنهاء الرحلة',
    cancel_trip: 'إلغاء الرحلة',
    waiting_for_driver: 'في انتظار السائق',
    in_transit: 'في الطريق',
    completed: 'مكتملة',
    cancelled: 'ملغاة',
    scheduled: 'مجدولة',
    absent: 'غائب',
    driver_waiting: 'السائق ينتظر',
    from: 'من',
    to: 'إلى',
    price: 'السعر',
    seats_available: 'مقاعد متاحة',
    seat_reserved: 'تم حجز المقعد بنجاح!',
    booking_failed: 'فشل الحجز',
    live_tracking: 'التتبع المباشر',
    no_active_trips: 'لا توجد رحلات نشطة',
    confirm_booking: 'تأكيد الحجز',
    route_details: 'تفاصيل الخط',
    subscription_active: 'فعال',
    subscription_expired: 'منتهي',
    subscription_cancelled: 'ملغي',
    subscription_pending: 'قيد الانتظار',
    error_generic: 'حدث خطأ، يرجى المحاولة مرة أخرى',
    no_internet: 'لا يوجد اتصال بالإنترنت',
    cancel_subscription: 'إلغاء الاشتراك',
    save: 'حفظ',
    phone: 'الهاتف',
    language: 'اللغة',
    retry: 'إعادة المحاولة',
    go_back: 'رجوع',
    are_you_sure: 'هل أنت متأكد؟',
    no: 'لا',
    yes: 'نعم',
    updated_successfully: 'تم التحديث بنجاح',
    something_went_wrong: 'حدث خطأ ما',
    try_again: 'حاول مرة أخرى',
    check_inbox: 'يرجى التحقق من بريدك الإلكتروني للتحقق',
    invalid_transition: 'انتقال حالة غير صالح',
    cancel_confirmation: 'هل أنت متأكد من إلغاء هذا الاشتراك؟',
    full_name: 'الاسم الكامل',
    i_am: 'أنا...',
    student: 'طالب',
    driver: 'سائق',
    forgot_password: 'نسيت كلمة المرور؟',
    already_have_account: 'لديك حساب بالفعل؟ ',
    dont_have_account: 'لا تملك حساباً؟ ',
    account_created: 'تم إنشاء الحساب بنجاح!',
    enter_email_first: 'يرجى إدخال بريدك الإلكتروني أولاً',
    reset_link_sent: 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني',
    sent: 'تم الإرسال',
    alert: 'تنبيه',
    error: 'خطأ',
    uniride_tagline: 'نقل جامعي ذكي',
    activation_required: 'التفعيل مطلوب',
    activation_prompt: 'الحجز يتم عبر كود ترخيص. افتح شاشة التفعيل الآن.',
    cancel: 'إلغاء',
    open_activation: 'فتح التفعيل',
    route_not_found: 'لم يتم العثور على الخط',
    activate_license: 'تفعيل الترخيص',
    currency: 'د.ع',
    trip_history: 'سجل الرحلات',
    unknown_route: 'مسار غير معروف',
    unknown_driver: 'سائق غير معروف',
    no_trips_found: 'لا توجد رحلات سابقة',
    hello: 'مرحباً',
    search_routes_placeholder: 'إلى أين تريد الذهاب؟',
    search_routes_subtitle: 'ابحث عن خط نقلك',
    activate_new_license: 'تفعيل ترخيص جديد',
    activate_license_description: 'أدخل الكود لتفعيل اشتراكك',
    departure: 'ذهاب',
    return: 'إياب',
    seat: 'مقعد',
    no_available_routes: 'لا توجد خطوط متاحة',
    pull_to_refresh: 'اسحب للأسفل للتحديث',
    failed_to_load_routes: 'تعذّر تحميل الخطوط',
    available_routes_count: 'خط متاح',
    home: 'الرئيسية',
    book_trip: 'حجز رحلة',
    account: 'الحساب',
    activate_subscription: 'تفعيل اشتراك',
    check_inbox_title: 'تحقق من بريدك',
    check_inbox_msg: 'أرسلنا لك رابط تفعيل على بريدك الإلكتروني',
    admin: 'مدير',
    arabic: 'العربية',
    english: 'English',
    go_back_short: 'تراجع',
    active: 'نشط',
    used: 'مستخدم',
    revoked: 'ملغي',
    activate: 'تفعيل',
    invalid_license: 'كود التفعيل غير صالح',
    activation_success: 'تم تفعيل الاشتراك بنجاح!',
    license_code: 'كود الترخيص',
    enter_license_code: 'أدخل كود الترخيص المكون من 8 رموز',
    confirm_payout: 'تأكيد عملية الدفع',
    payout_submitted: 'تم إرسال طلب الدفع',
    status: 'الحالة',
    comment: 'تعليق',
    rating: 'التقييم',
    submit: 'إرسال',
    optional: 'اختياري',
    create_trip: 'إنشاء رحلة',
    user: 'المستخدم',
    enter_full_name: 'أدخل اسمك الكامل',
    success: 'نجاح',
    ok: 'حسناً',
    license_placeholder: 'مثال: A1B2C3D4',
    invalid_code_length: 'يرجى إدخال كود ترخيص صحيح (8 رموز)',
    activation_failed: 'فشل التفعيل',
    invalid_code_error: 'الكود غير صالح أو مستخدم مسبقاً',
    trip_opened_success: 'تم فتح الرحلة واستقبال الطلاب بنجاح',
    trip_creation_error: 'خطأ في إنشاء الرحلة',
    new_trip: 'رحلة جديدة',
    select_route_prompt: 'اختر الخط الذي ستقوم بالرحلة عليه الآن:',
    passengers: 'راكب',
    no_routes_assigned: 'لم يتم تخصيص خطوط لك بعد',
    open_trip_now: 'فتح الرحلة الآن',
    request_payout_title: 'طلب سحب أرباح',
    request_payout_confirm: 'هل أنت متأكد من طلب سحب أرباحك؟',
    confirm_request: 'تأكيد الطلب',
    payout_submitted_success: 'تم إرسال طلب السحب بنجاح. سيتم مراجعته قريباً.',
    start_receiving_students: 'بدء استقبال الطلاب',
    start_trip_action: 'انطلاق الرحلة',
    cancel_trip_confirm: 'هل أنت متأكد من إلغاء هذه الرحلة؟',
    yes_cancel: 'نعم، قم بالإلغاء',
    available_balance: 'الرصيد المتاح للسحب',
    withdraw_request: 'طلب سحب',
    no_scheduled_trips: 'لا توجد رحلات مجدولة حالياً',
    onboarding_1_desc: 'احجز مقعدك في خطوط النقل الجامعية بكل سهولة ويسر من هاتفك المحمول.',
    onboarding_2_title: 'تتبع رحلتك المباشر',
    onboarding_2_desc: 'لا داعي للانتظار طويلاً، تابع حركة السائق مباشرة عبر الخريطة.',
    onboarding_3_title: 'آمن وموثوق',
    onboarding_3_desc: 'سائقون معتمدون ومركبات آمنة لضمان راحتك في رحلتك اليومية للجامعة.',
    skip: 'تخطي',
    get_started: 'ابدأ الآن',
    next: 'التالي',
    failed_to_find_trip: 'تعذّر البحث عن رحلة نشطة',
    track_trip: 'تتبع الرحلة',
    no_subscriptions: 'لا توجد اشتراكات',
    book_route_prompt: 'احجز خطاً من الصفحة الرئيسية',
    tracking: 'التتبع',
    please_rate: 'يرجى اختيار عدد النجوم للتقييم',
    thank_you: 'شكراً لك',
    rating_success: 'تم إرسال تقييمك بنجاح!',
    how_was_trip: 'كيف كانت رحلتك؟',
    rating_subtitle: 'تقييمك يساعدنا في تحسين جودة النقل للجميع',
    additional_notes_optional: 'ملاحظات إضافية (اختياري)',
    comment_placeholder: 'اكتب تعليقك هنا...',
    submit_rating: 'إرسال التقييم',
    start_point: 'نقطة الانطلاق',
    end_point: 'نقطة الوصول',
    driver_location: 'موقع السائق',
    app_error: '⚠️ خطأ في التطبيق',
    unexpected_error: 'حدث خطأ غير متوقع',
    please_restart: 'يرجى إعادة تشغيل التطبيق',
  },
  en: {
    welcome: 'Welcome to UniRide',
    book_now: 'Book Now',
    no_seats: 'Sorry, no seats available',
    trip_started: 'Trip Started',
    login: 'Login',
    signup: 'Create Account',
    email: 'Email',
    password: 'Password',
    loading: 'Loading...',
    available_routes: 'Available Routes',
    my_subscriptions: 'My Subscriptions',
    profile: 'Profile',
    logout: 'Logout',
    driver_dashboard: 'Driver Dashboard',
    start_trip: 'Start Trip',
    end_trip: 'End Trip',
    cancel_trip: 'Cancel Trip',
    waiting_for_driver: 'Waiting for Driver',
    in_transit: 'In Transit',
    completed: 'Completed',
    cancelled: 'Cancelled',
    scheduled: 'Scheduled',
    absent: 'Absent',
    driver_waiting: 'Driver Waiting',
    from: 'From',
    to: 'To',
    price: 'Price',
    seats_available: 'seats available',
    seat_reserved: 'Seat reserved successfully!',
    booking_failed: 'Booking failed',
    live_tracking: 'Live Tracking',
    no_active_trips: 'No active trips',
    confirm_booking: 'Confirm Booking',
    route_details: 'Route Details',
    subscription_active: 'Active',
    subscription_expired: 'Expired',
    subscription_cancelled: 'Cancelled',
    subscription_pending: 'Pending',
    error_generic: 'An error occurred, please try again',
    no_internet: 'No internet connection',
    cancel_subscription: 'Cancel Subscription',
    save: 'Save',
    phone: 'Phone',
    language: 'Language',
    retry: 'Retry',
    go_back: 'Go Back',
    are_you_sure: 'Are you sure?',
    no: 'No',
    yes: 'Yes',
    updated_successfully: 'Updated successfully',
    something_went_wrong: 'Something went wrong',
    try_again: 'Try Again',
    check_inbox: 'Please check your inbox for email verification',
    invalid_transition: 'Invalid status transition',
    cancel_confirmation: 'Are you sure you want to cancel this subscription?',
    full_name: 'Full Name',
    i_am: 'I am...',
    student: 'Student',
    driver: 'Driver',
    forgot_password: 'Forgot Password?',
    already_have_account: 'Already have an account? ',
    dont_have_account: "Don't have an account? ",
    account_created: 'Account created successfully!',
    enter_email_first: 'Please enter your email first',
    reset_link_sent: 'A password reset link has been sent to your email',
    sent: 'Sent',
    alert: 'Alert',
    error: 'Error',
    uniride_tagline: 'Smart University Transit',
    activation_required: 'Activation Required',
    activation_prompt: 'Booking requires a license code. Open the activation screen now.',
    cancel: 'Cancel',
    open_activation: 'Open Activation',
    route_not_found: 'Route not found',
    activate_license: 'Activate License',
    currency: 'IQD',
    trip_history: 'Trip History',
    unknown_route: 'Unknown Route',
    unknown_driver: 'Unknown Driver',
    no_trips_found: 'No trips found',
    hello: 'Hello',
    search_routes_placeholder: 'Where do you want to go?',
    search_routes_subtitle: 'Search for your route',
    activate_new_license: 'Activate New License',
    activate_license_description: 'Enter code to activate subscription',
    departure: 'Departure',
    return: 'Return',
    seat: 'Seat',
    no_available_routes: 'No available routes',
    pull_to_refresh: 'Pull down to refresh',
    failed_to_load_routes: 'Failed to load routes',
    available_routes_count: 'available routes',
    home: 'Home',
    book_trip: 'Book Trip',
    account: 'Account',
    activate_subscription: 'Activate Subscription',
    check_inbox_title: 'Check your inbox',
    check_inbox_msg: 'We sent you an activation link to your email',
    admin: 'Admin',
    arabic: 'Arabic',
    english: 'English',
    go_back_short: 'Back',
    active: 'Active',
    used: 'Used',
    revoked: 'Revoked',
    activate: 'Activate',
    invalid_license: 'Invalid license code',
    activation_success: 'Subscription activated successfully!',
    license_code: 'License Code',
    enter_license_code: 'Enter 8-digit license code',
    confirm_payout: 'Confirm Payout',
    payout_submitted: 'Payout request submitted',
    status: 'Status',
    comment: 'Comment',
    rating: 'Rating',
    submit: 'Submit',
    optional: 'Optional',
    create_trip: 'Create Trip',
    user: 'User',
    enter_full_name: 'Enter your full name',
    success: 'Success',
    ok: 'OK',
    license_placeholder: 'e.g., A1B2C3D4',
    invalid_code_length: 'Please enter a valid 8-digit license code',
    activation_failed: 'Activation Failed',
    invalid_code_error: 'Invalid or already used code',
    trip_opened_success: 'Trip started and accepting students successfully',
    trip_creation_error: 'Error creating trip',
    new_trip: 'New Trip',
    select_route_prompt: 'Select the route you are starting now:',
    passengers: 'passengers',
    no_routes_assigned: 'No routes assigned to you yet',
    open_trip_now: 'Open Trip Now',
    request_payout_title: 'Request Payout',
    request_payout_confirm: 'Are you sure you want to request a payout?',
    confirm_request: 'Confirm Request',
    payout_submitted_success: 'Payout request submitted successfully. It will be reviewed soon.',
    start_receiving_students: 'Start receiving students',
    start_trip_action: 'Start Trip',
    cancel_trip_confirm: 'Are you sure you want to cancel this trip?',
    yes_cancel: 'Yes, cancel it',
    available_balance: 'Available balance for withdrawal',
    withdraw_request: 'Withdraw Request',
    no_scheduled_trips: 'No scheduled trips currently',
    onboarding_1_desc: 'Book your seat in university transit lines easily from your mobile phone.',
    onboarding_2_title: 'Live Trip Tracking',
    onboarding_2_desc: 'No need to wait long, follow the driver’s movement live on the map.',
    onboarding_3_title: 'Safe and Reliable',
    onboarding_3_desc: 'Certified drivers and safe vehicles to ensure your comfort on your daily trip to the university.',
    skip: 'Skip',
    get_started: 'Get Started',
    next: 'Next',
    failed_to_find_trip: 'Failed to find active trip',
    track_trip: 'Track Trip',
    no_subscriptions: 'No subscriptions',
    book_route_prompt: 'Book a route from the home page',
    tracking: 'Tracking',
    please_rate: 'Please select a star rating',
    thank_you: 'Thank you',
    rating_success: 'Your rating has been submitted successfully!',
    how_was_trip: 'How was your trip?',
    rating_subtitle: 'Your feedback helps us improve transportation for everyone',
    additional_notes_optional: 'Additional notes (optional)',
    comment_placeholder: 'Write your comment here...',
    submit_rating: 'Submit Rating',
    start_point: 'Start Point',
    end_point: 'End Point',
    driver_location: 'Driver Location',
    app_error: '⚠️ App Error',
    unexpected_error: 'An unexpected error occurred',
    please_restart: 'Please restart the application',
  },
};

// NOTE: Theme tokens are defined in apps/mobile/src/theme/ — do not add here.

// ─── Exponential Backoff with Jitter ──────────────────────────────────────────

export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'An unknown error occurred';
}

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Base delay in milliseconds (default: 500) */
  baseDelayMs?: number;
  /** Maximum delay cap in milliseconds (default: 30000) */
  maxDelayMs?: number;
  /** Predicate to decide whether to retry on a given error (default: always retry) */
  shouldRetry?: (error: unknown) => boolean;
}

/**
 * Retries an async function with exponential backoff and random jitter.
 * Safe to use in Deno, Node, and React Native — no platform-specific imports.
 *
 * delay = min(baseDelayMs * 2^attempt + jitter, maxDelayMs)
 * where jitter is a random integer in [0, baseDelayMs)
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options?: RetryOptions,
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 500,
    maxDelayMs = 30000,
    shouldRetry = () => true,
  } = options ?? {};

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (!shouldRetry(err)) throw err;
      if (attempt === maxRetries) break;

      const jitter = Math.floor(Math.random() * baseDelayMs);
      const delay = Math.min(baseDelayMs * Math.pow(2, attempt) + jitter, maxDelayMs);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
