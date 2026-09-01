/**
 * Environment aliases.
 *
 * Lovable-managed secrets can never be read back, so a self-hosted copy
 * (Vercel) cannot reuse the exact same values. To keep both deployments in
 * sync, the app also accepts user-owned alias names whose values the user
 * chooses themselves and can therefore paste anywhere.
 *
 * Alias (user-owned)          ->  canonical name used by the app
 * GATE_SESSION_SECRET         ->  SESSION_SECRET
 * GATE_HASH_SALT              ->  ADMIN_HASH_SALT
 * DB_SERVICE_KEY         ->  SUPABASE_SERVICE_ROLE_KEY
 *
 * The alias WINS when present, so setting it in both Lovable and Vercel makes
 * the two environments byte-identical without deleting the old secrets.
 */
const ALIASES: Record<string, string> = {
  SESSION_SECRET: "GATE_SESSION_SECRET",
  ADMIN_HASH_SALT: "GATE_HASH_SALT",
  SUPABASE_SERVICE_ROLE_KEY: "DB_SERVICE_KEY",
};

export function envValue(canonical: string): string {
  const alias = ALIASES[canonical];
  const aliasValue = alias ? process.env[alias] : undefined;
  return (aliasValue && aliasValue.trim()) || process.env[canonical] || "";
}

export function applyEnvAliases(): void {
  for (const canonical of Object.keys(ALIASES)) {
    const value = envValue(canonical);
    if (value && process.env[canonical] !== value) {
      process.env[canonical] = value;
    }
  }
}

applyEnvAliases();
