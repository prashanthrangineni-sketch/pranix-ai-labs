import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.CONTROL_PLANE_SUPABASE_URL!,
  process.env.CONTROL_PLANE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data, error } = await supabase
    .from("founder_pending_actions")
    .select("id,title,description,severity,category,is_blocking,related_system,remediation_hint,due_date,created_at,resolved")
    .order("severity", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ actions: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  const { id, resolved, resolution_note } = await req.json();
  const { error } = await supabase
    .from("founder_pending_actions")
    .update({ resolved, resolved_at: resolved ? new Date().toISOString() : null, resolution_note: resolution_note ?? null })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
