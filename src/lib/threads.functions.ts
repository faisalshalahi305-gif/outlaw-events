import "./env.server";
import { createServerFn } from "@tanstack/react-start";

import {
  THREAD_BUCKET,
  cleanCover,
  cleanExcerpt,
  cleanThreadEntries,
  cleanTitle,
  type ThreadCard,
  type ThreadEntry,
} from "./threads-shared";
import { cleanTokens, type AdminTokens } from "./edits-shared";

export type { ThreadCard, ThreadEntry } from "./threads-shared";

async function admin() {
  const { createGateDatabaseClient } = await import("./admin-db.server");
  // The generated Supabase types do not cover every table of the external
  // project, so queries go through a loosely typed handle.
  return createGateDatabaseClient() as any;
}

async function signAll(db: any, paths: string[]): Promise<Record<string, string>> {
  const urls: Record<string, string> = {};
  await Promise.all(
    Array.from(new Set(paths.filter(Boolean))).map(async (path) => {
      const { data } = await db.storage.from(THREAD_BUCKET).createSignedUrl(path, 60 * 60 * 6);
      if (data?.signedUrl) urls[path] = data.signedUrl;
    }),
  );
  return urls;
}

async function requireAdminTokens(tokens: { accessToken: string; visitorToken: string }) {
  const { isGateAdmin } = await import("./suggestions.server");
  if (!(await isGateAdmin(tokens.accessToken, tokens.visitorToken)))
    throw new Error("forbidden");
}

/** Public: cards of every published thread, newest first, optional title search. */
export const listThreads = createServerFn({ method: "POST" })
  .inputValidator((data?: { query?: string }) => ({
    query: String(data?.query ?? "").trim().slice(0, 120),
  }))
  .handler(async ({ data }) => {
    const db = await admin();
    let request = db
      .from("threads")
      .select("id, title, excerpt, cover_path, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.query) request = request.ilike("title", `%${data.query}%`);

    const { data: rows, error } = await request;
    if (error) throw new Error("load_failed");

    const list = (rows ?? []) as any[];
    const urls = await signAll(db, list.map((r) => String(r.cover_path)));

    const threads: ThreadCard[] = list.map((r) => ({
      id: String(r.id),
      title: String(r.title ?? ""),
      excerpt: String(r.excerpt ?? ""),
      coverPath: String(r.cover_path ?? ""),
      coverUrl: urls[String(r.cover_path)] ?? "",
      createdAt: String(r.created_at),
    }));

    return { threads };
  });

/** Public: one full thread with its blocks and signed image urls. */
export const getThread = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => ({ id: String(data?.id ?? "").trim() }))
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: row, error } = await db
      .from("threads")
      .select("id, title, excerpt, cover_path, entries, created_at")
      .eq("id", data.id)
      .maybeSingle();
    if (error || !row) throw new Error("not_found");

    const entries: ThreadEntry[] = cleanThreadEntries((row as any).entries);
    const imageUrls = await signAll(db, [
      String((row as any).cover_path),
      ...entries.flatMap((e) => e.images),
    ]);

    return {
      thread: {
        id: String((row as any).id),
        title: String((row as any).title ?? ""),
        excerpt: String((row as any).excerpt ?? ""),
        coverPath: String((row as any).cover_path ?? ""),
        coverUrl: imageUrls[String((row as any).cover_path)] ?? "",
        createdAt: String((row as any).created_at),
        entries,
        imageUrls,
      },
    };
  });

/**
 * Public: a visitor's thread is NOT published. It is stored in the review
 * queue (edit_requests) and only becomes live after approval in the control
 * panel.
 */
export const submitThreadRequest = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id?: string | null;
      title: string;
      excerpt: string;
      coverPath: string;
      note?: string | null;
      visitorNumber?: number | null;
      entries: { text?: string; images?: string[] }[];
    }) => ({
      id: String(data?.id ?? "").trim() || null,
      title: cleanTitle(data?.title),
      excerpt: cleanExcerpt(data?.excerpt),
      coverPath: cleanCover(data?.coverPath),
      note: String(data?.note ?? "").trim().slice(0, 500),
      visitorNumber:
        typeof data?.visitorNumber === "number" && Number.isFinite(data.visitorNumber)
          ? data.visitorNumber
          : null,
      entries: cleanThreadEntries(data?.entries),
    }),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: row, error } = await db
      .from("edit_requests")
      .insert({
        section: data.id ? "thread_update" : "thread_create",
        target_id: data.id,
        note: data.note || null,
        visitor_number: data.visitorNumber,
        entries: data.entries,
        payload: { title: data.title, excerpt: data.excerpt, coverPath: data.coverPath },
      })
      .select("id")
      .single();
    if (error || !row) throw new Error("save_failed");
    return { ok: true as const, id: String(row.id) };
  });

/** Admin: edit a published thread from the control panel — applied instantly. */
export const adminSaveThread = createServerFn({ method: "POST" })
  .inputValidator(
    (
      data: AdminTokens & {
        id: string;
        title: string;
        excerpt: string;
        coverPath: string;
        entries: { text?: string; images?: string[] }[];
      },
    ) => ({
      ...cleanTokens(data),
      id: String(data?.id ?? "").trim(),
      title: cleanTitle(data?.title),
      excerpt: cleanExcerpt(data?.excerpt),
      coverPath: cleanCover(data?.coverPath),
      entries: cleanThreadEntries(data?.entries),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdminTokens(data);
    const db = await admin();
    const { data: row, error } = await db
      .from("threads")
      .update({
        title: data.title,
        excerpt: data.excerpt,
        cover_path: data.coverPath,
        entries: data.entries,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .select("id")
      .maybeSingle();
    if (error || !row) throw new Error("save_failed");
    return { ok: true as const, id: String(row.id) };
  });

/** Admin: delete a published thread from the control panel. */
export const adminDeleteThread = createServerFn({ method: "POST" })
  .inputValidator((data: AdminTokens & { id: string }) => ({
    ...cleanTokens(data),
    id: String(data?.id ?? "").trim(),
  }))
  .handler(async ({ data }) => {
    await requireAdminTokens(data);
    const db = await admin();
    const { error } = await db.from("threads").delete().eq("id", data.id);
    if (error) throw new Error("delete_failed");
    return { ok: true as const };
  });
