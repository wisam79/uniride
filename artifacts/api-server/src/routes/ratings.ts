import { Router } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@workspace/db";
import { tripsTable as trips, usersTable as users } from "@workspace/db/schema";
import { requireAuth } from "../middleware/auth";

const router = Router();

const ratingSchema = z.object({
  tripId: z.string().uuid(),
  rating: z.number().min(1).max(5),
  comment: z.string().max(500).optional(),
});

router.post("/ratings", requireAuth, async (req, res) => {
  const parsed = ratingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "بيانات التقييم غير صحيحة" });
    return;
  }
  const { tripId, rating, comment } = parsed.data;
  const userId = req.user!.userId;

  try {
    const [trip] = await db.select().from(trips).where(eq(trips.id, tripId)).limit(1);
    if (!trip) {
      res.status(404).json({ error: "الرحلة غير موجودة" });
      return;
    }
    if (trip.studentId !== userId) {
      res.status(403).json({ error: "غير مصرح" });
      return;
    }
    if (trip.status !== "completed") {
      res.status(400).json({ error: "يمكن تقييم الرحلات المكتملة فقط" });
      return;
    }

    await db.update(trips).set({
      notes: comment ?? trip.notes,
      driverRating: String(rating),
    }).where(eq(trips.id, tripId));

    if (trip.driverId) {
      const driverTrips = await db
        .select({ driverRating: trips.driverRating })
        .from(trips)
        .where(eq(trips.driverId, trip.driverId));

      const rated = driverTrips.filter((t) => t.driverRating != null);
      if (rated.length > 0) {
        const avg = rated.reduce((s, t) => s + Number(t.driverRating ?? 0), 0) / rated.length;
        await db.update(users).set({
          rating: String(avg.toFixed(2)),
        }).where(eq(users.id, trip.driverId));
      }
    }

    req.log.info({ tripId, rating }, "Trip rated");
    res.json({ success: true });
  } catch (err) {
    req.log.error(err, "Error rating trip");
    res.status(500).json({ error: "حدث خطأ" });
  }
});

router.get("/ratings/driver/:driverId", requireAuth, async (req, res) => {
  try {
    const { driverId } = req.params;
    const [driver] = await db.select({ rating: users.rating, totalTrips: users.totalTrips })
      .from(users).where(eq(users.id, driverId)).limit(1);

    if (!driver) {
      res.status(404).json({ error: "السائق غير موجود" });
      return;
    }

    const ratedTrips = await db
      .select({ driverRating: trips.driverRating })
      .from(trips)
      .where(eq(trips.driverId, driverId));

    const rated = ratedTrips.filter((t) => t.driverRating != null);

    res.json({
      averageRating: driver.rating,
      totalRatings: rated.length,
      totalTrips: driver.totalTrips,
    });
  } catch (err) {
    req.log.error(err, "Error fetching driver ratings");
    res.status(500).json({ error: "حدث خطأ" });
  }
});

export default router;
