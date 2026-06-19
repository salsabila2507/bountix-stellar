import { createHash } from "node:crypto";

export function getDefaultPrivyUsername(privyDid: string) {
  const suffix = createHash("sha256").update(privyDid).digest("hex").slice(0, 10);
  return `user_${suffix}`;
}
