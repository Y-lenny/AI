import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authRequired, getUserId } from "../middleware/auth.js";

const router = Router();
router.use(authRequired);

router.get("/tasks/:taskId", async (req, res) => {
  const userId = getUserId(req);
  const task = await prisma.task.findUnique({
    where: { id: req.params.taskId },
    include: {
      milestones: true,
      sessions: true,
      quotes: true,
      payments: true,
      deliveries: true,
      messages: { orderBy: { createdAt: "asc" } },
      demandUser: { select: { id: true, email: true, displayName: true } },
      supplyUser: { select: { id: true, email: true, displayName: true } },
    },
  });
  if (!task) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  if (task.demandUserId !== userId && task.supplyUserId !== userId) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const audit = await prisma.auditLog.findMany({
    where: { entityType: "Task", entityId: task.id },
    orderBy: { createdAt: "asc" },
  });
  res.json({
    task: {
      id: task.id,
      title: task.title,
      status: task.status,
      demandUser: task.demandUser,
      supplyUser: task.supplyUser,
      milestones: task.milestones,
      sessions: task.sessions,
      quotes: task.quotes,
      payments: task.payments,
      deliveries: task.deliveries,
      messages: task.messages,
    },
    auditTrail: audit,
  });
});

export default router;
