import { createServerFn } from "@tanstack/react-start";

export type StreamerRow = {
  id: string;
  username: string;
  displayName: string;
  status: string;
  visitorNumber: number | null;
  createdAt: string;
  removalRequestedAt: string | null;
  removalVisitorNumber: number | null;
};

type AdminTokens = { accessToken?: string | null; visitorToken?: string | null };

const cleanTokens = (data?: AdminTokens) => ({
  accessToken: String(data?.accessToken ?? "").trim().slice(0, 200),
  visitorToken: String(data?.visitorToken ?? "").trim().slice(0, 200),
});

function cleanUsername(value: unknown): string {
  const raw = String(value ?? "").trim();
  const fromUrl = raw.replace(/^https?:\/\/(www\.)?kick\.com\//i, "").split(/[/?#]/)[0] ?? "";
  const username = fromUrl.replace(/^@/, "").trim();
  if (!username || username.length > 60 || !/^[A-Za-z0-9_-]+$/.test(username)) {
    throw new Error("invalid_username");
  }
  return username;
}

async function requireGateAdmin(accessToken: string, visitorToken: string) {
  const { isGateAdmin } = await import("./suggestions.server");
  if (!(await isGateAdmin(accessToken, visitorToken))) throw new Error("forbidden");
}

export const getKickStreamers = createServerFn({ method: "GET" }).handler(async () => {
  const { loadKickStreamers } = await import("./streamers.server");
  return loadKickStreamers();
});

/** Public: check a Kick username really exists before letting a visitor submit it. */
export const checkKickUsername = createServerFn({ method: "POST" })
  .inputValidator((data: { username: string }) => ({ username: cleanUsername(data?.username) }))
  .handler(async ({ data }) => {
    const { fetchKickChannel, publicStreamersClient } = await import("./streamers.server");
    const channel = await fetchKickChannel(data.username);
    if (!channel) return { ok: false as const, reason: "not_found" as const };

    const user = (channel["user"] ?? {}) as {
      username?: string;
      profile_pic?: string | null;
      bio?: string | null;
    };
    const displayName = String(user.username || data.username);

    const db = publicStreamersClient();
    const { data: existing } = await db
      .from("streamers")
      .select("id")
      .ilike("username", data.username)
      .maybeSingle();

    return {
      ok: true as const,
      username: data.username,
      displayName,
      avatar: user.profile_pic ?? null,
      bio: (user.bio ?? "").trim(),
      verified: Boolean(channel["verified"]),
      followers: Number(channel["followers_count"] ?? 0),
      alreadyListed: Boolean(existing),
    };
  });


/** Public: a visitor asks for their Kick channel to be added to the list. */
export const submitStreamerRequest = createServerFn({ method: "POST" })
  .inputValidator((data: { username: string; visitorNumber?: number | null }) => ({
    username: cleanUsername(data?.username),
    visitorNumber:
      typeof data?.visitorNumber === "number" && Number.isFinite(data.visitorNumber)
        ? data.visitorNumber
        : null,
  }))
  .handler(async ({ data }) => {
    const { fetchKickChannel, adminStreamersClient } = await import("./streamers.server");
    const channel = await fetchKickChannel(data.username);
    if (!channel) return { ok: false as const, reason: "not_found" as const };

    const db = adminStreamersClient();
    const { data: existing } = await db
      .from("streamers")
      .select("id, status")
      .ilike("username", data.username)
      .maybeSingle();
    if (existing) {
      return {
        ok: false as const,
        reason: (existing as { status: string }).status === "approved" ? "listed" : "pending",
      };
    }

    const { error } = await db.from("streamers").insert({
      username: data.username,
      display_name: String(channel["user"]?.username ?? data.username),
      status: "pending",
      visitor_number: data.visitorNumber,
    });
    if (error) throw new Error("save_failed");
    return { ok: true as const };
  });

/** Admin: every streamer row — requests and the live list. */
export const listStreamers = createServerFn({ method: "POST" })
  .inputValidator((data?: AdminTokens) => cleanTokens(data))
  .handler(async ({ data }) => {
    await requireGateAdmin(data.accessToken, data.visitorToken);
    const { adminStreamersClient } = await import("./streamers.server");
    const { data: rows, error } = await adminStreamersClient()
      .from("streamers")
      .select(
        "id, username, display_name, status, visitor_number, created_at, removal_requested_at, removal_visitor_number",
      )
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw new Error("load_failed");

    const streamers: StreamerRow[] = (rows ?? []).map((row: any) => ({
      id: row.id,
      username: row.username,
      displayName: row.display_name || row.username,
      status: String(row.status ?? "pending"),
      visitorNumber: row.visitor_number === null ? null : Number(row.visitor_number),
      createdAt: row.created_at,
      removalRequestedAt: row.removal_requested_at ?? null,
      removalVisitorNumber:
        row.removal_visitor_number === null || row.removal_visitor_number === undefined
          ? null
          : Number(row.removal_visitor_number),
    }));
    return { streamers };
  });

/** Public: a visitor asks for an approved streamer to be removed from the list. */
export const requestStreamerRemoval = createServerFn({ method: "POST" })
  .inputValidator((data: { username: string; visitorNumber?: number | null }) => ({
    username: cleanUsername(data?.username),
    visitorNumber:
      typeof data?.visitorNumber === "number" && Number.isFinite(data.visitorNumber)
        ? data.visitorNumber
        : null,
  }))
  .handler(async ({ data }) => {
    const { adminStreamersClient } = await import("./streamers.server");
    const { error } = await adminStreamersClient()
      .from("streamers")
      .update({
        removal_requested_at: new Date().toISOString(),
        removal_visitor_number: data.visitorNumber,
      })
      .ilike("username", data.username)
      .eq("status", "approved");
    if (error) throw new Error("save_failed");
    return { ok: true as const };
  });

/** Admin: refuse a removal request and keep the streamer on the list. */
export const rejectStreamerRemoval = createServerFn({ method: "POST" })
  .inputValidator((data: AdminTokens & { id: string }) => ({
    ...cleanTokens(data),
    id: String(data?.id ?? "").trim(),
  }))
  .handler(async ({ data }) => {
    await requireGateAdmin(data.accessToken, data.visitorToken);
    const { adminStreamersClient } = await import("./streamers.server");
    const { error } = await adminStreamersClient()
      .from("streamers")
      .update({ removal_requested_at: null, removal_visitor_number: null })
      .eq("id", data.id);
    if (error) throw new Error("save_failed");
    return { ok: true as const };
  });

/** Admin: approve a pending request (adds it to the public list). */
export const approveStreamer = createServerFn({ method: "POST" })
  .inputValidator((data: AdminTokens & { id: string }) => ({
    ...cleanTokens(data),
    id: String(data?.id ?? "").trim(),
  }))
  .handler(async ({ data }) => {
    await requireGateAdmin(data.accessToken, data.visitorToken);
    const { adminStreamersClient } = await import("./streamers.server");
    const { error } = await adminStreamersClient()
      .from("streamers")
      .update({ status: "approved", reviewed_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error("save_failed");
    return { ok: true as const };
  });

/** Admin: remove a request or an approved streamer entirely. */
export const deleteStreamer = createServerFn({ method: "POST" })
  .inputValidator((data: AdminTokens & { id: string }) => ({
    ...cleanTokens(data),
    id: String(data?.id ?? "").trim(),
  }))
  .handler(async ({ data }) => {
    await requireGateAdmin(data.accessToken, data.visitorToken);
    const { adminStreamersClient } = await import("./streamers.server");
    const { error } = await adminStreamersClient()
      .from("streamers")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error("delete_failed");
    return { ok: true as const };
  });

/** Admin: add a streamer straight to the public list. */
export const addStreamer = createServerFn({ method: "POST" })
  .inputValidator((data: AdminTokens & { username: string }) => ({
    ...cleanTokens(data),
    username: cleanUsername(data?.username),
  }))
  .handler(async ({ data }) => {
    await requireGateAdmin(data.accessToken, data.visitorToken);
    const { fetchKickChannel, adminStreamersClient } = await import("./streamers.server");
    const channel = await fetchKickChannel(data.username);
    if (!channel) return { ok: false as const, reason: "not_found" as const };

    const db = adminStreamersClient();
    const { data: existing } = await db
      .from("streamers")
      .select("id")
      .ilike("username", data.username)
      .maybeSingle();
    if (existing) {
      const { error } = await db
        .from("streamers")
        .update({ status: "approved", reviewed_at: new Date().toISOString() })
        .eq("id", (existing as { id: string }).id);
      if (error) throw new Error("save_failed");
      return { ok: true as const };
    }

    const { error } = await db.from("streamers").insert({
      username: data.username,
      display_name: String(channel["user"]?.username ?? data.username),
      status: "approved",
      reviewed_at: new Date().toISOString(),
    });
    if (error) throw new Error("save_failed");
    return { ok: true as const };
  });
