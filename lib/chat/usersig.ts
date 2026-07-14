import { Api } from "tls-sig-api-v2";

const EXPIRE = 86400 * 180;

const SDK_APP_ID_KEYS = [
  "TENCENT_CHAT_SDK_APP_ID",
  "NEXT_PUBLIC_TENCENT_CHAT_SDK_APP_ID",
  "SDKAPPID",
  "SDKAppID",
  "NEXT_PUBLIC_SDKAPPID",
  "NEXT_PUBLIC_SDKAppID",
];

const SECRET_KEY_KEYS = [
  "TENCENT_CHAT_SECRET_KEY",
  "TENCENT_CHAT_SDK_SECRET_KEY",
  "SDKSECRETKEY",
  "SDKSecretKey",
  "SECRETKEY",
  "SecretKey",
];

function readEnv(keys: string[]): string | null {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return null;
}

export function getTencentChatSdkAppId(): number {
  const value = readEnv(SDK_APP_ID_KEYS);
  const sdkAppId = Number(value);
  if (!Number.isInteger(sdkAppId) || sdkAppId <= 0) {
    throw new Error("Missing Tencent Chat SDKAppID");
  }
  return sdkAppId;
}

function getTencentChatSecretKey(): string {
  const secretKey = readEnv(SECRET_KEY_KEYS);
  if (!secretKey) {
    throw new Error("Missing Tencent Chat SDKSecretKey");
  }
  return secretKey;
}

export function generateUserSig(userId: string): string {
  const api = new Api(getTencentChatSdkAppId(), getTencentChatSecretKey());
  return api.genSig(userId, EXPIRE);
}
