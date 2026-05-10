import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authRequired, getUserId } from "../middleware/auth.js";

const router = Router();
router.use(authRequired);

const demandBody = z.object({
  city: z.string().optional(),
  phone: z.string().optional(),
});

router.put("/demand", async (req, res) => {
  const userId = getUserId(req);
  const parsed = demandBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const profile = await prisma.demandProfile.upsert({
    where: { userId },
    create: { userId, ...parsed.data },
    update: parsed.data,
  });
  res.json(profile);
});

const supplyBody = z.object({
  headline: z.string().min(1),
  bio: z.string().optional(),
  skillTags: z.array(z.string()).optional(),
  scheduledLiveAt: z.union([z.string().datetime(), z.null()]).optional(),
  scheduledLiveTitle: z.union([z.string().max(200), z.null()]).optional(),
});

router.get("/supply/preview/:userId", async (req, res) => {
  const targetId = req.params.userId;
  const user = await prisma.user.findUnique({
    where: { id: targetId },
    include: {
      supplyProfile: { include: { portfolioItems: { orderBy: { createdAt: "desc" } } } },
    },
  });
  if (!user?.supplyProfile) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json({
    userId: user.id,
    displayName: user.displayName,
    supplyProfile: user.supplyProfile,
  });
});

router.put("/supply", async (req, res) => {
  const userId = getUserId(req);
  const parsed = supplyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const scheduleAt =
    parsed.data.scheduledLiveAt === undefined
      ? undefined
      : parsed.data.scheduledLiveAt === null
        ? null
        : new Date(parsed.data.scheduledLiveAt);
  const profile = await prisma.supplyProfile.upsert({
    where: { userId },
    create: {
      userId,
      headline: parsed.data.headline,
      bio: parsed.data.bio,
      skillTags: parsed.data.skillTags ?? [],
      scheduledLiveAt: scheduleAt ?? null,
      scheduledLiveTitle: parsed.data.scheduledLiveTitle ?? null,
    },
    update: {
      headline: parsed.data.headline,
      bio: parsed.data.bio,
      skillTags: parsed.data.skillTags,
      ...(parsed.data.scheduledLiveAt !== undefined && { scheduledLiveAt: scheduleAt }),
      ...(parsed.data.scheduledLiveTitle !== undefined && {
        scheduledLiveTitle: parsed.data.scheduledLiveTitle,
      }),
    },
  });
  res.json(profile);
});

const portfolioBody = z.object({
  title: z.string(),
  mediaUrl: z.string().url(),
});

router.post("/supply/portfolio", async (req, res) => {
  const userId = getUserId(req);
  const parsed = portfolioBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const supply = await prisma.supplyProfile.findUnique({ where: { userId } });
  if (!supply) {
    res.status(400).json({ error: "create_supply_profile_first" });
    return;
  }
  const item = await prisma.portfolioItem.create({
    data: {
      supplyProfileId: supply.id,
      title: parsed.data.title,
      mediaUrl: parsed.data.mediaUrl,
    },
  });
  res.status(201).json(item);
});

export default router;
