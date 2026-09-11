import "./env.server";
import { createServerFn } from "@tanstack/react-start";

import {
  cleanEntries,
  cleanSection,
  cleanThreadPayload,
  cleanTokens,
  EDIT_BUCKET,
  isThreadSection,
  type AdminTokens,
  type EditEntry,
  type EditRequest,
} from "./edits-shared";
import { cleanThreadEntries } from "./threads-shared";

export type { EditEntry, EditRequest } from "./edits-shared";




async function admin() {
  const { createGateDatabaseClient } = await import("./admin-db.server");
  // The generated types do not cover every table/column of the external
  // project, so queries go through a loosely typed handle.
  return createGateDatabaseClient() as any;
}

/** Apply an approved thread request: create, update or delete the thread. */
async function applyThreadRequest(db: any, row: any) {
  const payload = cleanThreadPayload(row.payload);
  const entries = cleanThreadEntries(row.entries);
  const now = new Date().toISOString();

  if (row.section === "thread_delete") {
    if (!row.target_id) throw new Error("apply_failed");
    const { error } = await db.from("threads").delete().eq("id", row.target_id);
    if (error) throw new Error("apply_failed");
    return;
  }

  if (!payload?.title || !payload.excerpt || !payload.coverPath) throw new Error("apply_failed");

  const values = {
    title: payload.title,
    excerpt: payload.excerpt,
    cover_path: payload.coverPath,
    entries,
    updated_at: now,
  };

  if (row.section === "thread_update" && row.target_id) {
    const { error } = await db.from("threads").update(values).eq("id", row.target_id);
    if (error) throw new Error("apply_failed");
    return;
  }

  const { error } = await db
    .from("threads")
    .insert({ ...values, visitor_number: row.visitor_number ?? null });
  if (error) throw new Error("apply_failed");
}

async function signAll(
  db: Awaited<ReturnType<typeof admin>>,
  paths: string[],
): Promise<Record<string, string>> {
  const urls: Record<string, string> = {};
  await Promise.all(
    Array.from(new Set(paths)).map(async (path) => {
      const { data } = await db.storage.from(EDIT_BUCKET).createSignedUrl(path, 60 * 60 * 6);
      if (data?.signedUrl) urls[path] = data.signedUrl;
    }),
  );
  return urls;
}

/** Public: the currently published snapshot of a section (text + images + signed urls). */
export const loadSection = createServerFn({ method: "POST" })
  .inputValidator((data: { section: string }) => ({ section: cleanSection(data?.section) }))
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: rows, error } = await db
      .from("blocks")
      .select("id, slot, content, block_images(path, position)")
      .eq("section", data.section)
      .order("slot");
    if (error) throw new Error("load_failed");

    const entries: EditEntry[] = ((rows ?? []) as any[]).map((row) => ({
      text: String(row.content ?? ""),
      images: ((row.block_images ?? []) as { path: string; position: number }[])
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((i) => i.path),
    }));

    const imageUrls = await signAll(db, entries.flatMap((e) => e.images));
    return { entries, imageUrls };
  });

/** Public: send a full edited snapshot of a section for review. */
export const submitEdit = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      section: string;
      note?: string | null;
      visitorNumber?: number | null;
      entries: { text?: string; images?: string[] }[];
    }) => ({
      section: cleanSection(data?.section),
      note: String(data?.note ?? "").trim().slice(0, 500),
      visitorNumber:
        typeof data?.visitorNumber === "number" && Number.isFinite(data.visitorNumber)
          ? data.visitorNumber
          : null,
      entries: cleanEntries(data?.entries),
    }),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: row, error } = await db
      .from("edit_requests")
      .insert({
        section: data.section,
        note: data.note || null,
        visitor_number: data.visitorNumber,
        entries: data.entries,
      })
      .select("id, created_at")
      .single();
    if (error || !row) throw new Error("save_failed");
    return { ok: true as const, id: row.id as string };
  });

