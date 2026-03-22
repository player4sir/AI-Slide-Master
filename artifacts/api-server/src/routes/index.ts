import { Router, type IRouter } from "express";
import healthRouter from "./health";
import pptRouter from "./ppt";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/ppt", pptRouter);

export default router;
