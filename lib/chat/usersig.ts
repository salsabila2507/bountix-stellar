import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { Api } from "tls-sig-api-v2";

const EXPIRE = 86400 * 180;
const DEFAULT_SDK_APP_ID = "20044770";

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

function readLooseEnvFileValue(keys: string[]): string | null {
  const candidates = [
    join(process.cwd(), ".env.local"),
    join(process.cwd(), ".env"),
    join(dirname(process.cwd()), ".env"),
    "/home/ubuntu/.env",
  ];

  for (const file of candidates) {
    if (!existsSync(file)) continue;
    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      for (const key of keys) {
        const pattern = new RegExp(
          "^(?:export\\s+)?" + key + "(?:\\s*=\\s*|\\s*:\\s*|\\s+)(.+)$",
          "i",
        );
        const match = trimmed.match(pattern);
        const value = match?.[1]?.trim().replace(/^['"]|['"]$/g, "");
        if (value) return value;
      }
    }
  }

  return null;
}

function readEnv(keys: string[]): string | null {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return readLooseEnvFileValue(keys);
}

export function getTencentChatSdkAppId(): number {
  const value = readEnv(SDK_APP_ID_KEYS) ?? DEFAULT_SDK_APP_ID;
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
