import { logger } from "./logger";

const WHATSAPP_TOKEN = process.env["WHATSAPP_TOKEN"];
const WHATSAPP_PHONE_ID = process.env["WHATSAPP_PHONE_ID"];

export async function sendWhatsAppOtp(phone: string, code: string): Promise<void> {
  const iraqPhone = normalizeIraqPhone(phone);

  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) {
    logger.warn({ phone: iraqPhone }, `[DEV] OTP code: ${code} — WhatsApp not configured`);
    return;
  }

  const url = `https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_ID}/messages`;

  const body = {
    messaging_product: "whatsapp",
    to: iraqPhone,
    type: "text",
    text: {
      body: `🔐 رمز التحقق من يونيرايد:\n\n*${code}*\n\nصالح لمدة 5 دقائق فقط.\nلا تشاركه مع أحد.`,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    logger.error({ phone: iraqPhone, status: res.status, err }, "WhatsApp send failed");
    throw new Error("فشل إرسال رمز التحقق عبر واتساب");
  }

  logger.info({ phone: iraqPhone }, "WhatsApp OTP sent");
}

function normalizeIraqPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("964")) return digits;
  if (digits.startsWith("07")) return `964${digits.slice(1)}`;
  if (digits.startsWith("7")) return `964${digits}`;
  return `964${digits}`;
}
