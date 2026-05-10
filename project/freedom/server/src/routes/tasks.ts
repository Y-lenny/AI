import { Router } from "express";
import { z } from "zod";
import {
  TaskStatus,
  MilestoneStatus,
  WorkMode,
  TaskListingVisibility,
} from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { authRequired, getUserId } from "../middleware/auth.js";

const router = Router();
router.use(authRequired);

const createTaskBody = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  budgetMinCents: z.number().int().nonnegative().optional(),
  budgetMaxCents: z.number().int().nonnegative().optional(),
  periodDays: z.number().int().positive().optional(),
  deliverableType: z.string().optional(),
  workMode: z.nativeEnum(WorkMode).optional(),
  needBriefVideoUrl: z.string().url().optional(),
  needBriefSummary: z.string().max(16000).optional(),
  listingVisibility: z.nativeEnum(TaskListingVisibility).optional(),
});

router.post("/", async (req, res) => {
  const userId = getUserId(req);
  const parsed = createTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { budgetMinCents, budgetMaxCents } = parsed.data;
  if (
    budgetMinCents != null &&
    budgetMaxCents != null &&
    budgetMinCents > budgetMaxCents
  ) {
    res.status(400).json({ error: "invalid_budget_range" });
    return;
  }
  const task = await prisma.task.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      budgetMinCents: parsed.data.budgetMinCents,
      budgetMaxCents: parsed.data.budgetMaxCents,
      periodDays: parsed.data.periodDays,
      deliverableType: parsed.data.deliverableType,
      workMode: parsed.data.workMode,
      needBriefVideoUrl: parsed.data.needBriefVideoUrl,
      needBriefSummary: parsed.data.needBriefSummary,
      listingVisibility: parsed.data.listingVisibility ?? TaskListingVisibility.unlisted,
      demandUserId: userId,
      status: TaskStatus.draft,
    },
  });
  await prisma.auditLog.create({
    data: {
      userId,
      action: "task.create",
      entityType: "Task",
      entityId: task.id,
      after: task as unknown as object,
    },
  });
  res.status(201).json(task);
});

router.get("/discover", async (req, res) => {
  getUserId(req);
  const city = typeof req.query.city === "string" ? req.query.city : undefined;
  const deliverableType =
    typeof req.query.deliverableType === "string" ? req.query.deliverableType : undefined;
  const workModeRaw = typeof req.query.workMode === "string" ? req.query.workMode : undefined;
  const workMode =
    workModeRaw && (Object.values(WorkMode) as string[]).includes(workModeRaw)
      ? (workModeRaw as WorkMode)
      : undefined;

  const tasks = await prisma.task.findMany({
    where: {
      status: TaskStatus.published,
      supplyUserId: null,
      listingVisibility: TaskListingVisibility.public,
      ...(deliverableType ? { deliverableType } : {}),
      ...(workMode ? { workMode } : {}),
      ...(city
        ? { demandUser: { demandProfile: { is: { city } } } }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: {
      id: true,
      title: true,
      description: true,
      budgetMinCents: true,
      budgetMaxCents: true,
      periodDays: true,
      deliverableType: true,
      workMode: true,
      needBriefVideoUrl: true,
      needBriefSummary: true,
      listingVisibility: true,
      status: true,
      updatedAt: true,
      demandUser: {
        select: {
          displayName: true,
          demandProfile: { select: { city: true } },
        },
      },
    },
  });
  res.json(tasks);
});

router.patch("/:id/publish", async (req, res) => {
  const userId = getUserId(req);
  const task = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!task || task.demandUserId !== userId) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  if (task.status !== TaskStatus.draft) {
    res.status(400).json({ error: "invalid_transition" });
    return;
  }
  const updated = await prisma.task.update({
    where: { id: task.id },
    data: { status: TaskStatus.published },
  });
  await prisma.auditLog.create({
    data: {
      userId,
      action: "task.publish",
      entityType: "Task",
      entityId: task.id,
      before: { status: task.status },
      after: { status: updated.status },
    },
  });
  res.json(updated);
});

const matchBody = z.object({
  supplyUserId: z.string(),
});

router.patch("/:id/match", async (req, res) => {
  const userId = getUserId(req);
  const parsed = matchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const task = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!task || task.demandUserId !== userId) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  if (task.status !== TaskStatus.published) {
    res.status(400).json({ error: "invalid_transition" });
    return;
  }
  const updated = await prisma.task.update({
    where: { id: task.id },
    data: { supplyUserId: parsed.data.supplyUserId, status: TaskStatus.matched },
  });
  await prisma.auditLog.create({
    data: {
      userId,
      action: "task.match",
      entityType: "Task",
      entityId: task.id,
      before: { status: task.status },
      after: { status: updated.status, supplyUserId: parsed.data.supplyUserId },
    },
  });
  res.json(updated);
});

