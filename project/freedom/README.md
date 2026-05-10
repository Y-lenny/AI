# Freedom · 视频/直播双边平台（MVP 雏形）

本仓库落实规划中的 **策略文档、PRD、厂商 POC 手册、合规大纲、阶段 1 API 骨架与运营审核雏形**。

## 文档索引

| 内容 | 路径 |
|------|------|
| 首发类目与 MVP 交易 | [docs/strategy/vertical-niche-and-mvp-payments.md](docs/strategy/vertical-niche-and-mvp-payments.md) |
| PRD（状态机/授权/证据链） | [docs/prd/PRD-mvp.md](docs/prd/PRD-mvp.md) |
| RTC/直播 POC | [docs/technical/vendor-poc-runbook.md](docs/technical/vendor-poc-runbook.md) |
| 阶段 1 迭代清单 | [docs/mvp/phase1-iterations.md](docs/mvp/phase1-iterations.md) |
| 合规大纲 | [docs/compliance/README.md](docs/compliance/README.md) |

## 本地运行 API

1. 启动数据库：`docker compose up -d`
2. `cd server && cp .env.example .env` 并按需设置 `JWT_SECRET`、`ADMIN_API_KEY`
3. 安装与迁移：

```bash
cd server
npm install
# 数据库就绪后执行其一：
npx prisma migrate deploy
# 或开发环境：npx prisma migrate dev
npm run dev
```

仓库已包含迁移目录 [`server/prisma/migrations/`](server/prisma/migrations/)（含任务结构化字段与 `Message` 表），`migrate deploy` 会按序应用，适用于 CI/生产。

4. 健康检查：<http://localhost:3000/health>
5. 主要 API（均需 `Authorization: Bearer <token>`，除非另行说明）：任务公开列表 `GET /tasks/discover`；服务方预览 `GET /profiles/supply/preview/:userId`；1v1 声网 Token `POST /sessions/:id/rtc-token`（需配置 `AGORA_*`，见 `server/.env.example`）；运营审核页 <http://localhost:3000/operator/>（请求头 `x-admin-key` 与 `.env` 中 `ADMIN_API_KEY` 一致）

## 说明

- 音视频推流、Token 签发、云端录制回调需按 [vendor-poc-runbook.md](docs/technical/vendor-poc-runbook.md) 选型后接入；当前仅持久化 **会话元数据与业务绑定**。
- 合规文档为 **大纲**，上线前须由律师定稿。
