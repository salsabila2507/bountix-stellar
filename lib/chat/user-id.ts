function hashUserId(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function toTencentChatUserId(userId: string): string {
  const uuidWithoutHyphens = userId.match(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  );
  if (uuidWithoutHyphens) {
    return userId.replaceAll("-", "");
  }

  const normalized = userId.replace(/[^A-Za-z0-9_-]/g, "_");
  if (normalized.length > 0 && normalized.length <= 32) {
    return normalized;
  }

  const suffix = hashUserId(userId);
  const prefix = normalized.slice(0, Math.max(1, 31 - suffix.length));
  return (prefix + "_" + suffix).slice(0, 32);
}
