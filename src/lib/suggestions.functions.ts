import { createServerFn } from "@tanstack/react-start";

const BUCKET = "suggestion-images";

type SubmitInput = {
  name: string;
  title: string;
  body: string;
  images?: string[] | null;
  visitorNumber?: number | null;
};

/** Public: a visitor sends a suggestion with up to 4 images. */
export const submitSuggestion = createServerFn({ method: "POST" })
  .inputValidator((data: SubmitInput) => {
    const name = String(data?.name ?? "").trim();
    const title = String(data?.title ?? "").trim();
    const body = String(data?.body ?? "").trim();
    const images = Array.isArray(data?.images) ? data.images.slice(0, 4) : [];
    if (!name || name.length > 80) throw new Error("invalid_name");
    if (!title || title.length > 120) throw new Error("invalid_title");
    if (!body || body.length > 4000) throw new Error("invalid_body");
    if (images.some((i) => typeof i !== "string" || i.length > 8_000_000)) {
      throw new Error("invalid_image");
    }
    const visitorNumber =
      typeof data?.visitorNumber === "number" && Number.isFinite(data.visitorNumber)
        ? data.visitorNumber
        : null;
    return { name, title, body, images, visitorNumber };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { decodeDataUrl } = await import("./suggestions.server");

    const paths: string[] = [];
    const folder = crypto.randomUUID();

    for (const [index, raw] of data.images.entries()) {
      const { bytes, contentType, ext } = decodeDataUrl(raw);
      const path = `${folder}/${index + 1}.${ext}`;
      const { error } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(path, bytes, { contentType, upsert: false });
      if (error) throw new Error("upload_failed");
      paths.push(path);
    }

    const { error } = await supabaseAdmin.from("suggestions").insert({
      name: data.name,
      title: data.title,
      body: data.body,
      images: paths,
      visitor_number: data.visitorNumber,
    });
    if (error) throw new Error("save_failed");

    return { ok: true as const };
  });

export type SuggestionRow = {
  id: string;
  name: string;
  title: string;
  body: string;
  createdAt: string;
  visitorNumber: number | null;
  images: string[];
};

/** Admin only: full list of suggestions with signed image URLs. */
export const listSuggestions = createServerFn({ method: "POST" })
  .inputValidator((data?: { accessToken?: string | null; visitorToken?: string | null }) => ({
    accessToken: String(data?.accessToken ?? "").trim().slice(0, 200),
    visitorToken: String(data?.visitorToken ?? "").trim().slice(0, 200),
  }))
  .handler(async ({ data }) => {
    const { isGateAdmin } = await import("./suggestions.server");
    const allowed = await isGateAdmin(data.accessToken, data.visitorToken);
    if (!allowed) throw new Error("forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("suggestions")
      .select("id, name, title, body, images, visitor_number, created_at")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw new Error("load_failed");

    const result: SuggestionRow[] = [];
    for (const row of rows ?? []) {
      const paths = (row.images ?? []) as string[];
      const signed = await Promise.all(
        paths.map(async (p) => {
          const { data: s } = await supabaseAdmin.storage
            .from(BUCKET)
            .createSignedUrl(p, 60 * 60 * 6);
          return s?.signedUrl ?? "";
        }),
      );
      result.push({
        id: row.id,
        name: row.name,
        title: row.title,
        body: row.body,
        createdAt: row.created_at,
        visitorNumber: row.visitor_number === null ? null : Number(row.visitor_number),
        images: signed.filter(Boolean),
      });
    }
    return { suggestions: result };
  });
