import { Api } from "tls-sig-api-v2";

const SDKAPPID = Number(process.env.NEXT_PUBLIC_TENCENT_CHAT_SDK_APP_ID ?? "331419296728");
const SECRETKEY =
  process.env.TENCENT_CHAT_SECRET_KEY ??
  "b1f331419296728b5781b9f3468b1f4d813150377e4574516c1ef60e274fe150";
const EXPIRE = 86400 * 180;

export function generateUserSig(userId: string): string {
  if (!Number.isFinite(SDKAPPID) || SDKAPPID <= 0) {
    throw new Error("Missing Tencent Chat SDKAppID");
  }
  if (!SECRETKEY) {
    throw new Error("Missing Tencent Chat secret key");
  }

  const api = new Api(SDKAPPID, SECRETKEY);
  return api.genSig(userId, EXPIRE);
}
