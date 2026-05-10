import { Router } from "express";
import { z } from "zod";
import { UgcStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

const router = Router();

function adminGuard(req: import("express").Request, res: import("express").Response, next: import("express").NextFunction): void {
  const key = process.env.ADMIN_API_KEY;
  if (!key) {
    res.status(503).json({ error: "admin_not_configured" });
    return;
  }
  const provided = req.headers["x-admin-key"];
  if (provided !== key) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  next();
}

router.use(adminGuard);

router.get("/ugc", async (_req, res) => {
  const items = await prisma.ugcModerationItem.findMany({
    where: { status: UgcStatus.pending },
    orderBy: { createdAt: "asc" },
  });
  res.json({ items });
});

const reviewBody = z.object({
  status: z.union([z.literal(UgcStatus.approved), z.literal(UgcStatus.rejected)]),
  note: z.string().optional(),
});

router.patch("/ugc/:id", async (req, res) => {
  const parsed = reviewBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const item = await prisma.ugcModerationItem.update({
    where: { id: req.params.id },
    data: { status: parsed.data.status, note: parsed.data.note },
  });
  res.json(item);
});

router.post("/ugc", async (req, res) => {
  const body = z
    .object({
      contentType: z.string(),
      contentRef: z.string(),
      reporterId: z.string().optional(),
      note: z.string().optional(),
    })
    .safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.flatten() });
    return;
  }
  const item = await prisma.ugcModerationItem.create({
    data: {
      contentType: body.data.contentType,
      contentRef: body.data.contentRef,
      reporterId: body.data.reporterId,
      note: body.data.note,
    },
  });
  res.status(201).json(item);
});

export default router;
