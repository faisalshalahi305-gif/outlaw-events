/** Client-side storage of the visitor identity + access grant (browser only). */
export const VISITOR_KEY = "outlaw-visitor-token";
export const ACCESS_KEY = "outlaw-access-token";
export const LABEL_KEY = "outlaw-visitor-label";

function store(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readVisitorToken(): string | null {
  return store()?.getItem(VISITOR_KEY) ?? null;
}

export function writeVisitorToken(token: string, label?: string) {
  const s = store();
  if (!s) return;
  s.setItem(VISITOR_KEY, token);
  if (label) s.setItem(LABEL_KEY, label);
}

export function readAccessToken(): string | null {
  return store()?.getItem(ACCESS_KEY) ?? null;
}

export function writeAccessToken(token: string) {
  store()?.setItem(ACCESS_KEY, token);
}

export function clearAccessToken() {
  store()?.removeItem(ACCESS_KEY);
}

export function readVisitorLabel(): string | null {
  return store()?.getItem(LABEL_KEY) ?? null;
}
