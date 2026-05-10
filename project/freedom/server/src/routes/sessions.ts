import { Router } from "express";
import { z } from "zod";
import { SessionKind, RecordingConsent, LiveAudienceScope } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { tryBuildAgoraRtcToken } from "../lib/agora.js";
import { authRequired, getUserId } from "../middleware/auth.js";

const router = Router();
router.use(authRequired);

const createSessionBody = z.object({
  taskId: z.string(),
  kind: z.nativeEnum(SessionKind),
  providerRoomId: z.string().min(1),
  recordingConsent: z.nativeEnum(RecordingConsent).optional(),
  consentVersion: z.string().optional(),
  audienceScope: z.nativeEnum(LiveAudienceScope).optional(),
});

router.post("/", async (req, res) => {
  const userId = getUserId(req);
  const parsed = createSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const task = await prisma.task.findUnique({ where: { id: parsed.data.taskId } });
  if (!task || (task.demandUserId !== userId && task.supplyUserId !== userId)) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  const session = await prisma.mediaSession.create({
    data: {
      taskId: parsed.data.taskId,
      kind: parsed.data.kind,
      providerRoomId: parsed.data.providerRoomId,
      recordingConsent: parsed.data.recordingConsent ?? RecordingConsent.metadata_only,
      consentVersion: parsed.data.consentVersion,
      audienceScope: parsed.data.audienceScope ?? LiveAudienceScope.task_participants_only,
      startedAt: new Date(),
    },
  });
  res.status(201).json(session);
});

router.post("/:id/rtc-token", async (req, res) => {
  const userId = getUserId(req);
  const session = await prisma.mediaSession.findUnique({ where: { id: req.params.id } });
  if (!session) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  if (session.kind !== SessionKind.rtc_1v1) {
    res.status(400).json({ error: "session_not_rtc_1v1" });
    return;
  }
  const task = await prisma.task.findUnique({ where: { id: session.taskId } });
  if (!task || (task.demandUserId !== userId && task.supplyUserId !== userId)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const channelName = session.providerRoomId;
  const built = tryBuildAgoraRtcToken(channelName, userId);
  if ("error" in built && built.error === "not_configured") {
    res.status(503).json({
      error: "agora_not_configured",
      hint: "Set AGORA_APP_ID and AGORA_APP_CERTIFICATE in the server environment.",
    });
    return;
  }
  res.json({ provider: "agora", sessionId: session.id, ...built });
});

const bindLiveBody = z.object({
  milestoneId: z.string(),
});

router.patch("/:id/bind-milestone", async (req, res) => {
  const userId = getUserId(req);
  const parsed = bindLiveBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const session = await prisma.mediaSession.findUnique({ where: { id: req.params.id } });
  if (!session) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  const task = await prisma.task.findUnique({ where: { id: session.taskId } });
  if (!task || task.supplyUserId !== userId) {
    res.status(403).json({ error: "only_supply_binds_progress_live" });
    return;
  }
  if (session.kind !== SessionKind.live_progress) {
    res.status(400).json({ error: "session_not_live" });
    return;
  }
  const ms = await prisma.milestone.findFirst({
    where: { id: parsed.data.milestoneId, taskId: session.taskId },
  });
  if (!ms) {
    res.status(404).json({ error: "milestone_not_found" });
    return;
  }
  const updated = await prisma.milestone.update({
    where: { id: ms.id },
    data: { progressLiveSessionId: session.id },
  });
  res.json({ session, milestone: updated });
});

router.patch("/:id/end", async (req, res) => {
  const userId = getUserId(req);
  const session = await prisma.mediaSession.findUnique({ where: { id: req.params.id } });
  if (!session) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  const task = await prisma.task.findUnique({ where: { id: session.taskId } });
  if (!task || (task.demandUserId !== userId && task.supplyUserId !== userId)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const updated = await prisma.mediaSession.update({
    where: { id: session.id },
    data: { endedAt: new Date() },
  });
  res.json(updated);
});

export default router;
