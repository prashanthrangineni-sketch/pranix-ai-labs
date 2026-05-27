import { NextResponse } from "next/server";
import { getControlPlane } from "../../lib/control-plane";

const BUCKET = "company-documents";

export async function GET() {
  try {
    const supabase = getControlPlane();
    const { data, error } = await supabase
      .from("company_documents")
      .select("id,title,category,file_name,file_size_bytes,mime_type,storage_path,tags,version,ai_summary,created_at,is_archived")
      .eq("is_archived", false)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ documents: data ?? [] });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = getControlPlane();
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string | null;
    const category = formData.get("category") as string | null;
    const tagsRaw = formData.get("tags") as string | null;

    if (!file || !title || !category) {
      return NextResponse.json({ error: "file, title, and category required" }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const ext = file.name.split(".").pop() ?? "bin";
    const storagePath = `${category}/${id}.${ext}`;

    const buffer = await file.arrayBuffer();
    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 });

    const tags = tagsRaw ? tagsRaw.split(",").map((t: string) => t.trim()).filter(Boolean) : null;

    const { error: dbErr } = await supabase.from("company_documents").insert({
      id,
      title,
      category,
      file_name: file.name,
      file_size_bytes: file.size,
      mime_type: file.type || "application/octet-stream",
      storage_path: storagePath,
      storage_bucket: BUCKET,
      tags,
      version: 1,
      visibility: "founder_only",
      uploaded_by: "founder",
      is_archived: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
