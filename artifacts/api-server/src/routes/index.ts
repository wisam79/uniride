import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import driversRouter from "./drivers";
import tripsRouter from "./trips";
import subscriptionsRouter from "./subscriptions";
import ratingsRouter from "./ratings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(driversRouter);
router.use(tripsRouter);
router.use(subscriptionsRouter);
router.use(ratingsRouter);

export default router;
