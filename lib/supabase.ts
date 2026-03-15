import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import path from "path";

function loadEnvIfNeeded() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim())
    return;
  try {
    const root = process.cwd();
    config({ path: path.join(root, ".env.local"), override: true });
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      config({ path: path.join(root, ".env"), override: true });
    }
  } catch {
    // dotenv load failed
  }
}

/** Server-side admin client for storage (bypasses RLS). Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY. */
export function getSupabaseAdmin() {
  loadEnvIfNeeded();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}
