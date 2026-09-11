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

export type { ThreadCard, ThreadEntry } from "./threads-shared";

async function admin() {
  const { createGateDatabaseClient } = await import("./admin-db.server");
  return createGateDatabaseClient();
}

async function signAll(
  db: Awaited<ReturnType<typeof admin>>,
  paths: string[],
): Promise<Record<string, string>> {
  const urls: Record<string, string> = {};
  await Promise.all(
    Array.from(new Set(paths)).map(async (path) => {
      const { data } = await db.storage.from(THREAD_BUCKET).createSignedUrl(path, 60 * 60 * 6);
      if (data?.signedUrl) urls[path] = data.signedUrl;
    }),
  );
  return urls;
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

/** Public: create or update a thread — open to every visitor. */
export const saveThread = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id?: string | null;
      title: string;
      excerpt: string;
      coverPath: string;
      visitorNumber?: number | null;
      entries: { text?: string; images?: string[] }[];
    }) => ({
      id: String(data?.id ?? "").trim() || null,
      title: cleanTitle(data?.title),
      excerpt: cleanExcerpt(data?.excerpt),
      coverPath: cleanCover(data?.coverPath),
      visitorNumber:
        typeof data?.visitorNumber === "number" && Number.isFinite(data.visitorNumber)
          ? data.visitorNumber
          : null,
      entries: cleanThreadEntries(data?.entries),
    }),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    const now = new Date().toISOString();
    const payload = {
      title: data.title,
      excerpt: data.excerpt,
      cover_path: data.coverPath,
      entries: data.entries,
      updated_at: now,
    };

    if (data.id) {
      const { data: row, error } = await db
        .from("threads")
        .update(payload)
        .eq("id", data.id)
        .select("id")
        .maybeSingle();
      if (error || !row) throw new Error("save_failed");
      return { ok: true as const, id: String((row as any).id) };
    }

    const { data: row, error } = await db
      .from("threads")
      .insert({ ...payload, visitor_number: data.visitorNumber })
      .select("id")
      .single();
    if (error || !row) throw new Error("save_failed");
    return { ok: true as const, id: String((row as any).id) };
  });
