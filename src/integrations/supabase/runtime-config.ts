import type { BrowserSupabaseConfig } from "@/lib/public-config.functions";

declare global {
  interface Window {
    __SUPABASE_PUBLIC_CONFIG__?: BrowserSupabaseConfig;
  }
}

let cached: BrowserSupabaseConfig | undefined;

export function setBrowserSupabaseConfig(config: BrowserSupabaseConfig | undefined): void {
  if (!config?.url || !config.publishableKey) return;
  cached = config;
  if (typeof window !== "undefined") window.__SUPABASE_PUBLIC_CONFIG__ = config;
}

export function getBrowserSupabaseConfigSync(): BrowserSupabaseConfig | undefined {
  if (cached) return cached;
  if (typeof window !== "undefined" && window.__SUPABASE_PUBLIC_CONFIG__) {
    cached = window.__SUPABASE_PUBLIC_CONFIG__;
    return cached;
  }
  return undefined;
}

let pending: Promise<BrowserSupabaseConfig | undefined> | undefined;

/**
 * Guarantees the browser has the publishable Supabase config.
 *
 * Static preview/prerender builds can serialize an empty config into the root
 * loader payload, so the browser has to ask the server for it once at runtime
 * instead of throwing when a click needs the client.
 */
export async function ensureBrowserSupabaseConfig(): Promise<BrowserSupabaseConfig | undefined> {
  const existing = getBrowserSupabaseConfigSync();
  if (existing) return existing;
  if (typeof window === "undefined") return undefined;
  if (!pending) {
    pending = (async () => {
      try {
        const { getBrowserSupabaseConfig } = await import("@/lib/public-config.functions");
        const config = await getBrowserSupabaseConfig();
        setBrowserSupabaseConfig(config);
      } catch (error) {
        console.error("[Supabase] failed to load runtime config", error);
      } finally {
        pending = undefined;
      }
      return getBrowserSupabaseConfigSync();
    })();
  }
  return pending;
}
