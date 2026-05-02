import { logger } from "./logger";

export async function sendWhatsAppOtp(phone: string, code: string): Promise<void> {
  const token = process.env["WHATSAPP_TOKEN"];
  const phoneId = process.env["WHATSAPP_PHONE_ID"];
  const iraqPhone = normalizeIraqPhone(phone);

  if (!token || !phoneId) {
    logger.warn({ phone: iraqPhone }, `[DEV MODE] OTP = ${code} — أضف WHATSAPP_TOKEN و WHATSAPP_PHONE_ID لتفعيل الإرسال الفعلي`);
    return;
  }

  const url = `https://graph.facebook.com/v19.0/${phoneId}/messages`;

  const body = {
    messaging_product: "whatsapp",
    to: iraqPhone,
    type: "text",
    text: {
      body: `🎓 *يونيرايد العراق*\n\nرمز التحقق الخاص بك:\n\n*${code}*\n\n⏱ صالح لمدة 5 دقائق فقط\n🔒 لا تشاركه مع أحد`,
    },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      logger.error({ phone: iraqPhone, status: res.status, errText }, "WhatsApp send failed");

      if (res.status === 401) throw new Error("رمز واتساب غير صالح — تحقق من WHATSAPP_TOKEN");
      if (res.status === 400) throw new Error("رقم الهاتف غير مسجل في واتساب أو صيغته خاطئة");
      throw new Error("فشل إرسال رمز التحقق عبر واتساب");
    }

    logger.info({ phone: iraqPhone }, "WhatsApp OTP sent successfully");
  } catch (err: unknown) {
    if (err instanceof Error && err.message.startsWith("فشل") || err instanceof Error && err.message.startsWith("رمز") || err instanceof Error && err.message.startsWith("رقم")) {
      throw err;
    }
    logger.error({ phone: iraqPhone, err }, "WhatsApp network error");
    throw new Error("تعذّر الاتصال بخدمة واتساب، حاول مجدداً");
  }
}

function normalizeIraqPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("964")) return digits;
  if (digits.startsWith("07")) return `964${digits.slice(1)}`;
  if (digits.startsWith("7")) return `964${digits}`;
  return `964${digits}`;
}
