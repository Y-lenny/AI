import { Router } from "express";
import { z } from "zod";
import { PaymentMode } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { authRequired, getUserId } from "../middleware/auth.js";

const router = Router();
router.use(authRequired);

const recordBody = z.object({
  taskId: z.string(),
  amountCents: z.number().int().positive(),
  currency: z.string().optional(),
  milestoneId: z.string().optional(),
  mode: z.nativeEnum(PaymentMode).optional(),
  proofAssetKey: z.string().optional(),
  note: z.string().optional(),
});

router.post("/offline-record", async (req, res) => {
  const userId = getUserId(req);
  const parsed = recordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const task = await prisma.task.findUnique({ where: { id: parsed.data.taskId } });
  if (!task || (task.demandUserId !== userId && task.supplyUserId !== userId)) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  const rec = await prisma.paymentRecord.create({
    data: {
      taskId: parsed.data.taskId,
      amountCents: parsed.data.amountCents,
      currency: parsed.data.currency ?? "CNY",
      milestoneId: parsed.data.milestoneId,
      mode: parsed.data.mode ?? PaymentMode.offline_record,
      proofAssetKey: parsed.data.proofAssetKey,
      note: parsed.data.note,
    },
  });
  res.status(201).json(rec);
});

const confirmBody = z.object({
  role: z.enum(["demand", "supply"]),
});

router.patch("/:id/confirm", async (req, res) => {
  const userId = getUserId(req);
  const parsed = confirmBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const rec = await prisma.paymentRecord.findUnique({ where: { id: req.params.id } });
  if (!rec) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  const task = await prisma.task.findUnique({ where: { id: rec.taskId } });
  if (!task) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  if (parsed.data.role === "demand" && task.demandUserId !== userId) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  if (parsed.data.role === "supply" && task.supplyUserId !== userId) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const updated = await prisma.paymentRecord.update({
    where: { id: rec.id },
    data: {
      confirmedByDemand: parsed.data.role === "demand" ? true : rec.confirmedByDemand,
      confirmedBySupply: parsed.data.role === "supply" ? true : rec.confirmedBySupply,
    },
  });
  res.json(updated);
});

export default router;
