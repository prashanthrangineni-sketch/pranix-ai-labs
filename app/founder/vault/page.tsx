"use client";
import { useState, useEffect, useRef } from "react";

interface Document {
  id: string;
  title: string;
  category: string;
  file_name: string;
  file_size_bytes: number;
  mime_type: string;
  storage_path: string;
  tags: string[] | null;
  version: number;
  ai_summary: string | null;
  created_at: string;
  is_archived: boolean;
}

const CATEGORIES = [
  "incorporation", "compliance", "DPIIT", "patents", "ONDC",
  "banking", "legal", "investor", "GST", "Play Store",
  "contracts", "screenshots", "deployment reports", "audit reports", "policies",
];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentVaultPage() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({ title: "", category: CATEGORIES[0], tags: "" });
  const [showUpload, setShowUpload] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchDocs(); }, []);

  async function fetchDocs() {
    try {
      const res = await fetch("/api/founder/vault");
      const data = await res.json();
      setDocs(data.documents ?? []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file || !uploadForm.title || !uploadForm.category) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", uploadForm.title);
      formData.append("category", uploadForm.category);
      formData.append("tags", uploadForm.tags);
      const res = await fetch("/api/founder/vault", { method: "POST", body: formData });
      if (res.ok) {
        setShowUpload(false);
        setUploadForm({ title: "", category: CATEGORIES[0], tags: "" });
        if (fileRef.current) fileRef.current.value = "";
        await fetchDocs();
      }
    } finally { setUploading(false); }
  }

  async function getSignedUrl(id: string) {
    const res = await fetch(`/api/founder/vault/${id}/download`);
    const data = await res.json();
    if (data.url) window.open(data.url, "_blank");
  }

  const filtered = docs.filter(d => {
    if (d.is_archived) return false;
    const matchesCat = catFilter === "all" || d.category === catFilter;
    const matchesSearch = !search ||
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.file_name.toLowerCase().includes(search.toLowerCase()) ||
      d.tags?.some(t => t.toLowerCase().includes(search.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const catCounts = CATEGORIES.reduce<Record<string, number>>((acc, c) => {
    acc[c] = docs.filter(d => !d.is_archived && d.category === c).length;
    return acc;
  }, {});

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Document Vault</h1>
          <p className="text-sm text-gray-500 mt-1">{docs.filter(d => !d.is_archived).length} documents · founder-only access</p>
        </div>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800"
        >
          + Upload
        </button>
      </div>

      {showUpload && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Upload Document</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
              <input value={uploadForm.title} onChange={e => setUploadForm(f => ({...f, title: e.target.value}))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Category *</label>
              <select value={uploadForm.category} onChange={e => setUploadForm(f => ({...f, category: e.target.value}))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tags (comma separated)</label>
              <input value={uploadForm.tags} onChange={e => setUploadForm(f => ({...f, tags: e.target.value}))}
                placeholder="e.g. 2026, provisional, hyderabad"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">File *</label>
              <input ref={fileRef} type="file" className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleUpload} disabled={uploading}
              className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50">
              {uploading ? "Uploading…" : "Upload"}
            </button>
            <button onClick={() => setShowUpload(false)} className="text-sm text-gray-500 px-3 py-2 hover:text-gray-700">Cancel</button>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search documents…"
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
          <option value="all">All categories ({docs.filter(d=>!d.is_archived).length})</option>
          {CATEGORIES.filter(c => catCounts[c] > 0).map(c => (
            <option key={c} value={c}>{c} ({catCounts[c]})</option>
          ))}
        </select>
      </div>

      {loading && <div className="text-sm text-gray-400 text-center py-8">Loading vault…</div>}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-12 border border-dashed border-gray-200 rounded-xl">
          <p className="text-gray-400 text-sm">{search || catFilter !== "all" ? "No matching documents" : "No documents yet. Upload your first document."}</p>
        </div>
      )}

      <div className="grid gap-2">
        {filtered.map(doc => (
          <div key={doc.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3 hover:border-gray-300 transition-colors">
            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 text-base">
              {doc.mime_type?.includes("pdf") ? "📄" : doc.mime_type?.includes("image") ? "🖼️" : "📎"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{doc.title}</p>
              <p className="text-xs text-gray-400 truncate">{doc.file_name} · {formatBytes(doc.file_size_bytes)} · v{doc.version}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full hidden sm:inline">{doc.category}</span>
              <span className="text-xs text-gray-400 hidden sm:inline">{new Date(doc.created_at).toLocaleDateString("en-IN")}</span>
              <button onClick={() => getSignedUrl(doc.id)}
                className="text-xs text-gray-600 hover:text-gray-900 font-medium px-2 py-1 rounded hover:bg-gray-50">
                Download
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
