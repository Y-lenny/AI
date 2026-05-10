import { createHash } from "crypto";
import { RtcRole, RtcTokenBuilder } from "agora-access-token";

/** 将业务 userId 稳定映射为 Agora 所需的 uint32 uid（>0）。 */
export function agoraUidFromUserId(userId: string): number {
  const buf = createHash("sha256").update(userId).digest();
  const n = buf.readUInt32BE(0);
  return (n % 0x7fffffff) + 1;
}

export type AgoraRtcTokenResult = {
  appId: string;
  channelName: string;
  uid: number;
  token: string;
  expiresAt: number;
  role: "publisher";
};

export function tryBuildAgoraRtcToken(
  channelName: string,
  userId: string,
  ttlSeconds = 3600,
): AgoraRtcTokenResult | { error: "not_configured" } {
  const appId = process.env.AGORA_APP_ID?.trim();
  const certificate = process.env.AGORA_APP_CERTIFICATE?.trim();
  if (!appId || !certificate) {
    return { error: "not_configured" };
  }
  const uid = agoraUidFromUserId(userId);
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + ttlSeconds;
  const token = RtcTokenBuilder.buildTokenWithUid(
    appId,
    certificate,
    channelName,
    uid,
    RtcRole.PUBLISHER,
    expiresAt,
  );
  return {
    appId,
    channelName,
    uid,
    token,
    expiresAt,
    role: "publisher",
  };
}
