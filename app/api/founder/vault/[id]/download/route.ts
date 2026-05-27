import { NextResponse } from "next/server";
import { getControlPlane } from "../../../../../lib/control-plane";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getControlPlane();
    const { id } = await params;

    const { data: doc, error: docErr } = await supabase
      .from("company_documents")
      .select("storage_path, storage_bucket, file_name")
      .eq("id", id)
      .single();

    if (docErr || !doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    const { data, error } = await supabase.storage
      .from(doc.storage_bucket as string)
      .createSignedUrl(doc.storage_path as string, 300);

    if (error || !data) return NextResponse.json({ error: "Could not generate download link" }, { status: 500 });

    return NextResponse.json({ url: data.signedUrl, file_name: doc.file_name });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
