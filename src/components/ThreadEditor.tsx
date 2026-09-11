import { useEffect, useRef, useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, ImagePlus, Loader2, Plus, Save, Trash2, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { VisitorMenu } from "@/components/VisitorMenu";
import { useVisitorNumber } from "@/lib/use-visitor";
import { adminSaveThread, getThread, submitThreadRequest } from "@/lib/threads.functions";
import { readAccessToken, readVisitorToken } from "@/lib/gate-identity";
import { THREAD_BUCKET, type ThreadEntry } from "@/lib/threads-shared";
import logoAsset from "@/assets/outlaw-mark.jpg";

type Row = ThreadEntry & { key: string };

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

/**
 * Thread editing surface. Visitors send their thread to the review queue in the
 * control panel; in admin mode the changes are applied to the thread directly.
 */
export function ThreadEditor({
  threadId,
  adminMode = false,
}: {
  threadId?: string;
  adminMode?: boolean;
}) {
  const router = useRouter();
  const visitorNumber = useVisitorNumber();
  const fetchThread = useServerFn(getThread);
  const sendForReview = useServerFn(submitThreadRequest);
  const saveAsAdmin = useServerFn(adminSaveThread);

  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [coverPath, setCoverPath] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(Boolean(threadId));
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const coverRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!threadId) return;
    let cancelled = false;
    setLoading(true);
    fetchThread({ data: { id: threadId } })
      .then((res) => {
        if (cancelled) return;
        setTitle(res.thread.title);
        setExcerpt(res.thread.excerpt);
        setCoverPath(res.thread.coverPath);
        setUrls(res.thread.imageUrls);
        setRows(res.thread.entries.map((e) => ({ ...e, key: uid() })));
      })
      .catch(() => {
        if (!cancelled) setLoadError("تعذّر تحميل الثريد، حاول تحديث الصفحة");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [threadId, fetchThread]);

  const flash = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(""), 3500);
  };

  const upload = async (file: File): Promise<string | null> => {
    const ext = (file.name.split(".").pop() || "img").toLowerCase();
    const path = `threads/${uid()}.${ext}`;
    const { error } = await supabase.storage.from(THREAD_BUCKET).upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    });
    if (error) {
      flash("تعذّر رفع الصورة");
      return null;
    }
    const { data } = await supabase.storage
      .from(THREAD_BUCKET)
      .createSignedUrl(path, 60 * 60 * 6);
    setUrls((prev) => ({ ...prev, [path]: data?.signedUrl ?? "" }));
    return path;
  };

  const patch = (key: string, next: (row: Row) => Row) =>
    setRows((list) => list.map((r) => (r.key === key ? next(r) : r)));

  const addBlockImages = async (key: string, files: File[]) => {
    for (const file of files) {
      const path = await upload(file);
      if (path) patch(key, (r) => ({ ...r, images: [...r.images, path] }));
    }
  };

  const submit = async () => {
    if (!title.trim() || !excerpt.trim() || !coverPath) {
      flash("العنوان والصورة والنبذة مطلوبة قبل الحفظ");
      return;
    }
    const entries = rows
      .map((r) => ({ text: r.text, images: r.images }))
      .filter((e) => e.text.trim().length > 0 || e.images.length > 0);

    setSaving(true);
    setMessage(adminMode ? "جاري الحفظ…" : "جاري الإرسال…");
    try {
      if (adminMode && threadId) {
        await saveAsAdmin({
          data: {
            accessToken: readAccessToken() ?? "",
            visitorToken: readVisitorToken() ?? "",
            id: threadId,
            title,
            excerpt,
            coverPath,
            entries,
          },
        });
        router.navigate({ to: "/threads/$id", params: { id: threadId } });
        return;
      }

      await sendForReview({
        data: {
          id: threadId ?? null,
          title,
          excerpt,
          coverPath,
          visitorNumber,
          entries,
        },
      });
      setSent(true);
      setSaving(false);
    } catch {
      flash(adminMode ? "تعذّر الحفظ، حاول مرة أخرى" : "تعذّر الإرسال، حاول مرة أخرى");
      setSaving(false);
    }
  };

  return (
    <main dir="rtl" className="relative min-h-screen px-4 pb-40 pt-8">
      <div className="fixed right-4 top-4 z-40">
        <VisitorMenu visitorNumber={visitorNumber} />
      </div>

      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-10 text-center">
          <Link
            to={adminMode ? "/control/revisions" : "/threads"}
            className="surface-card mb-8 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-bold text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary"
          >
            <ArrowRight className="h-3.5 w-3.5" />
            {adminMode ? "الرجوع للتعديلات" : "الرجوع للثريدات"}
          </Link>
          <p className="wordmark mb-6 text-xl">OUTLAW</p>
          <div className="halo mx-auto mb-5 h-24 w-24 overflow-hidden rounded-full border border-primary/40 glow-ring">
            <img src={logoAsset} alt="شعار Outlaw" className="h-full w-full object-cover" />
          </div>
          <h1 className="bg-gradient-to-l from-primary via-primary-glow to-primary bg-clip-text text-3xl font-extrabold text-transparent">
            {adminMode ? "تحرير الثريد" : "إنشاء ثريد"}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {adminMode
              ? "التعديلات هنا تُطبّق على الثريد مباشرة"
              : "العنوان والصورة والنبذة إلزامية، ويُرسل الثريد للمراجعة قبل النشر"}
          </p>
        </header>

        {sent ? (
          <section className="surface-card rounded-3xl border border-primary/50 p-6 text-center">
            <h2 className="text-lg font-extrabold text-primary">تم إرسال الثريد للمراجعة</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              سيظهر الثريد بعد موافقة المشرفين عليه في قسم التعديلات.
            </p>
            <Link
              to="/threads"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-l from-primary to-primary-glow px-6 py-2.5 text-sm font-bold text-primary-foreground"
            >
              الرجوع للثريدات
            </Link>
          </section>
        ) : null}

        {sent ? null : loading ? (
          <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            جاري التحميل…
          </p>
        ) : loadError ? (
          <p className="text-center text-sm text-destructive">{loadError}</p>
        ) : (
          <div className="space-y-8">
            <section className="surface-card space-y-4 rounded-3xl border border-border p-4 text-right">
              <div>
                <label className="mb-2 block text-xs font-extrabold text-primary">
                  عنوان الثريد *
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="اكتب عنوان الثريد"
                  className="w-full rounded-2xl border border-border bg-transparent px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-primary/60"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-extrabold text-primary">
                  صورة الثريد *
                </label>
                {coverPath ? (
                  <div className="relative mb-3 overflow-hidden rounded-2xl border border-border">
                    <img
                      src={urls[coverPath] ?? ""}
                      alt="صورة الثريد"
                      className="h-auto max-h-[50vh] w-full object-cover"
                    />
                    <button
                      onClick={() => setCoverPath("")}
                      aria-label="حذف الصورة"
                      className="absolute left-2 top-2 rounded-full border border-border bg-background/90 p-1.5 text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : null}
                <input
                  ref={coverRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    const path = await upload(file);
                    if (path) setCoverPath(path);
                  }}
                />
                <button
                  onClick={() => coverRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-xl border border-input px-4 py-2 text-xs font-bold text-primary transition-colors hover:bg-accent"
                >
                  <ImagePlus className="h-4 w-4" />
                  {coverPath ? "تغيير الصورة" : "رفع صورة"}
                </button>
              </div>

              <div>
                <label className="mb-2 block text-xs font-extrabold text-primary">
                  نبذة قصيرة *
                </label>
                <textarea
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  rows={3}
                  placeholder="نبذة تظهر في بطاقة الثريد"
                  className="w-full rounded-2xl border border-border bg-transparent p-4 text-sm leading-7 text-foreground outline-none transition-colors focus:border-primary/60"
                />
              </div>
            </section>

            {rows.map((row, index) => (
              <BlockCard
                key={row.key}
                row={row}
                index={index}
                urls={urls}
                onText={(text) => patch(row.key, (r) => ({ ...r, text }))}
                onFiles={(files) => addBlockImages(row.key, files)}
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
              onClick={() => setRows((list) => [...list, { key: uid(), text: "", images: [] }])}
              className="surface-card mx-auto flex w-full max-w-sm items-center justify-center gap-2 rounded-3xl border border-dashed border-primary/50 px-4 py-6 text-sm font-bold text-primary transition-colors hover:bg-accent"
            >
              <Plus className="h-4 w-4" />
              إضافة قسم جديد
            </button>
          </div>
        )}
      </div>

      {!loading && !loadError && !sent && (
        <div className="fixed inset-x-0 bottom-6 z-[60] px-4">
          <div className="surface-card mx-auto flex w-full max-w-2xl items-center justify-between gap-3 rounded-2xl border border-primary/50 bg-background/95 px-4 py-3 shadow-[0_0_24px_-6px_var(--primary)] backdrop-blur">
            <span className="text-xs text-muted-foreground">
              {message ||
                (adminMode
                  ? `${rows.length} قسم — يُحفظ مباشرة`
                  : `${rows.length} قسم — يُرسل للمراجعة`)}
            </span>
            <button
              onClick={submit}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-l from-primary to-primary-glow px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-[var(--shadow-elegant)] transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {adminMode ? "حفظ" : "إرسال للمراجعة"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function BlockCard({
  row,
  index,
  urls,
  onText,
  onFiles,
  onRemoveImage,
  onDelete,
}: {
  row: Row;
  index: number;
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
        <span className="text-sm font-extrabold text-primary">القسم {index + 1}</span>
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
                alt={`القسم ${index + 1}`}
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
        placeholder="اكتب النص هنا… (عناوين، فقرات، جداول نصية)"
        className="w-full rounded-2xl border border-border bg-transparent p-4 text-sm leading-7 text-foreground outline-none transition-colors focus:border-primary/60"
      />
    </article>
  );
}