const milestoneBody = z.object({
  name: z.string(),
  criteria: z.string(),
  dueAt: z.string().datetime().optional(),
  sortOrder: z.number().int().optional(),
});

router.post("/:id/milestones", async (req, res) => {
  const userId = getUserId(req);
  const parsed = milestoneBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const task = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!task || (task.demandUserId !== userId && task.supplyUserId !== userId)) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  const ms = await prisma.milestone.create({
    data: {
      taskId: task.id,
      name: parsed.data.name,
      criteria: parsed.data.criteria,
      dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : undefined,
      sortOrder: parsed.data.sortOrder ?? 0,
    },
  });
  res.status(201).json(ms);
});

const milestonePatchBody = z.object({
  status: z.nativeEnum(MilestoneStatus).optional(),
});

router.patch("/:taskId/milestones/:milestoneId", async (req, res) => {
  const userId = getUserId(req);
  const parsed = milestonePatchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const task = await prisma.task.findUnique({ where: { id: req.params.taskId } });
  const ms = await prisma.milestone.findFirst({
    where: { id: req.params.milestoneId, taskId: req.params.taskId },
  });
  if (!task || !ms) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  const isDemand = task.demandUserId === userId;
  const isSupply = task.supplyUserId === userId;
  if (!isDemand && !isSupply) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  if (parsed.data.status) {
    if (parsed.data.status === MilestoneStatus.accepted && !isDemand) {
      res.status(403).json({ error: "only_demand_accepts" });
      return;
    }
    const supplyOnly =
      parsed.data.status === MilestoneStatus.in_progress ||
      parsed.data.status === MilestoneStatus.submitted;
    if (supplyOnly && !isSupply) {
      res.status(403).json({ error: "only_supply_updates_delivery" });
      return;
    }
  }
  const updated = await prisma.milestone.update({
    where: { id: ms.id },
    data: parsed.data,
  });
  res.json(updated);
});

const updateDraftBody = createTaskBody.partial();

router.patch("/:id", async (req, res) => {
  const userId = getUserId(req);
  const parsed = updateDraftBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const task = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!task || task.demandUserId !== userId) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  if (task.status !== TaskStatus.draft) {
    res.status(400).json({ error: "only_draft_editable" });
    return;
  }
  const d = parsed.data;
  const min = d.budgetMinCents ?? task.budgetMinCents;
  const max = d.budgetMaxCents ?? task.budgetMaxCents;
  if (min != null && max != null && min > max) {
    res.status(400).json({ error: "invalid_budget_range" });
    return;
  }
  const updated = await prisma.task.update({
    where: { id: task.id },
    data: {
      ...(d.title !== undefined && { title: d.title }),
      ...(d.description !== undefined && { description: d.description }),
      ...(d.budgetMinCents !== undefined && { budgetMinCents: d.budgetMinCents }),
      ...(d.budgetMaxCents !== undefined && { budgetMaxCents: d.budgetMaxCents }),
      ...(d.periodDays !== undefined && { periodDays: d.periodDays }),
      ...(d.deliverableType !== undefined && { deliverableType: d.deliverableType }),
      ...(d.workMode !== undefined && { workMode: d.workMode }),
      ...(d.needBriefVideoUrl !== undefined && { needBriefVideoUrl: d.needBriefVideoUrl }),
      ...(d.needBriefSummary !== undefined && { needBriefSummary: d.needBriefSummary }),
      ...(d.listingVisibility !== undefined && { listingVisibility: d.listingVisibility }),
    },
  });
  await prisma.auditLog.create({
    data: {
      userId,
      action: "task.update_draft",
      entityType: "Task",
      entityId: task.id,
      after: updated as unknown as object,
    },
  });
  res.json(updated);
});

