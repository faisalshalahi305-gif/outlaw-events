/**
 * Shared types + validation for the edit-request system.
 * An edit request is a FULL snapshot of a section the visitor wants published.
 */

export const EDIT_BUCKET = "block-images";

export type EditEntry = {
  /** text of one block/table */
  text: string;
  /** ordered storage paths of the images of that block */
  images: string[];
};

/** Extra fields carried by a thread request (title / excerpt / cover image). */
export type ThreadPayload = { title: string; excerpt: string; coverPath: string };

export type EditRequest = {
  id: string;
  section: string;
  visitorNumber: number | null;
  note: string | null;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  reviewedAt: string | null;
  entries: EditEntry[];
  /** thread requests only: the thread being updated/deleted */
  targetId: string | null;
  /** thread requests only: title, excerpt and cover path */
  payload: ThreadPayload | null;
  /** signed preview URLs keyed by storage path */
  imageUrls: Record<string, string>;
};

const SECTIONS = new Set(["characters", "events"]);

export const THREAD_SECTIONS = ["thread_create", "thread_update", "thread_delete"] as const;

export function isThreadSection(section: string): boolean {
  return (THREAD_SECTIONS as readonly string[]).includes(section);
}

export function cleanThreadPayload(value: unknown): ThreadPayload | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  return {
    title: String(raw.title ?? "").slice(0, 200),
    excerpt: String(raw.excerpt ?? "").slice(0, 500),
    coverPath: String(raw.coverPath ?? "").slice(0, 400),
  };
}

export function cleanSection(value: unknown): string {
  const section = String(value ?? "").trim();
  if (!SECTIONS.has(section)) throw new Error("invalid_section");
  return section;
}

export function cleanPaths(value: unknown): string[] {
  return (Array.isArray(value) ? value : [])
    .map((p) => String(p ?? "").trim())
    .filter((p) => p.length > 0 && p.length < 400)
    .slice(0, 30);
}

export function cleanEntries(value: unknown): EditEntry[] {
  return (Array.isArray(value) ? value : [])
    .slice(0, 100)
    .map((e: any) => ({
      text: String(e?.text ?? "").slice(0, 8000),
      images: cleanPaths(e?.images),
    }))
    .filter((e) => e.text.trim().length > 0 || e.images.length > 0);
}

export function sameEntries(a: EditEntry[], b: EditEntry[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((entry, i) => {
    const other = b[i]!;
    return (
      entry.text === other.text &&
      entry.images.length === other.images.length &&
      entry.images.every((p, j) => p === other.images[j])
    );
  });
}

export type AdminTokens = { accessToken?: string | null; visitorToken?: string | null };

export function cleanTokens(data?: AdminTokens) {
  return {
    accessToken: String(data?.accessToken ?? "").trim().slice(0, 200),
    visitorToken: String(data?.visitorToken ?? "").trim().slice(0, 200),
  };
}
