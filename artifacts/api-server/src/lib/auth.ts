import { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + process.env.SESSION_SECRET || "reimbursement_secret").digest("hex");
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export function createPasswordHash(password: string): string {
  return hashPassword(password);
}

export function generateToken(userId: number): string {
  const payload = `${userId}:${Date.now()}:${Math.random()}`;
  return crypto.createHash("sha256").update(payload + (process.env.SESSION_SECRET || "reimbursement_secret")).digest("hex");
}

const tokenStore = new Map<string, { userId: number; expiresAt: number }>();

export function storeToken(token: string, userId: number): void {
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  tokenStore.set(token, { userId, expiresAt });
}

export function validateToken(token: string): number | null {
  const entry = tokenStore.get(token);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    tokenStore.delete(token);
    return null;
  }
  return entry.userId;
}

export function removeToken(token: string): void {
  tokenStore.delete(token);
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: "No token provided" });
    return;
  }

  const userId = validateToken(token);
  if (!userId) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user || !user.isActive) {
    res.status(401).json({ error: "User not found or inactive" });
    return;
  }

  (req as any).user = user;
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;
    if (!user || !roles.includes(user.role)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }
    next();
  };
}
