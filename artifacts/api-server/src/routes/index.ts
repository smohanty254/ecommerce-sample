import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import categoriesRouter from "./categories";
import productsRouter from "./products";
import cartRouter from "./cart";
import ordersRouter from "./orders";
import reviewsRouter from "./reviews";
import formsRouter from "./forms";
import analyticsRouter from "./analytics";
import notificationsRouter from "./notifications";
import reportsRouter from "./reports";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(categoriesRouter);
router.use(productsRouter);
router.use(cartRouter);
router.use(ordersRouter);
router.use(reviewsRouter);
router.use(formsRouter);
router.use(analyticsRouter);
router.use(notificationsRouter);
router.use(reportsRouter);

export default router;