/** Admin: list edit requests, newest first. */
export const listEdits = createServerFn({ method: "POST" })
  .inputValidator((data?: AdminTokens) => cleanTokens(data))
  .handler(async ({ data }) => {
    const { isGateAdmin } = await import("./suggestions.server");
    if (!(await isGateAdmin(data.accessToken, data.visitorToken)))
      throw new Error("forbidden");

    const db = await admin();
    const { data: rows, error } = await db
      .from("edit_requests")
      .select(
        "id, section, visitor_number, note, status, entries, target_id, payload, created_at, reviewed_at",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error("load_failed");

    const list = (rows ?? []) as any[];
    const imageUrls = await signAll(db, [
      ...list.flatMap((r) => cleanEntries(r.entries).flatMap((e) => e.images)),
      ...list.map((r) => cleanThreadPayload(r.payload)?.coverPath ?? ""),
    ]);

    const requests: EditRequest[] = list.map((r) => ({
      id: r.id,
      section: r.section,
      visitorNumber: r.visitor_number,
      note: r.note,
      status: r.status,
      createdAt: r.created_at,
      reviewedAt: r.reviewed_at,
      entries: cleanEntries(r.entries),
      targetId: r.target_id ?? null,
      payload: cleanThreadPayload(r.payload),
      imageUrls,
    }));

    return { requests };
  });

/** Replace the whole section with the given snapshot. */
async function applySnapshot(
  db: Awaited<ReturnType<typeof admin>>,
  section: string,
  entries: EditEntry[],
) {
  const now = new Date().toISOString();

  const { data: current } = await db.from("blocks").select("id").eq("section", section);
  const oldIds = ((current ?? []) as { id: string }[]).map((b) => b.id);
  if (oldIds.length) {
    await db.from("block_images").delete().in("block_id", oldIds);
    const { error: deleteError } = await db.from("blocks").delete().in("id", oldIds);
    if (deleteError) throw new Error("apply_failed");
  }

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index]!;
    const { data: created, error: insertError } = await db
      .from("blocks")
      .insert({ section, slot: index + 1, content: entry.text, updated_at: now })
      .select("id")
      .single();
    if (insertError || !created) throw new Error("apply_failed");

    if (entry.images.length) {
      const { error: imageError } = await db.from("block_images").insert(
        entry.images.map((path, position) => ({
          block_id: created.id as string,
          path,
          position: position + 1,
        })),
      );
      if (imageError) throw new Error("apply_failed");
    }
  }
}

/** Admin: publish a section snapshot straight to the live site. */
export const publishSection = createServerFn({ method: "POST" })
  .inputValidator(
    (data: AdminTokens & { section: string; entries: { text?: string; images?: string[] }[] }) => ({
      ...cleanTokens(data),
      section: cleanSection(data?.section),
      entries: cleanEntries(data?.entries),
    }),
  )
  .handler(async ({ data }) => {
    const { isGateAdmin } = await import("./suggestions.server");
    if (!(await isGateAdmin(data.accessToken, data.visitorToken)))
      throw new Error("forbidden");

    const db = await admin();
    await applySnapshot(db, data.section, data.entries);
    return { ok: true as const };
  });

/** Admin: approve (publish the snapshot) or reject an edit request. */
export const decideEdit = createServerFn({ method: "POST" })
  .inputValidator((data: AdminTokens & { id: string; action: "approve" | "reject" }) => ({
    ...cleanTokens(data),
    id: String(data?.id ?? "").trim(),
    action: data?.action === "approve" ? ("approve" as const) : ("reject" as const),
  }))
  .handler(async ({ data }) => {
    const { isGateAdmin } = await import("./suggestions.server");
    if (!(await isGateAdmin(data.accessToken, data.visitorToken)))
      throw new Error("forbidden");

    const db = await admin();
    const { data: row, error } = await db
      .from("edit_requests")
      .select("id, section, entries, status, target_id, payload, visitor_number")
      .eq("id", data.id)
      .maybeSingle();
    if (error || !row) throw new Error("not_found");
    if (row.status !== "pending") return { ok: true as const };

    const now = new Date().toISOString();

    if (data.action === "reject") {
      await db
        .from("edit_requests")
        .update({ status: "rejected", reviewed_at: now })
        .eq("id", data.id);
      return { ok: true as const };
    }

    if (isThreadSection(String(row.section))) {
      await applyThreadRequest(db, row);
    } else {
      await applySnapshot(db, String(row.section), cleanEntries(row.entries));
    }

    await db
      .from("edit_requests")
      .update({ status: "approved", reviewed_at: now })
      .eq("id", data.id);

    return { ok: true as const };
  });

