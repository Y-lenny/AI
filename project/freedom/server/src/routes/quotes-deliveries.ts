import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authRequired, getUserId } from "../middleware/auth.js";

const router = Router();
router.use(authRequired);

const quoteBody = z.object({
  amountCents: z.number().int().positive(),
  currency: z.string().optional(),
  note: z.string().optional(),
});

router.post("/tasks/:taskId/quotes", async (req, res) => {
  const userId = getUserId(req);
  const parsed = quoteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const task = await prisma.task.findUnique({ where: { id: req.params.taskId } });
  if (!task || task.supplyUserId !== userId) {
    res.status(403).json({ error: "only_assigned_supply_quotes" });
    return;
  }
  const q = await prisma.quote.create({
    data: {
      taskId: task.id,
      amountCents: parsed.data.amountCents,
      currency: parsed.data.currency ?? "CNY",
      note: parsed.data.note,
    },
  });
  res.status(201).json(q);
});

const deliveryBody = z.object({
  milestoneId: z.string().optional(),
  storageKey: z.string().min(1),
  sha256: z.string().length(64),
});

router.post("/tasks/:taskId/deliveries", async (req, res) => {
  const userId = getUserId(req);
  const parsed = deliveryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const task = await prisma.task.findUnique({ where: { id: req.params.taskId } });
  if (!task || task.supplyUserId !== userId) {
    res.status(403).json({ error: "only_supply_delivers" });
    return;
  }
  const d = await prisma.deliveryAsset.create({
    data: {
      taskId: task.id,
      milestoneId: parsed.data.milestoneId,
      storageKey: parsed.data.storageKey,
      sha256: parsed.data.sha256,
      uploadedByUserId: userId,
    },
  });
  res.status(201).json(d);
});

export default router;
