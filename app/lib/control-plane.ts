import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function getControlPlane(): SupabaseClient {
  if (_client) return _client;
  const url = process.env["CONTROL_PLANE_SUPABASE_URL"];
  const key = process.env["CONTROL_PLANE_SERVICE_ROLE_KEY"];
  if (!url || !key) throw new Error("Missing CONTROL_PLANE_SUPABASE_URL or CONTROL_PLANE_SERVICE_ROLE_KEY");
  _client = createClient(url, key);
  return _client;
}
