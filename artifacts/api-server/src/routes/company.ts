import { Router } from "express";
import { db, companiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authenticate, requireRole } from "../lib/auth";
import { z } from "zod";

const router = Router();

router.get("/", authenticate, async (req, res) => {
  const user = (req as any).user;
  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, user.companyId)).limit(1);
  if (!company) {
    res.status(404).json({ error: "Company not found" });
    return;
  }
  res.json(company);
});

const updateCompanySchema = z.object({
  name: z.string().min(1).optional(),
  country: z.string().optional(),
  currency: z.string().optional(),
  currencySymbol: z.string().optional(),
});

router.put("/", authenticate, requireRole("admin"), async (req, res) => {
  const user = (req as any).user;
  const parsed = updateCompanySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", details: parsed.error.message });
    return;
  }

  const [updated] = await db.update(companiesTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(companiesTable.id, user.companyId))
    .returning();

  res.json(updated);
});

export default router;
