import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.CONTROL_PLANE_SUPABASE_URL!,
  process.env.CONTROL_PLANE_SERVICE_ROLE_KEY!
);

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { data: doc, error: docErr } = await supabase
    .from("company_documents")
    .select("storage_path, storage_bucket, file_name")
    .eq("id", params.id)
    .single();

  if (docErr || !doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const { data, error } = await supabase.storage
    .from(doc.storage_bucket)
    .createSignedUrl(doc.storage_path, 300); // 5 min expiry

  if (error || !data) return NextResponse.json({ error: "Could not generate download link" }, { status: 500 });

  return NextResponse.json({ url: data.signedUrl, file_name: doc.file_name });
}
