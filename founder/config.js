// /founder/config.js
// Public Supabase anon key — safe to ship to browser; RLS gates every read/write.
// Replace the value below with your project's anon key from:
//   Supabase Dashboard → pranix-agents → Settings → API → Project API keys → anon public
//
// This is the ONLY value you need to change before deploy.

window.__PRANIX_CFG__ = {
  SUPABASE_URL: "https://mvdjyjccvioxircxuzgz.supabase.co",
  SUPABASE_ANON: "PASTE_ANON_KEY_HERE",
  ENGINE_URL: "https://pranix-agent-engine.vercel.app"
};
