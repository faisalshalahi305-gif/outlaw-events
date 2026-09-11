import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  ImagePlus,
  Loader2,
  Plus,
  Save,
  Send,
  Trash2,
  X,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { VisitorMenu } from "@/components/VisitorMenu";
import { useVisitorNumber } from "@/lib/use-visitor";
import { loadSection, publishSection, submitEdit } from "@/lib/edits.functions";
import { EDIT_BUCKET, type EditEntry } from "@/lib/edits-shared";
import { readAccessToken, readVisitorToken } from "@/lib/gate-identity";
import logoAsset from "@/assets/outlaw-mark.jpg";

type Row = EditEntry & { key: string };

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

/**
 * One editing surface for a section.
 * mode "submit"  → visitor sends the snapshot for review.
 * mode "publish" → admin saves the snapshot straight to the live site.
 */
export function SectionBoard({
  section,
  title,
  blockLabel,
  mode = "submit",
  backTo,
  backLabel,
}: {
  section: string;
  title: string;
  blockLabel: string;
  mode?: "submit" | "publish";
  backTo?: string;
  backLabel?: string;
}) {
  const publishMode = mode === "publish";
  const visitorNumber = useVisitorNumber();
  const fetchSection = useServerFn(loadSection);
  const sendEdit = useServerFn(submitEdit);
  const publish = useServerFn(publishSection);

  const [rows, setRows] = useState<Row[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);

  const backHref = backTo ?? "/revisions";
  const backText = backLabel ?? "الرجوع للتعديلات";

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    fetchSection({ data: { section } })
      .then((res) => {
        if (cancelled) return;
        setRows(res.entries.map((e) => ({ ...e, key: uid() })));
        setUrls(res.imageUrls);
      })
      .catch(() => {
        if (!cancelled) setLoadError("تعذّر تحميل المحتوى، حاول تحديث الصفحة");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [section, fetchSection]);

  const patch = (key: string, next: (row: Row) => Row) =>
    setRows((list) => list.map((r) => (r.key === key ? next(r) : r)));

  const uploadImages = async (key: string, files: File[]) => {
    for (const file of files) {
      const ext = (file.name.split(".").pop() || "img").toLowerCase();
      const path = `${publishMode ? "live" : "edits"}/${section}/${uid()}.${ext}`;
      const { error } = await supabase.storage.from(EDIT_BUCKET).upload(path, file, {
        contentType: file.type || "application/octet-stream",
        upsert: true,
      });
      if (error) {
        setMessage("تعذّر رفع الصورة");
        setTimeout(() => setMessage(""), 3000);
        return;
      }
      const { data } = await supabase.storage
        .from(EDIT_BUCKET)
        .createSignedUrl(path, 60 * 60 * 6);
      setUrls((prev) => ({ ...prev, [path]: data?.signedUrl ?? "" }));
      patch(key, (r) => ({ ...r, images: [...r.images, path] }));
    }
  };

  const submit = async () => {
    const entries = rows
      .map((r) => ({ text: r.text, images: r.images }))
      .filter((e) => e.text.trim().length > 0 || e.images.length > 0);

    if (!entries.length && !publishMode) {
      setMessage("أضف محتوى قبل الإرسال");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    setSending(true);
    setMessage(publishMode ? "جاري الحفظ…" : "جاري الإرسال…");
    try {
      if (publishMode) {
        await publish({
          data: {
            section,
            entries,
            accessToken: readAccessToken(),
            visitorToken: readVisitorToken(),
          },
        });
        setMessage("تم الحفظ وظهر للزوار ✓");
        setTimeout(() => setMessage(""), 4000);
      } else {
        await sendEdit({ data: { section, note, visitorNumber, entries } });
        setDone(true);
        setMessage("");
      }
    } catch {
      setMessage(publishMode ? "تعذّر الحفظ" : "تعذّر إرسال التعديل، حاول مرة أخرى");
      setTimeout(() => setMessage(""), 4000);
    }
    setSending(false);
  };

  if (done) {
    return (
      <main dir="rtl" className="flex min-h-screen items-center justify-center px-5">
        <div className="surface-card w-full max-w-md rounded-3xl border border-primary/50 p-8 text-center">
          <h1 className="text-xl font-extrabold text-primary">تم إرسال تعديلك ✓</h1>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            {visitorNumber ? `زائر-${visitorNumber}: ` : ""}
            تم استلام تعديلك على «{title}» وسيتم مراجعته وقبوله أو رفضه قريبًا.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <Link
              to="/revisions"
              className="rounded-xl bg-gradient-to-l from-primary to-primary-glow px-6 py-3 text-sm font-bold text-primary-foreground"
            >
              الرجوع للتعديلات
            </Link>
            <Link
              to="/"
              className="rounded-xl border border-input px-6 py-3 text-sm font-bold text-muted-foreground"
            >
              الرجوع للرئيسية
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main dir="rtl" className="relative min-h-screen px-4 pb-56 pt-8">
      <div className="fixed right-4 top-4 z-40">
        <VisitorMenu visitorNumber={visitorNumber} />
      </div>

      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-12 text-center">
          <Link
            to={backHref}
            className="surface-card mb-8 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-bold text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary"
          >
            <ArrowRight className="h-3.5 w-3.5" />
            {backText}
          </Link>
          <p className="wordmark mb-6 text-xl">OUTLAW</p>
          <div className="halo mx-auto mb-5 h-28 w-28 overflow-hidden rounded-full border border-primary/40 glow-ring">
            <img src={logoAsset} alt="شعار Outlaw" className="h-full w-full object-cover" />
          </div>
          <h1 className="bg-gradient-to-l from-primary via-primary-glow to-primary bg-clip-text text-3xl font-extrabold text-transparent">
            {title}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {publishMode
              ? "عدّل النصوص والصور ثم اضغط «حفظ» لتظهر مباشرة للزوار"
              : "عدّل النصوص والصور كما تريدها أن تظهر، ثم اضغط «إرسال» لترسل نسختك للمراجعة"}
          </p>
        </header>

        {loading ? (
          <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            جاري التحميل…
          </p>
        ) : loadError ? (
          <p className="text-center text-sm text-destructive">{loadError}</p>
        ) : (
          <div className="space-y-10">
            {rows.map((row, index) => (
              <EntryCard
                key={row.key}
                row={row}
                index={index}
                label={blockLabel}
                urls={urls}
                onText={(text) => patch(row.key, (r) => ({ ...r, text }))}
                onFiles={(files) => uploadImages(row.key, files)}
                onRemoveImage={(path) =>
                  patch(row.key, (r) => ({
                    ...r,
                    images: r.images.filter((p) => p !== path),
                  }))
                }
                onDelete={() => setRows((list) => list.filter((r) => r.key !== row.key))}
              />
            ))}

            <button
              onClick={() =>
                setRows((list) => [...list, { key: uid(), text: "", images: [] }])
              }
              className="surface-card mx-auto flex w-full max-w-sm items-center justify-center gap-2 rounded-3xl border border-dashed border-primary/50 px-4 py-6 text-sm font-bold text-primary transition-colors hover:bg-accent"
            >
              <Plus className="h-4 w-4" />
              إضافة {blockLabel} جديد
            </button>

            {!publishMode && (
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

      {!loading && !loadError && (
        <div className="fixed inset-x-0 bottom-[7.5rem] z-[60] px-4">
          <div className="surface-card mx-auto flex w-full max-w-2xl items-center justify-between gap-3 rounded-2xl border border-primary/50 bg-background/95 px-4 py-3 shadow-[0_0_24px_-6px_var(--primary)] backdrop-blur">
            <span className="text-xs text-muted-foreground">
              {message ||
                `${rows.length} عنصر ${publishMode ? "جاهز للحفظ" : "جاهز للإرسال"}`}
            </span>
            <button
              onClick={submit}
              disabled={sending}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-l from-primary to-primary-glow px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-[var(--shadow-elegant)] transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : publishMode ? (
                <Save className="h-4 w-4" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {publishMode ? "حفظ" : "إرسال"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function EntryCard({
  row,
  index,
  label,
  urls,
  onText,
  onFiles,
  onRemoveImage,
  onDelete,
}: {
  row: Row;
  index: number;
  label: string;
  urls: Record<string, string>;
  onText: (value: string) => void;
  onFiles: (files: File[]) => void;
  onRemoveImage: (path: string) => void;
  onDelete: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <article className="surface-card rounded-3xl border border-border p-4 text-right">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-extrabold text-primary">
          {label} {index + 1}
        </span>
        <button
          onClick={onDelete}
          className="inline-flex items-center gap-1 rounded-xl border border-input px-3 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:border-destructive/60 hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
          حذف
        </button>
      </div>

      {row.images.length ? (
        <div className="mb-4 space-y-3">
          {row.images.map((path) => (
            <div key={path} className="relative overflow-hidden rounded-2xl border border-border">
              <img
                src={urls[path] ?? ""}
                alt={`${label} ${index + 1}`}
                loading="lazy"
                className="h-auto max-h-[70vh] w-full object-contain"
              />
              <button
                onClick={() => onRemoveImage(path)}
                aria-label="حذف الصورة"
                className="absolute left-2 top-2 rounded-full border border-border bg-background/90 p-1.5 text-muted-foreground transition-colors hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (files.length) onFiles(files);
        }}
      />
      <button
        onClick={() => fileRef.current?.click()}
        className="mb-4 inline-flex items-center gap-2 rounded-xl border border-input px-4 py-2 text-xs font-bold text-primary transition-colors hover:bg-accent"
      >
        <ImagePlus className="h-4 w-4" />
        إضافة صورة
      </button>

      <textarea
        value={row.text}
        onChange={(e) => onText(e.target.value)}
        rows={6}
        placeholder="اكتب النص هنا…"
        className="w-full rounded-2xl border border-border bg-transparent p-4 text-sm leading-7 text-foreground outline-none transition-colors focus:border-primary/60"
      />
    </article>
  );
}
