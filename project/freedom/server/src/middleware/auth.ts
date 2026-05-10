import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export type AuthPayload = { sub: string };

const secret = process.env.JWT_SECRET ?? "dev-insecure";

export function signToken(userId: string, expiresInSeconds = 60 * 60 * 24 * 7): string {
  return jwt.sign({ sub: userId }, secret, { expiresIn: expiresInSeconds });
}

export function authRequired(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) {
    res.status(401).json({ error: "missing_bearer_token" });
    return;
  }
  try {
    const payload = jwt.verify(token, secret) as AuthPayload;
    (req as Request & { userId?: string }).userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: "invalid_token" });
  }
}

export function getUserId(req: Request): string {
  const id = (req as Request & { userId?: string }).userId;
  if (!id) throw new Error("auth middleware not applied");
  return id;
}
