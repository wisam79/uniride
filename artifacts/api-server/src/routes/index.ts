import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import driversRouter from "./drivers";
import tripsRouter from "./trips";
import subscriptionsRouter from "./subscriptions";
import ratingsRouter from "./ratings";
import cardsRouter from "./cards";
import adminRouter from "./admin";
import routesRouter from "./routes";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(driversRouter);
router.use(tripsRouter);
router.use(subscriptionsRouter);
router.use(ratingsRouter);
router.use(cardsRouter);
router.use(adminRouter);
router.use(routesRouter);

export default router;