const messagePostBody = z
  .object({
    body: z.string().optional(),
    fileUrl: z.string().url().optional(),
    fileStorageKey: z.string().optional(),
    milestoneId: z.string().optional(),
  })
  .refine((d) => !!(d.body?.trim() || d.fileUrl || d.fileStorageKey), {
    message: "need_body_or_file",
  });

router.get("/:id/messages", async (req, res) => {
  const userId = getUserId(req);
  const task = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!task || (task.demandUserId !== userId && task.supplyUserId !== userId)) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  const list = await prisma.message.findMany({
    where: { taskId: task.id },
    orderBy: { createdAt: "asc" },
    include: { author: { select: { id: true, displayName: true, email: true } } },
  });
  res.json(list);
});

router.post("/:id/messages", async (req, res) => {
  const userId = getUserId(req);
  const parsed = messagePostBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const task = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!task || (task.demandUserId !== userId && task.supplyUserId !== userId)) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  if (parsed.data.milestoneId) {
    const ms = await prisma.milestone.findFirst({
      where: { id: parsed.data.milestoneId, taskId: task.id },
    });
    if (!ms) {
      res.status(400).json({ error: "invalid_milestone" });
      return;
    }
  }
  const msg = await prisma.message.create({
    data: {
      taskId: task.id,
      authorUserId: userId,
      body: parsed.data.body,
      fileUrl: parsed.data.fileUrl,
      fileStorageKey: parsed.data.fileStorageKey,
      milestoneId: parsed.data.milestoneId,
    },
    include: { author: { select: { id: true, displayName: true, email: true } } },
  });
  res.status(201).json(msg);
});

router.get("/:id", async (req, res) => {
  const userId = getUserId(req);
  const task = await prisma.task.findUnique({
    where: { id: req.params.id },
    include: {
      milestones: true,
      sessions: true,
      quotes: true,
      payments: true,
      deliveries: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!task) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  const isParticipant = task.demandUserId === userId || task.supplyUserId === userId;
  const isPublicOpen =
    task.status === TaskStatus.published &&
    task.supplyUserId == null &&
    task.listingVisibility === TaskListingVisibility.public;

  if (!isParticipant && isPublicOpen) {
    const pub = await prisma.task.findUnique({
      where: { id: task.id },
      select: {
        id: true,
        title: true,
        description: true,
        budgetMinCents: true,
        budgetMaxCents: true,
        periodDays: true,
        deliverableType: true,
        workMode: true,
        needBriefVideoUrl: true,
        needBriefSummary: true,
        listingVisibility: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        milestones: true,
        demandUser: {
          select: {
            displayName: true,
            demandProfile: { select: { city: true } },
          },
        },
      },
    });
    res.json({ ...pub, _view: "public" as const });
    return;
  }
  if (!isParticipant) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  res.json(task);
});

router.get("/", async (req, res) => {
  const userId = getUserId(req);
  const tasks = await prisma.task.findMany({
    where: { OR: [{ demandUserId: userId }, { supplyUserId: userId }] },
    orderBy: { updatedAt: "desc" },
  });
  res.json(tasks);
});

export default router;
