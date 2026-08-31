import { createServerFn } from "@tanstack/react-start";

import {
  cleanPaths,
  cleanSection,
  cleanTokens,
  normalizeItems,
  sameList,
  REVISION_BUCKET as BUCKET,
  type AdminInput,
  type RevisionItem,
  type RevisionRow,
} from "./revisions-shared";

export type { RevisionItem, RevisionRow } from "./revisions-shared";

/** Public: current live content of a section, used to prefill the edit form. */
export const getSectionDraft = createServerFn({ method: "POST" })
  .inputValidator((data: { section: string }) => ({ section: cleanSection(data?.section) }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("blocks")
      .select("id, slot, content")
      .eq("section", data.section)
      .order("slot");
    if (error) throw new Error("load_failed");
    return {
      blocks: (rows ?? []).map((b) => ({
        id: b.id as string,
        slot: b.slot as number,
        content: (b.content as string) ?? "",
      })),
    };
  });

/** Public: send an edited copy to the secret control panel for review. */
export const submitRevision = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      section: string;
      note?: string | null;
      visitorNumber?: number | null;
      items: {
        op?: string;
        blockId?: string;
        slot: number;
        before?: string;
        after?: string;
        beforeImages?: string[];
        images?: string[];
      }[];
    }) => {
      const section = cleanSection(data?.section);
      const note = String(data?.note ?? "").trim().slice(0, 500);
      const visitorNumber =
        typeof data?.visitorNumber === "number" && Number.isFinite(data.visitorNumber)
          ? data.visitorNumber
          : null;
      const items: RevisionItem[] = (Array.isArray(data?.items) ? data.items : [])
        .map((i) => {
          const op =
            i?.op === "create" || i?.op === "delete"
              ? (i.op as RevisionItem["op"])
              : ("update" as const);
          return {
            op,
            blockId: String(i?.blockId ?? ""),
            slot: Number(i?.slot ?? 0) || 0,
            before: String(i?.before ?? "").slice(0, 8000),
            after: String(i?.after ?? "").slice(0, 8000),
            beforeImages: cleanPaths(i?.beforeImages),
            images: cleanPaths(i?.images),
          };
        })
        .filter((i) => {
          if (i.op === "create") return Boolean(i.after || i.images.length);
          if (!i.blockId) return false;
          if (i.op === "delete") return true;
          return i.before !== i.after || !sameList(i.beforeImages, i.images);
        });
      if (!items.length) throw new Error("no_changes");
      if (items.length > 100) throw new Error("too_many");
      return { section, note, visitorNumber, items };
    },
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("revisions").insert({
      section: data.section,
      note: data.note || null,
      visitor_number: data.visitorNumber,
      items: data.items,
    });
    if (error) throw new Error("save_failed");
    return { ok: true as const };
  });

