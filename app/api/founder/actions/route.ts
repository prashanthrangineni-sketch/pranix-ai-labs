import { NextRequest, NextResponse } from "next/server";
import { getControlPlane } from "../../../lib/control-plane";
import { requireWritableFounder } from "@/lib/auth";

export async function GET() {
  try {
    const supabase = getControlPlane();
    const { data, error } = await supabase
      .from("founder_pending_actions")
      .select("id,title,description,severity,category,is_blocking,related_system,remediation_hint,due_date,created_at,resolved")
      .order("severity", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ actions: data ?? [] });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const __gate = await requireWritableFounder()
  if (__gate instanceof NextResponse) return __gate
  try {
    const supabase = getControlPlane();
    const { id, resolved, resolution_note } = await req.json() as { id: number; resolved: boolean; resolution_note?: string };
    const { error } = await supabase
      .from("founder_pending_actions")
      .update({ resolved, resolved_at: resolved ? new Date().toISOString() : null, resolution_note: resolution_note ?? null })
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
