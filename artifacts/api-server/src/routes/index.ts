import { Router } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import companyRouter from "./company";
import usersRouter from "./users";
import expensesRouter from "./expenses";
import approvalRulesRouter from "./approvalRules";
import currencyRouter from "./currency";
import analyticsRouter from "./analytics";
import seedRouter from "./seed";

const router = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/company", companyRouter);
router.use("/users", usersRouter);
router.use("/expenses", expensesRouter);
router.use("/approval-rules", approvalRulesRouter);
router.use("/currency", currencyRouter);
router.use("/analytics", analyticsRouter);
router.use("/seed", seedRouter);

export default router;
