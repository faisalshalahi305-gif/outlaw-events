/**
 * Environment aliases.
 *
 * The app talks to an external (already existing) Supabase project. Lovable
 * managed secrets can never be read back, so this copy of the site reads
 * user-owned variable names whose values the owner chooses and can paste
 * anywhere (Lovable secrets, Vercel, local .env).
 *
 * Alias (checked in order)                 ->  canonical name used by the app
 * EXTERNAL_SUPABASE_URL                    ->  SUPABASE_URL
 * EXTERNAL_SUPABASE_PUBLISHABLE_KEY        ->  SUPABASE_PUBLISHABLE_KEY
 * EXTERNAL_SUPABASE_SERVICE_ROLE_KEY,
 *   DB_SERVICE_KEY                         ->  SUPABASE_SERVICE_ROLE_KEY
 * GATE_SESSION_SECRET                      ->  SESSION_SECRET
 * GATE_HASH_SALT                           ->  ADMIN_HASH_SALT
 *
 * An EXTERNAL_* value wins over the canonical name, so a managed backend that
 * may be connected later can never silently take over the external project.
 */
const ALIASES: Record<string, string[]> = {
  SUPABASE_URL: ["EXTERNAL_SUPABASE_URL"],
  SUPABASE_PUBLISHABLE_KEY: ["EXTERNAL_SUPABASE_PUBLISHABLE_KEY", "EXTERNAL_SUPABASE_ANON_KEY"],
  SUPABASE_SERVICE_ROLE_KEY: ["EXTERNAL_SUPABASE_SERVICE_ROLE_KEY", "DB_SERVICE_KEY"],
  SESSION_SECRET: ["GATE_SESSION_SECRET"],
  ADMIN_HASH_SALT: ["GATE_HASH_SALT"],
};

function read(name: string): string {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : "";
}

export function envValue(canonical: string): string {
  for (const alias of ALIASES[canonical] ?? []) {
    const value = read(alias);
    if (value) return value;
  }
  return read(canonical);
}

export function applyEnvAliases(): void {
  for (const canonical of Object.keys(ALIASES)) {
    const value = envValue(canonical);
    if (value) process.env[canonical] = value;
  }
}

applyEnvAliases();

/** Config the browser needs to talk to Supabase directly (publishable only). */
export function publicSupabaseConfig(): { url: string; publishableKey: string } {
  return {
    url: envValue("SUPABASE_URL"),
    publishableKey: envValue("SUPABASE_PUBLISHABLE_KEY"),
  };
}
