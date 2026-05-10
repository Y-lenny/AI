# 阶段 1 MVP 拆解迭代（与代码对应）

本仓库 [`server/`](/Users/lvyongwen/AI/project/freedom/server) 实现 **业务 API 雏形**，音视频推流/拉流需在完成 [vendor POC](../technical/vendor-poc-runbook.md) 后接入各厂商 SDK。

## 迭代 0：基础设施

- [x] Docker Compose：PostgreSQL + Redis（[`docker-compose.yml`](../../docker-compose.yml)）
- [x] Prisma 模型：用户、双资料、任务（含结构化需求字段）、里程碑、Message、媒体会话、报价、线下付款记录、交付物、审计、UGC 队列
- [x] 健康检查 `GET /health`

## 迭代 1：账号与资料

- [x] `POST /auth/register`、`POST /auth/login`（JWT）
- [x] `PUT /profiles/demand`、`PUT /profiles/supply`（含预约直播字段）、`GET /profiles/supply/preview/:userId`（登录用户查看他人服务方名片）、`POST /profiles/supply/portfolio`

## 迭代 2：任务与里程碑

- [x] `POST /tasks` 草稿（结构化字段：预算区间、周期、交付物类型、`workMode`、`needBriefVideoUrl`、`needBriefSummary`）→ `PATCH /tasks/:id`（仅 `draft`、仅需求方）→ `PATCH /tasks/:id/publish`
- [x] `PATCH /tasks/:id/match` 指定服务方
- [x] `POST /tasks/:id/milestones`、`PATCH /tasks/:taskId/milestones/:milestoneId`（验收权限：需求方 `accepted`）
- [x] `GET /tasks`、`GET /tasks/discover`（`public` 且已发布、未匹配；可选 `city`、`deliverableType`、`workMode`）、`GET /tasks/:id`（参与方全量；他人仅当 `public` 开放摘要视图）、含 `messages`（仅参与方）
- [x] `GET /tasks/:id/messages`、`POST /tasks/:id/messages`（任务参与方；正文或文件至少其一）

## 迭代 3：1v1 与直播元数据

- [x] `POST /sessions` 写入 `providerRoomId`（与 Agora **频道名 channelName** 一致）、可选 `audienceScope`（默认仅任务参与方）
- [x] `POST /sessions/:id/rtc-token`（`kind === rtc_1v1`、任务参与方）：签发声网 RTC Token（需环境变量，见 `server/.env.example`）
- [x] `PATCH /sessions/:id/bind-milestone` 进度直播绑定里程碑（服务方）
- [x] `PATCH /sessions/:id/end`

## 迭代 4：报价与线下付款记录

- [x] `POST /tasks/:taskId/quotes`（已匹配服务方）
- [x] `POST /payments/offline-record`、`PATCH /payments/:id/confirm`（demand/supply 分别确认）

## 迭代 5：交付与证据包

- [x] `POST /tasks/:taskId/deliveries`（storageKey + sha256）
- [x] `GET /evidence/tasks/:taskId` 聚合任务快照 + 审计链

## 后续（未在首版代码实现）

- 任务状态自动推进（全部里程碑 `accepted` → `completed`）的 worker
- 集成真实对象存储上传预签名 URL
- 直播推流/拉流与 Webhook 更新 `recordingAssetKey`（当前仅 RTC Token 骨架 + 会话元数据）
- 移动端 App
