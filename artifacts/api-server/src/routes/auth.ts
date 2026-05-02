import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, otpCodesTable } from "@workspace/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { signToken, requireAuth, type AuthRequest } from "../middleware/auth";
import { sendWhatsAppOtp } from "../lib/whatsapp";
import { z } from "zod";
import crypto from "crypto";

const router = Router();

function generateOtp(): string {
  return String(crypto.randomInt(100000, 999999));
}

const sendOtpSchema = z.object({
  phone: z.string().regex(/^07\d{9}$/, "رقم الهاتف يجب أن يبدأ بـ 07 ويكون 11 رقماً"),
});

router.post("/auth/send-otp", async (req, res) => {
  const parsed = sendOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? "رقم الهاتف غير صحيح" });
    return;
  }

  const { phone } = parsed.data;

  try {
    const recent = await db
      .select()
      .from(otpCodesTable)
      .where(
        and(
          eq(otpCodesTable.phone, phone),
          gt(otpCodesTable.expiresAt, new Date()),
          eq(otpCodesTable.used, false)
        )
      )
      .limit(1);

    if (recent.length > 0) {
      const created = new Date(recent[0]!.createdAt).getTime();
      const secondsElapsed = (Date.now() - created) / 1000;
      if (secondsElapsed < 60) {
        const wait = Math.ceil(60 - secondsElapsed);
        res.status(429).json({ error: `انتظر ${wait} ثانية قبل إعادة الإرسال` });
        return;
      }
    }

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await db.insert(otpCodesTable).values({ phone, code, expiresAt });
    await sendWhatsAppOtp(phone, code);

    res.json({ message: "تم إرسال رمز التحقق عبر واتساب", phone });
  } catch (err: any) {
    req.log.error(err, "send-otp error");
    res.status(500).json({ error: err.message ?? "خطأ في الخادم" });
  }
});

const verifyOtpSchema = z.object({
  phone: z.string().regex(/^07\d{9}$/),
  code: z.string().length(6),
  name: z.string().min(2).optional(),
  role: z.enum(["student", "driver"]).optional(),
  university: z.string().optional(),
  vehicleType: z.string().optional(),
  vehiclePlate: z.string().optional(),
  vehicleColor: z.string().optional(),
  basicFare: z.number().optional(),
  standardFare: z.number().optional(),
  premiumFare: z.number().optional(),
});

router.post("/auth/verify-otp", async (req, res) => {
  const parsed = verifyOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "بيانات غير صحيحة" });
    return;
  }

  const { phone, code, name, role, university, vehicleType, vehiclePlate, vehicleColor, basicFare, standardFare, premiumFare } = parsed.data;

  try {
    const [otp] = await db
      .select()
      .from(otpCodesTable)
      .where(
        and(
          eq(otpCodesTable.phone, phone),
          gt(otpCodesTable.expiresAt, new Date()),
          eq(otpCodesTable.used, false)
        )
      )
      .orderBy(otpCodesTable.createdAt)
      .limit(1);

    if (!otp) {
      res.status(400).json({ error: "الرمز منتهي الصلاحية، اطلب رمزاً جديداً" });
      return;
    }

    if (otp.attempts >= 5) {
      res.status(429).json({ error: "تجاوزت عدد المحاولات، اطلب رمزاً جديداً" });
      return;
    }

    if (otp.code !== code) {
      await db
        .update(otpCodesTable)
        .set({ attempts: otp.attempts + 1 })
        .where(eq(otpCodesTable.id, otp.id));
      const remaining = 5 - (otp.attempts + 1);
      res.status(400).json({ error: `رمز التحقق غير صحيح، تبقى ${remaining} محاولات` });
      return;
    }

    await db.update(otpCodesTable).set({ used: true }).where(eq(otpCodesTable.id, otp.id));

    const [existing] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.phone, phone))
      .limit(1);

    if (existing) {
      const token = signToken(existing.id);
      res.json({ token, user: existing, isNewUser: false });
      return;
    }

    if (!name || !role) {
      res.status(200).json({ verified: true, isNewUser: true, phone });
      return;
    }

    const [user] = await db
      .insert(usersTable)
      .values({
        name,
        phone,
        role,
        university,
        vehicleType,
        vehiclePlate,
        vehicleColor,
        basicFare: basicFare ?? 50000,
        standardFare: standardFare ?? 80000,
        premiumFare: premiumFare ?? 120000,
      })
      .returning();

    const token = signToken(user!.id);
    res.status(201).json({ token, user, isNewUser: true });
  } catch (err) {
    req.log.error(err, "verify-otp error");
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

const registerSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10),
  role: z.enum(["student", "driver"]),
  university: z.string().optional(),
  vehicleType: z.string().optional(),
  vehiclePlate: z.string().optional(),
  vehicleColor: z.string().optional(),
  basicFare: z.number().optional(),
  standardFare: z.number().optional(),
  premiumFare: z.number().optional(),
});

router.post("/auth/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "بيانات غير صالحة", details: parsed.error.flatten() });
    return;
  }
  const data = parsed.data;
  try {
    const existing = await db.select().from(usersTable).where(eq(usersTable.phone, data.phone)).limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "رقم الهاتف مسجل مسبقاً" });
      return;
    }
    const [user] = await db.insert(usersTable).values({
      name: data.name,
      phone: data.phone,
      role: data.role,
      university: data.university,
      vehicleType: data.vehicleType,
      vehiclePlate: data.vehiclePlate,
      vehicleColor: data.vehicleColor,
      basicFare: data.basicFare ?? 50000,
      standardFare: data.standardFare ?? 80000,
      premiumFare: data.premiumFare ?? 120000,
    }).returning();
    const token = signToken(user!.id);
    res.status(201).json({ token, user });
  } catch (err) {
    req.log.error(err, "register error");
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

router.post("/auth/login", async (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    res.status(400).json({ error: "رقم الهاتف مطلوب" });
    return;
  }
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.phone, String(phone))).limit(1);
    if (!user) {
      res.status(404).json({ error: "المستخدم غير موجود" });
      return;
    }
    const token = signToken(user.id);
    res.json({ token, user });
  } catch (err) {
    req.log.error(err, "login error");
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

router.get("/auth/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    if (!user) { res.status(404).json({ error: "المستخدم غير موجود" }); return; }
    res.json(user);
  } catch (err) {
    req.log.error(err, "me error");
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

router.patch("/auth/me", requireAuth, async (req: AuthRequest, res) => {
  const allowed = ["name", "university", "vehicleType", "vehiclePlate", "vehicleColor", "basicFare", "standardFare", "premiumFare", "isOnline"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in req.body) updates[key] = req.body[key];
  }
  try {
    const [user] = await db.update(usersTable).set(updates as any).where(eq(usersTable.id, req.userId!)).returning();
    res.json(user);
  } catch (err) {
    req.log.error(err, "update me error");
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

export default router;
