import { NextResponse } from "next/server";

const SQL = [
  `alter table public.tasks drop constraint if exists tasks_payment_method_ck`,
  `alter table public.tasks add constraint tasks_payment_method_ck check (payment_method in ('manual', 'escrow_stellar'))`,
  `alter table public.services drop constraint if exists services_payment_method_ck`,
  `alter table public.services add constraint services_payment_method_ck check (payment_method in ('manual', 'escrow_stellar'))`,
];

export async function GET() {
  const ref = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace("https://", "").replace(".supabase.co", "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const errors: string[] = [];

  // Try Supabase Management API
  for (const query of SQL) {
    try {
      const resp = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${key}`,
        },
        body: JSON.stringify({ query }),
      });
      if (!resp.ok) {
        errors.push(`${query.slice(0, 50)}... -> ${await resp.text()}`);
      }
    } catch (e: any) {
      errors.push(`${query.slice(0, 50)}... -> ${e.message}`);
    }
  }

  if (errors.length === 0) {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({
    ok: false,
    errors,
    sql: SQL.join(";\n") + ";",
  });
}
