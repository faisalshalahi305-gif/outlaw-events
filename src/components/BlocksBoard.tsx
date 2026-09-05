import { useEffect, useMemo, useRef, useState } from "react";
import {
  ImagePlus,
  Save,
  Send,
  ArrowRight,
  Trash2,
  Plus,
  RefreshCw,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { VisitorMenu } from "@/components/VisitorMenu";
import { useVisitorNumber } from "@/lib/use-visitor";
import { submitRevision } from "@/lib/revisions.functions";
import logoAsset from "@/assets/outlaw-mark.jpg";

type BlockImage = {
  id: string;
  path: string;
  position: number;
};

type Block = {
  id: string;
  slot: number;
  content: string;
  image_url: string | null;
  images: BlockImage[];
};

const BUCKET = "block-images";

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export function BlocksBoard({
  section,
  title,
  subtitle,
  blockLabel,
  admin = false,
  mode = "live",
  backTo = "/",
  backLabel = "الرجوع للرئيسية",
}: {
  section: string;
  title: string;
  subtitle: string;
  blockLabel: string;
  admin?: boolean;
  /** "live" = admin control panel (saves directly). "submit" = same page, but sends a revision for review. */
  mode?: "live" | "submit";
  backTo?: string;
  backLabel?: string;
}) {
  const submitMode = mode === "submit";
  const visitorNumber = useVisitorNumber();
  const sendRevision = useServerFn(submitRevision);

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [original, setOriginal] = useState<Block[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [adding, setAdding] = useState(false);
  const [note, setNote] = useState("");

  const editable = admin || submitMode;

  const signUrls = async (rows: Block[]) => {
    const paths = Array.from(
      new Set(rows.flatMap((b) => b.images.map((i) => i.path)).filter(Boolean)),
    );
    const entries = await Promise.all(
      paths.map(async (p) => {
        const { data } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(p, 60 * 60 * 24 * 365);
        return [p, data?.signedUrl ?? ""] as const;
      }),
    );
    setUrls((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
  };

  const load = async () => {
    const [{ data }] = await Promise.all([
      supabase
        .from("blocks")
        .select("id, slot, content, image_url, block_images(id, path, position)")
        .eq("section", section)
        .order("slot"),
    ]);
    const rows = ((data ?? []) as any[]).map((b) => ({
      id: b.id as string,
      slot: b.slot as number,
      content: b.content as string,
      image_url: b.image_url as string | null,
      images: ((b.block_images ?? []) as BlockImage[])
        .slice()
        .sort((x, y) => x.position - y.position),
    })) as Block[];
    setBlocks(rows);
    setOriginal(rows);
    await signUrls(rows);
    setLoading(false);
  };

  useEffect(() => {
    load();
    if (submitMode) return;
    const channel = supabase
      .channel(`outlaw-live-${section}-${admin ? "admin" : "public"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "blocks" }, () =>
        load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "block_images" },
        () => load(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  /** Upload a file to storage and return its path (staged files live under a separate prefix). */
  const uploadFile = async (file: File, slot: number) => {
    const ext = (file.name.split(".").pop() || "img").toLowerCase();
    const path = submitMode
      ? `revisions/${section}/${uid()}.${ext}`
      : `${slot}/${uid()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    });
    if (error) return null;
    const { data } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 60 * 60 * 24 * 365);
    setUrls((prev) => ({ ...prev, [path]: data?.signedUrl ?? "" }));
    return path;
  };

  const patchBlock = (id: string, patch: (b: Block) => Block) =>
    setBlocks((rows) => rows.map((b) => (b.id === id ? patch(b) : b)));

  const addBlock = async () => {
    const nextSlot = blocks.length ? Math.max(...blocks.map((b) => b.slot)) + 1 : 1;
    if (submitMode) {
      const id = `new-${uid()}`;
      setBlocks((rows) => [
        ...rows,
        { id, slot: nextSlot, content: "", image_url: null, images: [] },
      ]);
      setDrafts((d) => ({ ...d, [id]: "" }));
      return;
    }
    setAdding(true);
    const { error } = await supabase
      .from("blocks")
      .insert({ section, slot: nextSlot, content: "" });
    setAdding(false);
    if (!error) await load();
  };

  const deleteBlock = async (block: Block) => {
    if (submitMode) {
      setBlocks((rows) => rows.filter((b) => b.id !== block.id));
      setDrafts((d) => {
        const next = { ...d };
        delete next[block.id];
        return next;
      });
      return;
    }
    const paths = block.images.map((i) => i.path);
    const { error } = await supabase.from("blocks").delete().eq("id", block.id);
    if (error) return;
    if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
    setDrafts((d) => {
      const next = { ...d };
      delete next[block.id];
      return next;
    });
    await load();
  };

  const addImages = async (block: Block, files: File[]) => {
    let position = block.images.length;
    for (const file of files) {
      const path = await uploadFile(file, block.slot);
      if (!path) return "تعذّر رفع الصورة";
      position += 1;
      if (submitMode) {
        const image = { id: `tmp-${uid()}`, path, position };
        patchBlock(block.id, (b) => ({ ...b, images: [...b.images, image] }));
      } else {
        const { error } = await supabase
          .from("block_images")
          .insert({ block_id: block.id, path, position });
        if (error) return "تعذّر الحفظ";
      }
    }
    if (!submitMode) await load();
    return null;
  };

  const replaceImage = async (block: Block, image: BlockImage, file: File) => {
    const path = await uploadFile(file, block.slot);
    if (!path) return "تعذّر رفع الصورة";
    if (submitMode) {
      patchBlock(block.id, (b) => ({
        ...b,
        images: b.images.map((i) => (i.id === image.id ? { ...i, path } : i)),
      }));
      return null;
    }
    const { error } = await supabase
      .from("block_images")
      .update({ path, updated_at: new Date().toISOString() })
      .eq("id", image.id);
    if (error) return "تعذّر الحفظ";
    await supabase.storage.from(BUCKET).remove([image.path]);
    await load();
    return null;
  };

  const removeImage = async (block: Block, image: BlockImage) => {
    if (submitMode) {
      patchBlock(block.id, (b) => ({
        ...b,
        images: b.images
          .filter((i) => i.id !== image.id)
          .map((i, idx) => ({ ...i, position: idx + 1 })),
      }));
      return null;
    }
    const { error } = await supabase.from("block_images").delete().eq("id", image.id);
    if (error) return "تعذّر الحذف";
    await supabase.storage.from(BUCKET).remove([image.path]);
    const rest = block.images.filter((i) => i.id !== image.id);
    await Promise.all(
      rest.map((img, idx) =>
        supabase.from("block_images").update({ position: idx + 1 }).eq("id", img.id),
      ),
    );
    await load();
    return null;
  };

  const clearText = async (block: Block) => {
    setDrafts((d) => ({ ...d, [block.id]: "" }));
    if (submitMode) {
      patchBlock(block.id, (b) => ({ ...b, content: b.content }));
      return null;
    }
    const { error } = await supabase
      .from("blocks")
      .update({ content: "", updated_at: new Date().toISOString() })
      .eq("id", block.id);
    if (error) return "تعذّر الحذف";
    await load();
    return null;
  };

  /** Everything the visitor changed compared to the published version. */
  const revisionItems = useMemo(() => {
    if (!submitMode) return [];
    const items: {
      op: "create" | "update" | "delete";
      blockId: string;
      slot: number;
      before: string;
      after: string;
      beforeImages: string[];
      images: string[];
    }[] = [];

    for (const block of blocks) {
      const src = original.find((o) => o.id === block.id);
      const after = drafts[block.id] ?? block.content;
      const images = block.images.map((i) => i.path);
      if (!src) {
        items.push({
          op: "create",
          blockId: "",
          slot: block.slot,
          before: "",
          after,
          beforeImages: [],
          images,
        });
        continue;
      }
      const beforeImages = src.images.map((i) => i.path);
      const changed =
        after !== src.content ||
        images.length !== beforeImages.length ||
        images.some((p, i) => p !== beforeImages[i]);
      if (changed) {
        items.push({
          op: "update",
          blockId: block.id,
          slot: block.slot,
          before: src.content,
          after,
          beforeImages,
          images,
        });
      }
    }

    for (const src of original) {
      if (!blocks.some((b) => b.id === src.id)) {
        items.push({
          op: "delete",
          blockId: src.id,
          slot: src.slot,
          before: src.content,
          after: "",
          beforeImages: src.images.map((i) => i.path),
          images: [],
        });
      }
    }

    return items;
  }, [submitMode, blocks, original, drafts]);

  const saveAll = async () => {
    if (submitMode) {
      if (!revisionItems.length) {
        setSaveMsg("لم تقم بأي تعديل بعد");
        setTimeout(() => setSaveMsg(""), 3000);
        return;
      }
      setSaving(true);
      setSaveMsg("جاري الإرسال…");
      try {
        await sendRevision({
          data: { section, note, visitorNumber, items: revisionItems },
        });
        setSaveMsg("تم إرسال التعديلات للمراجعة ✓");
      } catch {
        setSaveMsg("تعذّر إرسال التعديلات");
      }
      setSaving(false);
      setTimeout(() => setSaveMsg(""), 5000);
      return;
    }

    setSaving(true);
    setSaveMsg("جاري الحفظ…");
    const entries = Object.entries(drafts).filter(
      ([id, value]) => blocks.find((b) => b.id === id)?.content !== value,
    );
    const results = await Promise.all(
      entries.map(([id, value]) =>
        supabase
          .from("blocks")
          .update({ content: value, updated_at: new Date().toISOString() })
          .eq("id", id),
      ),
    );
    const failed = results.some((r) => r.error);
    setSaving(false);
    setSaveMsg(failed ? "تعذّر حفظ بعض التعديلات" : "تم الحفظ وظهر للزوار ✓");
    await load();
    setTimeout(() => setSaveMsg(""), 3000);
  };

  return (
    <main dir="rtl" className="relative min-h-screen px-4 pb-56 pt-8">
      <div className="fixed right-4 top-4 z-40">
        <VisitorMenu visitorNumber={visitorNumber} />
      </div>

      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-12 text-center">
          <Link
            to={backTo}
            className="surface-card mb-8 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-bold text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary"
          >
            <ArrowRight className="h-3.5 w-3.5" />
            {backLabel}
          </Link>
          <p className="wordmark mb-6 text-xl">OUTLAW</p>
          <div className="halo mx-auto mb-5 h-28 w-28 overflow-hidden rounded-full border border-primary/40 glow-ring">
            <img
              src={logoAsset}
              alt="شعار Outlaw"
              className="h-full w-full object-cover"
            />
          </div>
          <h1 className="bg-gradient-to-l from-primary via-primary-glow to-primary bg-clip-text text-3xl font-extrabold tracking-tight text-transparent rise-in">
            {title}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">{subtitle}</p>
          <div className="ornament-diamond mt-6 text-[10px] tracking-[0.4em] text-muted-foreground/70">
            OUTLAW
          </div>
        </header>

        {loading ? (
          <p className="text-center text-sm text-muted-foreground">جاري التحميل…</p>
        ) : (
          <div className="space-y-12">
            {blocks.map((block, index) => (
              <EventBlock
                key={block.id}
                block={block}
                index={index}
                label={blockLabel}
                editable={editable}
                urls={urls}
                draft={drafts[block.id] ?? block.content}
                onDraft={(value) =>
                  setDrafts((d) => ({ ...d, [block.id]: value }))
                }
                onDelete={() => deleteBlock(block)}
                onAddImages={(files) => addImages(block, files)}
                onReplaceImage={(image, file) => replaceImage(block, image, file)}
                onRemoveImage={(image) => removeImage(block, image)}
                onClearText={() => clearText(block)}
              />
            ))}

            {editable && (
              <button
                onClick={addBlock}
                disabled={adding}
                className="surface-card mx-auto flex w-full max-w-sm items-center justify-center gap-2 rounded-3xl border border-dashed border-primary/50 px-4 py-6 text-sm font-bold text-primary transition-colors hover:bg-accent disabled:opacity-60"
              >
                <Plus className="h-4 w-4" />
                {adding ? "جاري الإنشاء…" : "إنشاء جدول جديد"}
              </button>
            )}

            {editable && submitMode && (
              <section className="space-y-3">
                <h2 className="text-sm font-bold tracking-wide text-primary">
                  ملاحظة للمراجعة (اختياري)
                </h2>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="سبب التعديل أو أي توضيح للمسؤول"
                  className="surface-card w-full rounded-2xl border border-border bg-transparent p-4 text-sm leading-7 text-foreground outline-none transition-colors focus:border-primary/60"
                />
              </section>
            )}
          </div>
        )}
      </div>

      {editable && !loading && (
        <div className="fixed inset-x-0 bottom-[7.5rem] z-[60] px-4">
          <div className="surface-card mx-auto flex w-full max-w-2xl items-center justify-between gap-3 rounded-2xl border border-primary/50 bg-background/95 px-4 py-3 shadow-[0_0_24px_-6px_var(--primary)] backdrop-blur">

            <span className="text-xs text-muted-foreground">
              {saveMsg ||
                (submitMode ? `${revisionItems.length} تعديل جاهز للإرسال` : "")}
            </span>
            <button
              onClick={saveAll}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-l from-primary to-primary-glow px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-[var(--shadow-elegant)] transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {saving ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : submitMode ? (
                <Send className="h-4 w-4" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {submitMode ? "إرسال" : "حفظ"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function EventBlock({
  block,
  index,
  label,
  urls,
  editable,
  draft,
  onDraft,
  onDelete,
  onAddImages,
  onReplaceImage,
  onRemoveImage,
  onClearText,
}: {
  block: Block;
  index: number;
  label: string;
  urls: Record<string, string>;
  editable: boolean;
  draft: string;
  onDraft: (value: string) => void;
  onDelete: () => void;
  onAddImages: (files: File[]) => Promise<string | null>;
  onReplaceImage: (image: BlockImage, file: File) => Promise<string | null>;
  onRemoveImage: (image: BlockImage) => Promise<string | null>;
  onClearText: () => Promise<string | null>;
}) {
  const [status, setStatus] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [active, setActive] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (active > block.images.length - 1)
      setActive(Math.max(0, block.images.length - 1));
  }, [block.images.length, active]);

  const flash = (text: string) => {
    setStatus(text);
    setTimeout(() => setStatus(""), 2500);
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    setStatus("جاري رفع الصور…");
    const error = await onAddImages(files);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    if (error) return flash(error);
    setActive(block.images.length + files.length - 1);
    flash("تم حفظ الصور ✓");
  };

  const onReplace = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const current = block.images[active];
    if (!file || !current) return;
    setUploading(true);
    setStatus("جاري تغيير الصورة…");
    const error = await onReplaceImage(current, file);
    setUploading(false);
    if (replaceRef.current) replaceRef.current.value = "";
    flash(error ?? "تم تغيير الصورة ✓");
  };

  const removeImage = async (image: BlockImage) => {
    setStatus("جاري الحذف…");
    const error = await onRemoveImage(image);
    if (error) return flash(error);
    setActive((a) => Math.max(0, Math.min(a, block.images.length - 2)));
    flash("تم حذف الصورة ✓");
  };

  const clearText = async () => {
    onDraft("");
    setStatus("جاري حذف النص…");
    const error = await onClearText();
    flash(error ?? "تم حذف النص ✓");
  };

  const current = block.images[active];
  const currentUrl = current ? urls[current.path] : undefined;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold tracking-wide text-primary">{label}</h2>
        <div className="flex items-center gap-2">
          {editable && (
            <button
              onClick={() => setConfirmDelete(true)}
              aria-label="حذف الجدول"
              className="flex h-8 items-center gap-1 rounded-full border border-border px-3 text-xs font-bold text-muted-foreground transition-colors hover:border-destructive/60 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              حذف الجدول
            </button>
          )}
          <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
            {index + 1}
          </span>
        </div>
      </div>

      {confirmDelete && (
        <div className="surface-card rounded-2xl border border-destructive/40 p-4 text-right">
          <p className="text-sm text-foreground">
            سيتم حذف هذا الجدول بكل صوره ونصه نهائياً. هل أنت متأكد؟
          </p>
          <div className="mt-3 flex gap-3">
            <button
              onClick={onDelete}
              className="flex-1 rounded-xl border border-destructive/60 px-4 py-2 text-sm font-bold text-destructive transition-colors hover:bg-destructive/10"
            >
              نعم، احذف
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="flex-1 rounded-xl border border-input px-4 py-2 text-sm font-bold text-foreground transition-colors hover:bg-accent"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {block.images.length > 0 && (
        <div className="mx-auto flex max-w-sm flex-wrap items-center justify-center gap-2">
          {block.images.map((img, idx) => (
            <button
              key={img.id}
              onClick={() => setActive(idx)}
              aria-label={`صورة رقم ${idx + 1}`}
              className={`h-9 min-w-9 rounded-xl border px-3 text-sm font-bold transition-all ${
                idx === active
                  ? "border-primary/70 bg-gradient-to-l from-primary to-primary-glow text-primary-foreground"
                  : "border-border text-muted-foreground hover:border-primary/60 hover:text-primary"
              }`}
            >
              {idx + 1}
            </button>
          ))}
        </div>
      )}

      <div className="surface-card mx-auto w-full max-w-md overflow-hidden rounded-3xl border border-border p-1.5">
        <div className="relative w-full overflow-hidden rounded-[1.35rem] bg-secondary/40">
          {currentUrl ? (
            <>
              <img
                src={currentUrl}
                alt={`${label} رقم ${index + 1} — صورة ${active + 1}`}
                loading="lazy"
                className="w-full object-contain"
              />
              {editable && current && (
                <div className="absolute left-3 top-3 flex gap-2">
                  <button
                    onClick={() => removeImage(current)}
                    aria-label="حذف الصورة"
                    className="surface-card flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-destructive/60 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <label
                    aria-label="تغيير الصورة"
                    className="surface-card flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-primary/60 hover:text-primary"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <input
                      ref={replaceRef}
                      type="file"
                      accept="image/*,.heic,.heif,.avif,.svg,.tiff,.bmp"
                      className="hidden"
                      onChange={onReplace}
                    />
                  </label>
                </div>
              )}
            </>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
              <ImagePlus className="h-6 w-6 text-primary/70" />
              لا توجد صورة بعد
            </div>
          )}
        </div>
      </div>

      {editable && (
        <div className="mx-auto flex max-w-sm items-center justify-center">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-l from-primary to-primary-glow px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-[var(--shadow-elegant)] transition-opacity hover:opacity-90">
            <ImagePlus className="h-4 w-4" />
            {uploading ? "جاري الرفع…" : "إضافة صور"}

            <input
              ref={fileRef}
              type="file"
              accept="image/*,.heic,.heif,.avif,.svg,.tiff,.bmp"
              className="hidden"
              multiple
              onChange={onFile}
            />
          </label>
        </div>
      )}

      <div className="surface-card rounded-3xl border border-border p-5">
        {!editable ? (
          <p className="min-h-16 whitespace-pre-wrap text-sm leading-7 text-foreground">
            {block.content || (
              <span className="text-muted-foreground">لا يوجد نص</span>
            )}
          </p>
        ) : (
          <>
            <textarea
              value={draft}
              onChange={(e) => onDraft(e.target.value)}
              placeholder="اكتب التفاصيل هنا…"
              rows={4}
              className="w-full resize-none bg-transparent text-sm leading-7 text-foreground outline-none placeholder:text-muted-foreground"
            />
            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={clearText}
                className="inline-flex items-center gap-2 rounded-xl border border-input px-4 py-2 text-sm font-bold text-foreground transition-colors hover:border-destructive/60 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                حذف النص
              </button>
              <span className="text-xs text-muted-foreground">{status}</span>
            </div>
          </>
        )}
      </div>

      <div className="ornament-line mx-auto w-full max-w-sm" />
    </section>
  );
}