/** Admin only: pending + reviewed revisions, newest first. */
export const listRevisions = createServerFn({ method: "POST" })
  .inputValidator((data?: AdminInput) => cleanTokens(data))
  .handler(async ({ data }) => {
    const { isGateAdmin } = await import("./suggestions.server");
    if (!(await isGateAdmin(data.accessToken, data.visitorToken)))
      throw new Error("forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("revisions")
      .select("id, section, visitor_number, status, note, items, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error("load_failed");

    const revisions: RevisionRow[] = [];
    for (const r of (rows ?? []) as any[]) {
      const items = normalizeItems(r.items);
      const paths = Array.from(
        new Set(items.flatMap((i) => [...i.beforeImages, ...i.images])),
      );
      const imageUrls: Record<string, string> = {};
      await Promise.all(
        paths.map(async (p) => {
          const { data: signed } = await supabaseAdmin.storage
            .from(BUCKET)
            .createSignedUrl(p, 60 * 60 * 6);
          if (signed?.signedUrl) imageUrls[p] = signed.signedUrl;
        }),
      );
      revisions.push({
        id: r.id,
        section: r.section,
        visitorNumber: r.visitor_number,
        status: r.status,
        note: r.note,
        createdAt: r.created_at,
        items,
        imageUrls,
      });
    }
    return { revisions };
  });

/** Admin only: approve a revision and apply it to the live site. */
export const approveRevision = createServerFn({ method: "POST" })
  .inputValidator((data: AdminInput & { id: string }) => ({
    ...cleanTokens(data),
    id: String(data?.id ?? "").trim(),
  }))
  .handler(async ({ data }) => {
    const { isGateAdmin } = await import("./suggestions.server");
    if (!(await isGateAdmin(data.accessToken, data.visitorToken)))
      throw new Error("forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("revisions")
      .select("id, section, items, status")
      .eq("id", data.id)
      .maybeSingle();
    if (error || !row) throw new Error("not_found");
    if (row.status !== "pending") return { ok: true as const };

    const section = String(row.section);
    const items = normalizeItems(row.items);
    const now = new Date().toISOString();

    /** Make block_images rows for a block match the given ordered paths. */
    const syncImages = async (blockId: string, paths: string[]) => {
      const { data: existing } = await supabaseAdmin
        .from("block_images")
        .select("id, path")
        .eq("block_id", blockId);
      const rows = (existing ?? []) as { id: string; path: string }[];

      const removed = rows.filter((r) => !paths.includes(r.path));
      if (removed.length) {
        await supabaseAdmin
          .from("block_images")
          .delete()
          .in(
            "id",
            removed.map((r) => r.id),
          );
        await supabaseAdmin.storage.from(BUCKET).remove(removed.map((r) => r.path));
      }

      for (let index = 0; index < paths.length; index += 1) {
        const path = paths[index]!;
        const match = rows.find((r) => r.path === path);
        if (match) {
          await supabaseAdmin
            .from("block_images")
            .update({ position: index + 1, updated_at: now })
            .eq("id", match.id);
        } else {
          const { error: insertError } = await supabaseAdmin
            .from("block_images")
            .insert({ block_id: blockId, path, position: index + 1 });
          if (insertError) throw new Error("apply_failed");
        }
      }
    };

    // Highest slot currently used in the section, for newly created blocks.
    const { data: slotRows } = await supabaseAdmin
      .from("blocks")
      .select("slot")
      .eq("section", section)
      .order("slot", { ascending: false })
      .limit(1);
    let nextSlot = ((slotRows?.[0]?.slot as number | undefined) ?? 0) + 1;

    for (const item of items) {
      if (item.op === "delete") {
        const { data: imgs } = await supabaseAdmin
          .from("block_images")
          .select("path")
          .eq("block_id", item.blockId);
        const { error: deleteError } = await supabaseAdmin
          .from("blocks")
          .delete()
          .eq("id", item.blockId);
        if (deleteError) throw new Error("apply_failed");
        const paths = ((imgs ?? []) as { path: string }[]).map((i) => i.path);
        if (paths.length) await supabaseAdmin.storage.from(BUCKET).remove(paths);
        continue;
      }

      if (item.op === "create") {
        const { data: created, error: insertError } = await supabaseAdmin
          .from("blocks")
          .insert({ section, slot: nextSlot, content: item.after })
          .select("id")
          .single();
        if (insertError || !created) throw new Error("apply_failed");
        nextSlot += 1;
        await syncImages(created.id as string, item.images);
        continue;
      }

      const { error: updateError } = await supabaseAdmin
        .from("blocks")
        .update({ content: item.after, updated_at: now })
        .eq("id", item.blockId);
      if (updateError) throw new Error("apply_failed");
      await syncImages(item.blockId, item.images);
    }

    await supabaseAdmin
      .from("revisions")
      .update({ status: "approved", reviewed_at: now })
      .eq("id", data.id);

    return { ok: true as const };
  });

/** Admin only: reject a revision without touching the live site. */
export const rejectRevision = createServerFn({ method: "POST" })
  .inputValidator((data: AdminInput & { id: string }) => ({
    ...cleanTokens(data),
    id: String(data?.id ?? "").trim(),
  }))
  .handler(async ({ data }) => {
    const { isGateAdmin } = await import("./suggestions.server");
    if (!(await isGateAdmin(data.accessToken, data.visitorToken)))
      throw new Error("forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("revisions")
      .update({ status: "rejected", reviewed_at: new Date().toISOString() })
      .eq("id", data.id);
    return { ok: true as const };
  });
