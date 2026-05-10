# 合规与运营文档

上线前须由 **执业律师与数据合规** 根据属地法律定稿；以下为产品级大纲与内部流程说明。

| 文档 | 说明 |
|------|------|
| [user-agreement-outline.md](./user-agreement-outline.md) | 用户服务协议结构（含线下付款免责声明要点） |
| [privacy-policy-outline.md](./privacy-policy-outline.md) | 隐私政策结构（含音视频与证据数据） |
| [ugc-moderation-flow.md](./ugc-moderation-flow.md) | UGC 审核策略、工单流与和 API/运营台的对应关系 |

**运营审核雏形**：启动 API 后访问 `http://localhost:3000/operator/`，在页面中填写与 `ADMIN_API_KEY` 一致的密钥（请求头 `x-admin-key`）。
