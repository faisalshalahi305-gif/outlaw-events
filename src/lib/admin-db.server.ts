import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { envValue } from "./env.server";

function createAdminFetch(key: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, name) => headers.set(name, value));
    }

    if (
      (key.startsWith("sb_publishable_") || key.startsWith("sb_secret_")) &&
      headers.get("Authorization") === `Bearer ${key}`
    ) {
      headers.delete("Authorization");
    }
    headers.set("apikey", key);
    return fetch(input, { ...init, headers });
  };
}

/**
 * Builds the privileged database client from the current request environment.
 * Reading the aliases directly avoids relying on mutating process.env before
 * the generated client module happens to initialize in a serverless runtime.
 */
export function createGateDatabaseClient() {
  const url = envValue("SUPABASE_URL");
  const key = envValue("SUPABASE_PUBLISHABLE_KEY");

  if (!url || !key) {
    const missing = [
      ...(!url ? ["SUPABASE_URL"] : []),
      ...(!key ? ["SUPABASE_PUBLISHABLE_KEY"] : []),
    ];
    console.error(`[Secret Gate] Missing environment variable(s): ${missing.join(", ")}`);
    throw new Error("gate_environment_missing");
  }

  return createClient<Database>(url, key, {
    global: { fetch: createAdminFetch(key) },
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}