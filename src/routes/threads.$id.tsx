import { useEffect, useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Loader2 } from "lucide-react";

import { VisitorMenu } from "@/components/VisitorMenu";
import { useVisitorNumber } from "@/lib/use-visitor";
import { getThread } from "@/lib/threads.functions";
import type { ThreadFull } from "@/lib/threads-shared";
import logoAsset from "@/assets/outlaw-mark.jpg";

export const Route = createFileRoute("/threads/$id")({
  head: () => ({
    meta: [
      { title: "ثريد | OUTLAW" },
      {
        name: "description",
        content: "اقرأ محتوى الثريد كاملًا: النصوص والصور كما نشرها صاحب الثريد في موقع أوت لاو.",
      },
      { property: "og:title", content: "ثريد | OUTLAW" },
      { property: "og:description", content: "اقرأ محتوى الثريد كاملًا في موقع أوت لاو." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ThreadPage,
});

function ThreadPage() {
  const { id } = useParams({ from: "/threads/$id" });
  const visitorNumber = useVisitorNumber();
  const fetchThread = useServerFn(getThread);

  const [thread, setThread] = useState<ThreadFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchThread({ data: { id } })
      .then((res) => {
        if (!cancelled) setThread(res.thread);
      })
      .catch(() => {
        if (!cancelled) setError("تعذّر تحميل الثريد، حاول تحديث الصفحة");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, fetchThread]);

  return (
    <main dir="rtl" className="relative min-h-screen px-4 pb-24 pt-8">
      <div className="fixed right-4 top-4 z-40">
        <VisitorMenu visitorNumber={visitorNumber} />
      </div>

      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-12 text-center">
          <Link
            to="/threads"
            className="surface-card mb-8 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-bold text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary"
          >
            <ArrowRight className="h-3.5 w-3.5" />
            الرجوع للثريدات
          </Link>
          <p className="wordmark mb-6 text-xl">OUTLAW</p>
          <div className="halo mx-auto mb-5 h-28 w-28 overflow-hidden rounded-full border border-primary/40 glow-ring">
            <img src={logoAsset} alt="شعار Outlaw" className="h-full w-full object-cover" />
          </div>
          <h1 className="bg-gradient-to-l from-primary via-primary-glow to-primary bg-clip-text text-3xl font-extrabold tracking-tight text-transparent rise-in">
            {thread?.title ?? "الثريد"}
          </h1>
          {thread?.excerpt ? (
            <p className="mt-3 text-sm text-muted-foreground">{thread.excerpt}</p>
          ) : null}
          <div className="ornament-diamond mt-6 text-[10px] tracking-[0.4em] text-muted-foreground/70">
            OUTLAW
          </div>
        </header>

        {loading ? (
          <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            جاري التحميل…
          </p>
        ) : error || !thread ? (
          <p className="text-center text-sm text-destructive">
            {error || "الثريد غير موجود."}
          </p>
        ) : (
          <div className="space-y-12">
            {thread.coverUrl ? (
              <div className="overflow-hidden rounded-3xl border border-border">
                <img
                  src={thread.coverUrl}
                  alt={thread.title}
                  className="h-auto max-h-[70vh] w-full object-cover"
                />
              </div>
            ) : null}

            {thread.entries.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground">لا يوجد محتوى بعد.</p>
            ) : (
              thread.entries.map((entry, index) => (
                <article
                  key={index}
                  className="surface-card rounded-3xl border border-border p-4 text-right"
                >
                  <h2 className="mb-4 text-sm font-extrabold text-primary">القسم {index + 1}</h2>
                  {entry.images.map((path) => (
                    <div
                      key={path}
                      className="mb-3 overflow-hidden rounded-2xl border border-border"
                    >
                      <img
                        src={thread.imageUrls[path] ?? ""}
                        alt={`${thread.title} ${index + 1}`}
                        loading="lazy"
                        className="h-auto max-h-[75vh] w-full object-contain"
                      />
                    </div>
                  ))}
                  {entry.text.trim() ? (
                    <p className="whitespace-pre-wrap text-sm leading-8 text-foreground">
                      {entry.text}
                    </p>
                  ) : null}
                </article>
              ))
            )}
          </div>
        )}
      </div>
    </main>
  );
}
