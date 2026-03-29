import { Router } from "express";
import { db, usersTable, companiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createPasswordHash, verifyPassword, generateToken, storeToken, removeToken, authenticate } from "../lib/auth";
import { z } from "zod";

const router = Router();

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  companyName: z.string().min(1),
  country: z.string().min(1),
  currency: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/signup", async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", details: parsed.error.message });
    return;
  }

  const { email, password, firstName, lastName, companyName, country, currency } = parsed.data;

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing) {
    res.status(409).json({ error: "Email already exists" });
    return;
  }

  // Map currency to symbol
  const currencySymbols: Record<string, string> = {
    USD: "$", EUR: "€", GBP: "£", INR: "₹", JPY: "¥", CAD: "C$",
    AUD: "A$", CHF: "Fr", CNY: "¥", KRW: "₩", MXN: "$", BRL: "R$",
    SGD: "S$", HKD: "HK$", NOK: "kr", SEK: "kr", DKK: "kr", NZD: "NZ$",
    ZAR: "R", RUB: "₽", TRY: "₺", AED: "د.إ", SAR: "﷼", THB: "฿",
    IDR: "Rp", MYR: "RM", PHP: "₱", VND: "₫", PKR: "₨", NGN: "₦",
  };

  const [company] = await db.insert(companiesTable).values({
    name: companyName,
    country,
    currency,
    currencySymbol: currencySymbols[currency] || currency,
  }).returning();

  const passwordHash = createPasswordHash(password);
  const [user] = await db.insert(usersTable).values({
    email,
    passwordHash,
    firstName,
    lastName,
    role: "admin",
    isManagerApprover: false,
    companyId: company.id,
  }).returning();

  const token = generateToken(user.id);
  storeToken(token, user.id);

  const { passwordHash: _, ...safeUser } = user;
  res.status(201).json({
    user: { ...safeUser, company },
    token,
  });
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", details: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user || !user.isActive) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  if (!verifyPassword(password, user.passwordHash)) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, user.companyId)).limit(1);

  const token = generateToken(user.id);
  storeToken(token, user.id);

  const { passwordHash: _, ...safeUser } = user;
  res.json({
    user: { ...safeUser, company },
    token,
  });
});

router.post("/logout", authenticate, (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (token) removeToken(token);
  res.json({ message: "Logged out successfully" });
});

router.get("/me", authenticate, async (req, res) => {
  const user = (req as any).user;
  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, user.companyId)).limit(1);
  const { passwordHash: _, ...safeUser } = user;
  res.json({ ...safeUser, company });
});

export default router;
