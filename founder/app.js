/* /founder/app.js — shared bootstrap for all founder pages.
   Loads Supabase from CDN, gates every page on a valid session + dashboard_founder
   email, exposes pranix.* helpers used by per-page scripts. */

(function (global) {
  // ============= CONFIG (replace before deploy) =============
  // Public anon key — safe to ship to browser; RLS gates every read/write.
  const SUPABASE_URL  = "https://mvdjyjccvioxircxuzgz.supabase.co";
  const SUPABASE_ANON = "__YOUR_SUPABASE_ANON_KEY__";  // <- paste anon key in this file before deploy

  // Vercel deployment of the engine (Phase D + audit pipeline)
  const ENGINE_URL    = "https://pranix-agent-engine.vercel.app";

  // ============= DOM HELPERS =============
  const h = (tag, attrs, kids) => {
    const el = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === "class") el.className = attrs[k];
      else if (k === "html") el.innerHTML = attrs[k];
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), attrs[k]);
      else el.setAttribute(k, attrs[k]);
    }
    if (kids) (Array.isArray(kids) ? kids : [kids]).forEach(c => {
      if (c == null) return;
      el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return el;
  };
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // ============= FORMATTERS =============
  function fmtAge(iso) {
    if (!iso) return "—";
    const ms = Date.now() - new Date(iso).getTime();
    if (ms < 0) return "in future";
    if (ms < 60_000)     return Math.floor(ms / 1000) + "s ago";
    if (ms < 3_600_000)  return Math.floor(ms / 60_000) + "m ago";
    if (ms < 86_400_000) return Math.floor(ms / 3_600_000) + "h ago";
    return Math.floor(ms / 86_400_000) + "d ago";
  }
  function fmtAbs(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("en-IN", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }
  function shorten(s, max) {
    if (!s) return "";
    return s.length > max ? s.slice(0, max - 1) + "…" : s;
  }
  function sevClass(s) {
    return ({ critical: "sev-critical", error: "sev-error", warn: "sev-warn", info: "sev-info" })[s] || "sev-info";
  }
  function escapeHtml(s) {
    if (s == null) return "";
    return String(s).replace(/[&<>"']/g, c => (
      { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]
    ));
  }

  // ============= TOPBAR / NAV =============
  const NAV = [
    { href: "/founder",            label: "Overview" },
    { href: "/founder/products",   label: "Products" },
    { href: "/founder/findings",   label: "Findings" },
    { href: "/founder/commands",   label: "Commands" },
    { href: "/founder/tasks",      label: "Tasks" },
    { href: "/founder/dlq",        label: "DLQ" },
  ];

  function renderTopbar(currentPath, userEmail, onSignOut) {
    const inner = h("div", { class: "topbar-inner" }, [
      h("a", { href: "/founder", class: "brand" }, [
        h("span", { class: "brand-dot" }),
        h("span", null, "Pranix"),
        h("span", { class: "brand-tag" }, "Founder"),
      ]),
      h("nav", { class: "nav" },
        NAV.map(n => h("a", {
          href: n.href,
          class: currentPath === n.href || (n.href !== "/founder" && currentPath.startsWith(n.href)) ? "active" : "",
        }, n.label))
      ),
      h("div", { class: "userbar" }, [
        h("span", { class: "user-email" }, userEmail || ""),
        h("button", { class: "btn-link", onclick: onSignOut }, "Sign out"),
      ]),
    ]);
    const bar = h("div", { class: "topbar" }, inner);
    document.body.insertBefore(bar, document.body.firstChild);
  }

  // ============= AUTH GATE =============
  // Returns the Supabase client + session if founder, or renders the gate page and never resolves.
  async function bootstrap(opts = {}) {
    if (!global.supabase || !global.supabase.createClient) {
      throw new Error("Supabase JS not loaded — include the CDN script before app.js");
    }
    if (SUPABASE_ANON === "__YOUR_SUPABASE_ANON_KEY__") {
      // Render a friendly setup-needed screen instead of cryptic JS errors.
      renderSetupNeeded();
      return new Promise(() => {});
    }
    const sb = global.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: { persistSession: true, detectSessionInUrl: true, flowType: "pkce" },
    });

    // If we're on the sign-in page, do not gate — let it run its own flow.
    if (opts.isSignInPage) return { sb };

    const { data: { user } } = await sb.auth.getUser();
    if (!user) { window.location.replace("/founder"); return new Promise(() => {}); }

    // Verify founder via SECURITY DEFINER RPC (re-checks JWT email server-side).
    const { data: ok, error } = await sb.rpc("is_dashboard_founder");
    if (error || ok !== true) {
      await sb.auth.signOut();
      // Render a denial card instead of bouncing — clearer UX.
      renderDenied(user.email);
      return new Promise(() => {});
    }

    renderTopbar(window.location.pathname, user.email, async () => {
      await sb.auth.signOut();
      window.location.replace("/founder");
    });

    return { sb, user };
  }

  function renderSetupNeeded() {
    document.body.innerHTML = "";
    const card = h("div", { class: "gate-card" }, [
      h("div", { class: "gate-mark" }, "⚙"),
      h("h1", { class: "gate-title" }, "Setup needed"),
      h("p", { class: "gate-sub" }, "Replace __YOUR_SUPABASE_ANON_KEY__ in /founder/app.js with the anon key from Supabase → Settings → API."),
    ]);
    document.body.appendChild(h("div", { class: "gate" }, card));
  }
  function renderDenied(email) {
    document.body.innerHTML = "";
    const card = h("div", { class: "gate-card" }, [
      h("div", { class: "gate-mark", style: "background:linear-gradient(135deg,#E11D48 0%,#D97706 100%);" }, "⛔"),
      h("h1", { class: "gate-title" }, "Access denied"),
      h("p", { class: "gate-sub" }, escapeHtml(email || "(no session)") + " is not in the founder allowlist."),
      h("a", { class: "btn btn-secondary", href: "/founder" }, "Back to sign-in"),
    ]);
    document.body.appendChild(h("div", { class: "gate" }, card));
  }

  // ============= ENGINE INTROSPECTION =============
  async function fetchEngineHealth() {
    try {
      const r = await fetch(ENGINE_URL + "/api/health", { cache: "no-store" });
      if (!r.ok) return { ok: false, status: r.status };
      return await r.json();
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  }

  // ============= EXPORTS =============
  global.pranix = {
    SUPABASE_URL, ENGINE_URL,
    bootstrap, fetchEngineHealth,
    h, $, $$, fmtAge, fmtAbs, shorten, sevClass, escapeHtml,
    renderTopbar,
  };
})(window);
