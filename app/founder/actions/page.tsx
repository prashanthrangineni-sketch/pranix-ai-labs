"use client";
import { useState, useEffect } from "react";

interface PendingAction {
  id: number;
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  category: string;
  is_blocking: boolean;
  related_system: string | null;
  remediation_hint: string | null;
  due_date: string | null;
  created_at: string;
  resolved: boolean;
}

const SEV_CONFIG = {
  critical: { bg: "bg-red-50", border: "border-red-200", badge: "bg-red-100 text-red-700", dot: "bg-red-500", label: "Critical" },
  high:     { bg: "bg-orange-50", border: "border-orange-200", badge: "bg-orange-100 text-orange-700", dot: "bg-orange-500", label: "High" },
  medium:   { bg: "bg-yellow-50", border: "border-yellow-200", badge: "bg-yellow-100 text-yellow-700", dot: "bg-yellow-400", label: "Medium" },
  low:      { bg: "bg-blue-50", border: "border-blue-200", badge: "bg-blue-100 text-blue-700", dot: "bg-blue-400", label: "Low" },
  info:     { bg: "bg-gray-50", border: "border-gray-200", badge: "bg-gray-100 text-gray-600", dot: "bg-gray-400", label: "Info" },
};

export default function FounderActionsPage() {
  const [actions, setActions] = useState<PendingAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "blocking" | "critical">("blocking");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [resolving, setResolving] = useState<number | null>(null);

  useEffect(() => {
    fetchActions();
  }, []);

  async function fetchActions() {
    try {
      const res = await fetch("/api/founder/actions");
      const data = await res.json();
      setActions(data.actions ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function resolveAction(id: number) {
    setResolving(id);
    try {
      await fetch("/api/founder/actions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, resolved: true }),
      });
      setActions(prev => prev.map(a => a.id === id ? { ...a, resolved: true } : a));
    } finally {
      setResolving(null);
    }
  }

  const filtered = actions.filter(a => {
    if (a.resolved) return false;
    if (filter === "blocking") return a.is_blocking;
    if (filter === "critical") return a.severity === "critical";
    return true;
  });

  const counts = {
    all: actions.filter(a => !a.resolved).length,
    blocking: actions.filter(a => !a.resolved && a.is_blocking).length,
    critical: actions.filter(a => !a.resolved && a.severity === "critical").length,
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Pending Actions</h1>
        <p className="text-sm text-gray-500 mt-1">Operational items requiring founder attention</p>
      </div>

      <div className="flex gap-2 mb-6">
        {(["blocking", "critical", "all"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f === "blocking" ? "🚫 Blocking" : f === "critical" ? "🔴 Critical" : "All"}
            <span className="ml-1.5 text-xs opacity-70">({counts[f]})</span>
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-sm text-gray-400 py-8 text-center">Loading actions…</div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-12 border border-dashed border-gray-200 rounded-xl">
          <p className="text-gray-400 text-sm">No {filter === "all" ? "" : filter + " "}actions outstanding</p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(action => {
          const sev = SEV_CONFIG[action.severity] ?? SEV_CONFIG.info;
          const isExpanded = expandedId === action.id;
          return (
            <div
              key={action.id}
              className={`rounded-xl border ${sev.border} ${sev.bg} overflow-hidden`}
            >
              <div className="px-4 py-3 flex items-start gap-3">
                <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${sev.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sev.badge}`}>
                      {sev.label}
                    </span>
                    {action.is_blocking && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-800 text-white">
                        Blocking
                      </span>
                    )}
                    <span className="text-xs text-gray-400 uppercase tracking-wide">{action.category}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 mt-1">{action.title}</p>
                  {action.related_system && (
                    <p className="text-xs text-gray-400 mt-0.5 font-mono">{action.related_system}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : action.id)}
                    className="text-xs text-gray-500 hover:text-gray-800 px-2 py-1 rounded hover:bg-white/50"
                  >
                    {isExpanded ? "Less" : "Details"}
                  </button>
                  <button
                    onClick={() => resolveAction(action.id)}
                    disabled={resolving === action.id}
                    className="text-xs bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-3 py-1 rounded-lg font-medium disabled:opacity-40"
                  >
                    {resolving === action.id ? "…" : "Resolve"}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-gray-200/60 bg-white/40">
                  <p className="text-sm text-gray-700 mb-3">{action.description}</p>
                  {action.remediation_hint && (
                    <div className="bg-white/80 border border-gray-200 rounded-lg p-3">
                      <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Remediation</p>
                      <p className="text-sm text-gray-800 font-mono whitespace-pre-wrap">{action.remediation_hint}</p>
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-2">Created {new Date(action.created_at).toLocaleDateString("en-IN")}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
