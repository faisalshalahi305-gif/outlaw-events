import { createServerFn } from "@tanstack/react-start";

export type BrowserSupabaseConfig = { url: string; publishableKey: string };

/**
 * Publishable Supabase config for the browser.
 *
 * The site points at an external Supabase project whose values live in
 * server-side secrets, so there are no build-time VITE_* variables. The root
 * route loads this once and hands it to the browser client. Only the
 * publishable key is ever returned — never the service-role key.
 */
export const getBrowserSupabaseConfig = createServerFn({ method: "GET" }).handler(
  async (): Promise<BrowserSupabaseConfig> => {
    const { publicSupabaseConfig } = await import("./env.server");
    return publicSupabaseConfig();
  },
);
