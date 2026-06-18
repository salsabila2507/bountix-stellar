export const dynamic = "force-dynamic";

export async function GET() {
  // List all SUPABASE/PRIVY env vars (redact values)
  const envVars: Record<string, string> = {};
  for (const key of Object.keys(process.env)) {
    const upper = key.toUpperCase();
    if (
      key.startsWith("SUPABASE") ||
      key.startsWith("PRIVY") ||
      key.startsWith("NEXT_PUBLIC")
    ) {
      const val = process.env[key] ?? "";
      envVars[key] = val
        ? val.substring(0, 8) + "..." + val.substring(val.length - 4)
        : "(empty)";
    }
  }

  return Response.json({ envVars });
}
