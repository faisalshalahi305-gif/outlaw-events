/** Shared types + validation for the public "threads" section. */

export const THREAD_BUCKET = "block-images";

export type ThreadEntry = {
  text: string;
  images: string[];
};

export type ThreadCard = {
  id: string;
  title: string;
  excerpt: string;
  coverPath: string;
  coverUrl: string;
  createdAt: string;
};

export type ThreadFull = ThreadCard & {
  entries: ThreadEntry[];
  imageUrls: Record<string, string>;
};

export function cleanPaths(value: unknown): string[] {
  return (Array.isArray(value) ? value : [])
    .map((p) => String(p ?? "").trim())
    .filter((p) => p.length > 0 && p.length < 400)
    .slice(0, 30);
}

export function cleanThreadEntries(value: unknown): ThreadEntry[] {
  return (Array.isArray(value) ? value : [])
    .slice(0, 100)
    .map((e: any) => ({
      text: String(e?.text ?? "").slice(0, 8000),
      images: cleanPaths(e?.images),
    }))
    .filter((e) => e.text.trim().length > 0 || e.images.length > 0);
}

export function cleanTitle(value: unknown): string {
  const title = String(value ?? "").trim().slice(0, 200);
  if (!title) throw new Error("missing_title");
  return title;
}

export function cleanExcerpt(value: unknown): string {
  const excerpt = String(value ?? "").trim().slice(0, 500);
  if (!excerpt) throw new Error("missing_excerpt");
  return excerpt;
}

export function cleanCover(value: unknown): string {
  const cover = String(value ?? "").trim().slice(0, 400);
  if (!cover) throw new Error("missing_cover");
  return cover;
}
