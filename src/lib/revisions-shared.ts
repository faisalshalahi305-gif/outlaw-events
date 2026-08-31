export type RevisionItem = {
  /** create = new block, update = existing block, delete = remove block */
  op: "create" | "update" | "delete";
  blockId: string;
  slot: number;
  before: string;
  after: string;
  /** storage paths of the published images before the edit */
  beforeImages: string[];
  /** storage paths of the images the visitor wants published */
  images: string[];
};

export type RevisionRow = {
  id: string;
  section: string;
  visitorNumber: number | null;
  status: string;
  note: string | null;
  createdAt: string;
  items: RevisionItem[];
  /** signed URLs keyed by storage path, for previewing images in the panel */
  imageUrls: Record<string, string>;
};

export const REVISION_BUCKET = "block-images";

const SECTIONS = new Set(["characters", "events"]);

export function cleanSection(value: unknown) {
  const section = String(value ?? "").trim();
  if (!SECTIONS.has(section)) throw new Error("invalid_section");
  return section;
}

export function cleanPaths(value: unknown) {
  return (Array.isArray(value) ? value : [])
    .map((p) => String(p ?? "").trim())
    .filter((p) => p && p.length < 400)
    .slice(0, 30);
}

export function sameList(a: string[], b: string[]) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

export function normalizeItems(raw: unknown): RevisionItem[] {
  return (Array.isArray(raw) ? raw : []).map((i: any) => ({
    op: i?.op === "create" || i?.op === "delete" ? i.op : "update",
    blockId: String(i?.blockId ?? ""),
    slot: Number(i?.slot ?? 0) || 0,
    before: String(i?.before ?? ""),
    after: String(i?.after ?? ""),
    beforeImages: cleanPaths(i?.beforeImages),
    images: cleanPaths(i?.images),
  }));
}

export type AdminInput = { accessToken?: string | null; visitorToken?: string | null };

export function cleanTokens(data?: AdminInput) {
  return {
    accessToken: String(data?.accessToken ?? "").trim().slice(0, 200),
    visitorToken: String(data?.visitorToken ?? "").trim().slice(0, 200),
  };
}
