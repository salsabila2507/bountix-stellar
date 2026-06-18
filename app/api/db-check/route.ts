export const dynamic = "force-dynamic";

export async function GET() {
  const results: Record<string, any> = {};

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  results.url = url ? url.substring(0, 30) + "..." : "MISSING";
  results.keyPrefix = key ? key.substring(0, 15) + "..." : "MISSING";
  results.anonKeyPrefix = anonKey ? anonKey.substring(0, 15) + "..." : "MISSING";

  // Try direct fetch to Supabase REST API
  try {
    const restRes = await fetch(`${url}/rest/v1/profiles?select=count&limit=0`, {
      headers: { apikey: key!, Authorization: `Bearer ${key!}` },
    });
    results.directFetch = { status: restRes.status, ok: restRes.ok };
    if (!restRes.ok) {
      results.directFetchBody = await restRes.text();
    }
  } catch (e: any) {
    results.directFetch = { error: e.message };
  }

  // Try with anon key
  try {
    const anonRes = await fetch(`${url}/rest/v1/profiles?select=id&limit=1`, {
      headers: { apikey: anonKey!, Authorization: `Bearer ${anonKey!}` },
    });
    results.anonFetch = { status: anonRes.status, ok: anonRes.ok };
    if (!anonRes.ok) {
      results.anonFetchBody = await anonRes.text();
    }
  } catch (e: any) {
    results.anonFetch = { error: e.message };
  }

  return Response.json(results);
}
