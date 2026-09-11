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
