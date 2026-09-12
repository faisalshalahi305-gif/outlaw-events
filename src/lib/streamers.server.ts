import { createClient } from "@supabase/supabase-js";

import { envValue } from "./env.server";

export type KickStreamer = {
  username: string;
  displayName: string;
  avatar: string;
  bio: string;
  followers: number;
  isLive: boolean;
  viewerCount: number;
  streamTitle: string;
  thumbnail: string | null;
  verified: boolean;
  platform: "Kick";
  url: string;
};


function apiFetch(key: string): typeof fetch {
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

function client(key: string) {
  const url = envValue("SUPABASE_URL");
  if (!url || !key) throw new Error("streamers_environment_missing");
  return createClient(url, key, {
    global: { fetch: apiFetch(key) },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

/** Public reads go through the publishable key and the "approved" policy. */
export function publicStreamersClient() {
  return client(envValue("SUPABASE_PUBLISHABLE_KEY") || process.env["SUPABASE_ANON_KEY"] || "");
}

/** Privileged client used by the secret control panel only. */
export function adminStreamersClient() {
  return client(envValue("SUPABASE_SERVICE_ROLE_KEY"));
}

export type StreamerRow = {
  id: string;
  username: string;
  displayName: string;
  status: string;
  visitorNumber: number | null;
  createdAt: string;
};

export function normalizeUsername(value: unknown): string {
  const raw = String(value ?? "").trim();
  const fromUrl = raw.replace(/^https?:\/\/(www\.)?kick\.com\//i, "").split(/[/?#]/)[0] ?? "";
  return fromUrl.replace(/^@/, "").trim();
}

// Kick's edge blocks datacenter requests that claim to be a browser, but it
// serves the public channel API fine when no user-agent is sent at all.
const KICK_HEADERS = {
  accept: "application/json",
};


const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function tryKickEndpoint(url: string): Promise<Record<string, any> | null | "retry"> {
  try {
    const response = await fetch(url, {
      headers: KICK_HEADERS,
      signal: AbortSignal.timeout(10000),
    });
    if (response.status === 404) return null;
    if (!response.ok) return "retry";
    const data = (await response.json()) as Record<string, any>;
    if (!data?.["user"]?.username && !data?.["slug"]) return null;
    return data;
  } catch {
    return "retry";
  }
}

async function tryKickPublicPage(
  username: string,
): Promise<Record<string, any> | null | "retry"> {
  const slug = encodeURIComponent(username);
  try {
    const response = await fetch(`https://r.jina.ai/http://kick.com/${slug}`, {
      headers: { accept: "text/plain" },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return "retry";

    const content = await response.text();
    if (/^Title:\s*Channel Not Found\s*-\s*Kick Streaming/im.test(content)) return null;

    const title = /^Title:\s*(.+?)\s+Stream\s+-\s+Watch Live on Kick/im.exec(content)?.[1]?.trim();
    if (!title) return "retry";

    return {
      slug: username,
      user: { username: title },
      followers_count: 0,
    };
  } catch {
    return "retry";
  }
}

/** Kick stores channels as slugs: lowercase, and "_" written as "-". */
function slugVariants(username: string): string[] {
  const lower = username.toLowerCase();
  const dashed = lower.replace(/_/g, "-");
  return [...new Set([username, lower, dashed])];
}

/** Ask Kick's search for the real slug when the guessed ones do not exist. */
async function findKickSlug(username: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://kick.com/api/search?searched_word=${encodeURIComponent(username)}`,
      { headers: KICK_HEADERS, signal: AbortSignal.timeout(10000) },
    );
    if (!response.ok) return null;
    const data = (await response.json()) as { channels?: Array<{ slug?: string }> };
    const wanted = username.toLowerCase().replace(/[^a-z0-9]/g, "");
    const match = (data.channels ?? []).find(
      (c) => String(c?.slug ?? "").toLowerCase().replace(/[^a-z0-9]/g, "") === wanted,
    );
    return match?.slug ?? null;
  } catch {
    return null;
  }
}

/**
 * One fast pass over the likely slugs — used when refreshing the public list,
 * where a stored profile already covers a channel Kick refuses to answer for.
 */
export async function fetchKickChannelQuick(
  username: string,
): Promise<Record<string, any> | null> {
  for (const candidate of slugVariants(username)) {
    const result = await tryKickEndpoint(
      `https://kick.com/api/v2/channels/${encodeURIComponent(candidate)}`,
    );
    if (result === "retry") continue;
    return result;
  }
  return null;
}

/** Returns the channel payload, or null when the Kick account does not exist. */
export async function fetchKickChannel(username: string): Promise<Record<string, any> | null> {
  const slug = encodeURIComponent(username);
  const candidates = slugVariants(username);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    let sawMissing = false;
    for (const candidate of candidates) {
      const encoded = encodeURIComponent(candidate);
      for (const url of [
        `https://kick.com/api/v2/channels/${encoded}`,
        `https://kick.com/api/v1/channels/${encoded}`,
      ]) {
        const result = await tryKickEndpoint(url);
        if (result === "retry") continue;
        if (result === null) {
          sawMissing = true;
          break;
        }
        return result;
      }
    }

    if (sawMissing) {
      const resolved = await findKickSlug(username);
      if (resolved && !candidates.includes(resolved)) {
        const found = await tryKickEndpoint(
          `https://kick.com/api/v2/channels/${encodeURIComponent(resolved)}`,
        );
        if (found && found !== "retry") return found;
      }
      return null;
    }

    await sleep(400 * (attempt + 1));
  }


  // Last resort: does the public channel page exist at all?
  try {
    const page = await fetch(`https://kick.com/${slug}`, {
      headers: { ...KICK_HEADERS, accept: "text/html" },
      signal: AbortSignal.timeout(10000),
    });
    if (page.status === 404) return null;
    if (page.ok) return { slug: username, user: { username } };
  } catch {
    /* ignore */
  }

  // Kick blocks some server IP ranges even for valid public channels. Use a
  // text rendering of the public page so verification can still distinguish
  // a real channel from Kick's "Channel Not Found" page.
  const publicPage = await tryKickPublicPage(username);
  if (publicPage !== "retry") return publicPage;

  // Keep external-provider outages recoverable. Callers already handle null
  // as a failed verification, while throwing here causes an RPC error screen.
  return null;
}

function defaultAvatar(username: string): string {
  // Stable, non-random placeholder so a channel without a picture keeps the
  // same image on every refresh.
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=1a1a1a&color=53fc18&bold=true`;
}

function fallback(username: string, stored?: StoredStreamer | null): KickStreamer {
  return {
    username,
    displayName: stored?.displayName || username,
    avatar: stored?.avatar || defaultAvatar(username),
    bio: stored?.bio ?? "",
    followers: stored?.followers ?? 0,
    isLive: false,
    viewerCount: 0,
    streamTitle: "",
    thumbnail: null,
    verified: false,
    platform: "Kick",
    url: `https://kick.com/${username}`,
  };
}

async function fetchOne(
  username: string,
  stored?: StoredStreamer | null,
): Promise<KickStreamer> {
  try {
    // The list refresh uses the quick lookup: a slow multi-attempt search for
    // one blocked channel must not hold up the whole page.
    const data = await fetchKickChannelQuick(username);
    if (!data) return fallback(username, stored);

    const live = (data["livestream"] ?? null) as {
      viewer_count?: number;
      session_title?: string;
      thumbnail?: { url?: string } | null;
    } | null;
    const user = (data["user"] ?? {}) as {
      username?: string;
      profile_pic?: string | null;
      bio?: string | null;
    };

    const categories = (data["recent_categories"] ?? []) as Array<{ name?: string }>;
    const category = categories[0]?.name?.trim() ?? "";
    const bio = (user.bio ?? "").trim();
    const slug = String(data["slug"] ?? username);

    return {
      username,
      displayName: user.username || stored?.displayName || username,
      avatar: user.profile_pic || stored?.avatar || defaultAvatar(username),
      // Many channels leave the bio empty; show what they last streamed instead.
      bio: bio || (category ? `آخر بث: ${category}` : "") || (stored?.bio ?? ""),
      followers: Number(data["followers_count"] ?? 0) || (stored?.followers ?? 0),
      isLive: live !== null,
      viewerCount: live?.viewer_count ?? 0,
      streamTitle: live?.session_title ?? "",
      thumbnail: live?.thumbnail?.url ?? null,
      verified: Boolean(data["verified"]),
      platform: "Kick",
      url: `https://kick.com/${slug}`,
    };

  } catch {
    return fallback(username, stored);
  }
}


/** Stored profile of an approved streamer, used when Kick is slow or blocked. */
export type StoredStreamer = {
  username: string;
  displayName: string;
  avatar: string | null;
  bio: string;
  followers: number;
};

/** The approved streamers, managed from the secret control panel. */
export async function loadApprovedStreamers(): Promise<StoredStreamer[]> {
  const db = publicStreamersClient();
  const { data, error } = await db
    .from("streamers")
    .select("username, display_name, avatar_url, bio, followers")
    .eq("status", "approved")
    .order("created_at", { ascending: true })
    .limit(1000);
  if (error) {
    console.error("[streamers] load failed:", error.code, error.message, error.details, error.hint);
    // The table does not exist yet in the connected database: show an empty
    // list instead of crashing the page.
    if (error.code === "PGRST205" || error.code === "42P01") return [];
    throw new Error("streamers_load_failed");
  }
  return (data ?? []).map((row: any) => ({
    username: String(row.username),
    displayName: String(row.display_name || row.username),
    avatar: row.avatar_url ? String(row.avatar_url) : null,
    bio: String(row.bio ?? ""),
    followers: Number(row.followers ?? 0),
  }));
}

/** Kept for callers that only need the usernames. */
export async function loadApprovedUsernames(): Promise<string[]> {
  return (await loadApprovedStreamers()).map((row) => row.username);
}

/** The profile fields worth remembering so a card is never empty. */
export function profileFromChannel(channel: Record<string, any>, username: string) {
  const user = (channel["user"] ?? {}) as {
    username?: string;
    profile_pic?: string | null;
    bio?: string | null;
  };
  const categories = (channel["recent_categories"] ?? []) as Array<{ name?: string }>;
  const category = categories[0]?.name?.trim() ?? "";
  const bio = (user.bio ?? "").trim();
  return {
    display_name: String(user.username || username),
    avatar_url: user.profile_pic ? String(user.profile_pic) : null,
    bio: bio || (category ? `آخر بث: ${category}` : ""),
    followers: Number(channel["followers_count"] ?? 0),
  };
}

/** Best-effort: remember the freshly fetched profile for the next page load. */
async function rememberProfiles(
  rows: { username: string; displayName: string; avatar: string; bio: string; followers: number }[],
) {
  if (!rows.length) return;
  try {
    const db = adminStreamersClient();
    await Promise.all(
      rows.map((row) =>
        db
          .from("streamers")
          .update({
            display_name: row.displayName,
            avatar_url: row.avatar,
            bio: row.bio,
            followers: row.followers,
            synced_at: new Date().toISOString(),
          })
          .ilike("username", row.username),
      ),
    );
  } catch (error) {
    console.error("[streamers] profile cache update failed", error);
  }
}

/** Fetch every approved Kick channel, falling back to the stored profile. */
export async function loadKickStreamers(): Promise<KickStreamer[]> {
  const stored = await loadApprovedStreamers();
  const results: KickStreamer[] = [];
  const CONCURRENCY = 25;

  for (let i = 0; i < stored.length; i += CONCURRENCY) {
    const chunk = stored.slice(i, i + CONCURRENCY);
    results.push(...(await Promise.all(chunk.map((row) => fetchOne(row.username, row)))));
  }

  // Keep the stored copy fresh, but only for channels Kick actually answered.
  await rememberProfiles(
    results
      .filter((row) => row.avatar && !row.avatar.startsWith("https://ui-avatars.com/"))
      .map((row) => ({
        username: row.username,
        displayName: row.displayName,
        avatar: row.avatar,
        bio: row.bio,
        followers: row.followers,
      })),
  );

  return results.sort((a, b) =>
    a.isLive === b.isLive ? b.followers - a.followers : a.isLive ? -1 : 1,
  );
}
