import { Router } from "express";
import { db } from "@workspace/db";
import { routesTable, usersTable, subscriptionsTable, absencesTable } from "@workspace/db/schema";
import { eq, and, ilike, or } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { z } from "zod";

const router = Router();

const createRouteSchema = z.object({
  fromArea: z.string().min(2),
  fromCity: z.string().default("بغداد"),
  toUniversity: z.string().min(2),
  departureMorning: z.string().regex(/^\d{2}:\d{2}$/),
  departureEvening: z.string().regex(/^\d{2}:\d{2}$/),
  totalSeats: z.number().int().min(1).max(10).default(4),
  monthlyFare: z.number().min(10000).max(1000000),
  genderPreference: z.enum(["any", "female", "male"]).default("any"),
  notes: z.string().optional(),
});

const updateRouteSchema = createRouteSchema.partial().extend({
  isActive: z.boolean().optional(),
  availableSeats: z.number().int().min(0).optional(),
});

router.get("/routes", async (req, res) => {
  const { university, gender, area, city } = req.query;
  try {
    const conditions = [eq(routesTable.isActive, true)];

    if (university && typeof university === "string") {
      conditions.push(ilike(routesTable.toUniversity, `%${university}%`));
    }
    if (gender && typeof gender === "string" && gender !== "any") {
      conditions.push(
        or(
          eq(routesTable.genderPreference, "any"),
          eq(routesTable.genderPreference, gender as "female" | "male")
        ) as any
      );
    }
    if (area && typeof area === "string") {
      conditions.push(ilike(routesTable.fromArea, `%${area}%`));
    }
    if (city && typeof city === "string") {
      conditions.push(ilike(routesTable.fromCity, `%${city}%`));
    }

    const routes = await db
      .select()
      .from(routesTable)
      .where(and(...conditions) as any);

    res.json(routes);
  } catch (err) {
    req.log.error(err, "list routes error");
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

router.get("/routes/my", requireAuth, async (req: AuthRequest, res) => {
  try {
    const routes = await db
      .select()
      .from(routesTable)
      .where(eq(routesTable.driverId, req.userId!));
    res.json(routes);
  } catch (err) {
    req.log.error(err, "my routes error");
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

router.get("/routes/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [route] = await db
      .select()
      .from(routesTable)
      .where(eq(routesTable.id, id))
      .limit(1);
    if (!route) {
      res.status(404).json({ error: "الخط غير موجود" });
      return;
    }
    res.json(route);
  } catch (err) {
    req.log.error(err, "get route error");
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

router.post("/routes", requireAuth, async (req: AuthRequest, res) => {
  const parsed = createRouteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "بيانات غير صالحة", details: parsed.error.flatten() });
    return;
  }
  try {
    const [driver] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.userId!))
      .limit(1);

    if (!driver || driver.role !== "driver") {
      res.status(403).json({ error: "فقط السائقون يمكنهم إنشاء خطوط" });
      return;
    }

    const [route] = await db
      .insert(routesTable)
      .values({
        driverId: driver.id,
        driverName: driver.name,
        driverPhone: driver.phone,
        vehicleType: driver.vehicleType ?? undefined,
        vehiclePlate: driver.vehiclePlate ?? undefined,
        vehicleColor: driver.vehicleColor ?? undefined,
        fromArea: parsed.data.fromArea,
        fromCity: parsed.data.fromCity,
        toUniversity: parsed.data.toUniversity,
        departureMorning: parsed.data.departureMorning,
        departureEvening: parsed.data.departureEvening,
        totalSeats: parsed.data.totalSeats,
        availableSeats: parsed.data.totalSeats,
        monthlyFare: String(parsed.data.monthlyFare),
        genderPreference: parsed.data.genderPreference,
        notes: parsed.data.notes,
      })
      .returning();

    res.status(201).json(route);
  } catch (err) {
    req.log.error(err, "create route error");
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

router.patch("/routes/:id", requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const parsed = updateRouteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "بيانات غير صالحة" });
    return;
  }
  try {
    const [existing] = await db
      .select()
      .from(routesTable)
      .where(and(eq(routesTable.id, id), eq(routesTable.driverId, req.userId!)))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "الخط غير موجود أو ليس لك صلاحية التعديل" });
      return;
    }

    const updates: Record<string, unknown> = {};
    if (parsed.data.fromArea !== undefined) updates.fromArea = parsed.data.fromArea;
    if (parsed.data.fromCity !== undefined) updates.fromCity = parsed.data.fromCity;
    if (parsed.data.toUniversity !== undefined) updates.toUniversity = parsed.data.toUniversity;
    if (parsed.data.departureMorning !== undefined) updates.departureMorning = parsed.data.departureMorning;
    if (parsed.data.departureEvening !== undefined) updates.departureEvening = parsed.data.departureEvening;
    if (parsed.data.totalSeats !== undefined) updates.totalSeats = parsed.data.totalSeats;
    if (parsed.data.availableSeats !== undefined) updates.availableSeats = parsed.data.availableSeats;
    if (parsed.data.monthlyFare !== undefined) updates.monthlyFare = String(parsed.data.monthlyFare);
    if (parsed.data.genderPreference !== undefined) updates.genderPreference = parsed.data.genderPreference;
    if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;
    if (parsed.data.isActive !== undefined) updates.isActive = parsed.data.isActive;

    const [route] = await db
      .update(routesTable)
      .set(updates as any)
      .where(eq(routesTable.id, id))
      .returning();

    res.json(route);
  } catch (err) {
    req.log.error(err, "update route error");
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

router.delete("/routes/:id", requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params;
  try {
    await db
      .update(routesTable)
      .set({ isActive: false })
      .where(and(eq(routesTable.id, id), eq(routesTable.driverId, req.userId!)));
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err, "delete route error");
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

router.post("/routes/:id/book", requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params;
  try {
    const [route] = await db
      .select()
      .from(routesTable)
      .where(and(eq(routesTable.id, id), eq(routesTable.isActive, true)))
      .limit(1);

    if (!route) {
      res.status(404).json({ error: "الخط غير موجود" });
      return;
    }
    if (route.availableSeats <= 0) {
      res.status(400).json({ error: "لا توجد مقاعد متاحة في هذا الخط" });
      return;
    }

    const existingSub = await db
      .select()
      .from(subscriptionsTable)
      .where(
        and(
          eq(subscriptionsTable.studentId, req.userId!),
          eq(subscriptionsTable.driverId, route.driverId),
          eq(subscriptionsTable.isActive, true)
        )
      )
      .limit(1);

    if (existingSub.length > 0) {
      res.status(400).json({ error: "أنت مشترك بالفعل مع هذا السائق" });
      return;
    }

    await db
      .update(subscriptionsTable)
      .set({ isActive: false })
      .where(and(eq(subscriptionsTable.studentId, req.userId!), eq(subscriptionsTable.isActive, true)));

    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    const [sub] = await db
      .insert(subscriptionsTable)
      .values({
        studentId: req.userId!,
        driverId: route.driverId,
        driverName: route.driverName,
        plan: "standard",
        endDate,
        monthlyFare: String(route.monthlyFare),
        tripsPerMonth: 40,
      })
      .returning();

    await db
      .update(routesTable)
      .set({ availableSeats: route.availableSeats - 1, totalStudents: route.totalStudents + 1 })
      .where(eq(routesTable.id, id));

    res.status(201).json({ subscription: sub, route });
  } catch (err) {
    req.log.error(err, "book route error");
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

router.post("/absences", requireAuth, async (req: AuthRequest, res) => {
  const schema = z.object({
    driverId: z.string().uuid(),
    date: z.string(),
    reason: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "بيانات غير صالحة" });
    return;
  }

  try {
    const [student] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.userId!))
      .limit(1);

    if (!student) {
      res.status(404).json({ error: "المستخدم غير موجود" });
      return;
    }

    const [absence] = await db
      .insert(absencesTable)
      .values({
        studentId: req.userId!,
        studentName: student.name,
        driverId: parsed.data.driverId,
        date: parsed.data.date,
        reason: parsed.data.reason,
      })
      .returning();

    res.status(201).json(absence);
  } catch (err) {
    req.log.error(err, "notify absence error");
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

router.get("/absences/driver", requireAuth, async (req: AuthRequest, res) => {
  try {
    const absences = await db
      .select()
      .from(absencesTable)
      .where(eq(absencesTable.driverId, req.userId!));
    res.json(absences);
  } catch (err) {
    req.log.error(err, "get driver absences error");
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

export default router;
