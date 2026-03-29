import { Router } from "express";
import { db, usersTable, companiesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { authenticate, requireRole, createPasswordHash } from "../lib/auth";
import { z } from "zod";

const router = Router();

async function formatUser(user: any) {
  let managerName: string | null = null;
  if (user.managerId) {
    const [manager] = await db.select().from(usersTable).where(eq(usersTable.id, user.managerId)).limit(1);
    if (manager) managerName = `${manager.firstName} ${manager.lastName}`;
  }
  const { passwordHash: _, ...safeUser } = user;
  return { ...safeUser, managerName };
}

router.get("/", authenticate, requireRole("admin"), async (req, res) => {
  const user = (req as any).user;
  const users = await db.select().from(usersTable).where(eq(usersTable.companyId, user.companyId));
  const formatted = await Promise.all(users.map(formatUser));
  res.json(formatted);
});

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(["manager", "employee"]),
  isManagerApprover: z.boolean().optional().default(false),
  managerId: z.number().int().nullable().optional(),
});

router.post("/", authenticate, requireRole("admin"), async (req, res) => {
  const currentUser = (req as any).user;
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", details: parsed.error.message });
    return;
  }

  const { email, password, firstName, lastName, role, isManagerApprover, managerId } = parsed.data;

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing) {
    res.status(409).json({ error: "Email already exists" });
    return;
  }

  const passwordHash = createPasswordHash(password);
  const [newUser] = await db.insert(usersTable).values({
    email,
    passwordHash,
    firstName,
    lastName,
    role,
    isManagerApprover: isManagerApprover || false,
    managerId: managerId || null,
    companyId: currentUser.companyId,
  }).returning();

  const formatted = await formatUser(newUser);
  res.status(201).json(formatted);
});

router.get("/:userId", authenticate, async (req, res) => {
  const currentUser = (req as any).user;
  const userId = parseInt(req.params.userId);
  if (isNaN(userId)) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }

  const [user] = await db.select().from(usersTable)
    .where(and(eq(usersTable.id, userId), eq(usersTable.companyId, currentUser.companyId)))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const formatted = await formatUser(user);
  res.json(formatted);
});

const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  role: z.enum(["admin", "manager", "employee"]).optional(),
  isManagerApprover: z.boolean().optional(),
  managerId: z.number().int().nullable().optional(),
  isActive: z.boolean().optional(),
});

router.put("/:userId", authenticate, requireRole("admin"), async (req, res) => {
  const currentUser = (req as any).user;
  const userId = parseInt(req.params.userId);
  if (isNaN(userId)) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }

  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", details: parsed.error.message });
    return;
  }

  const [existing] = await db.select().from(usersTable)
    .where(and(eq(usersTable.id, userId), eq(usersTable.companyId, currentUser.companyId)))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const updateData: any = { ...parsed.data, updatedAt: new Date() };
  if (parsed.data.managerId !== undefined) {
    updateData.managerId = parsed.data.managerId;
  }

  const [updated] = await db.update(usersTable)
    .set(updateData)
    .where(eq(usersTable.id, userId))
    .returning();

  const formatted = await formatUser(updated);
  res.json(formatted);
});

export default router;
