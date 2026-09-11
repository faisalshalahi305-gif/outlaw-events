import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Eye, Loader2, PenSquare, Search } from "lucide-react";

import { VisitorMenu } from "@/components/VisitorMenu";
import { useVisitorNumber } from "@/lib/use-visitor";
import { listThreads } from "@/lib/threads.functions";
import type { ThreadCard } from "@/lib/threads-shared";
import logoAsset from "@/assets/outlaw-mark.jpg";

export const Route = createFileRoute("/threads/")({
  head: () => ({
    meta: [
      { title: "الثريدات | OUTLAW" },
      {
        name: "description",
        content:
          "ثريدات أوت لاو: ابحث عن أي ثريد بالاسم، اقرأ محتواه كاملًا أو أنشئ ثريدك الخاص وانشره.",
      },
      { property: "og:title", content: "الثريدات | OUTLAW" },
      {
        property: "og:description",
        content: "تصفّح ثريدات أوت لاو أو أنشئ ثريدك الخاص وانشره للجميع.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ThreadsPage,
});

function ThreadsPage() {
  const visitorNumber = useVisitorNumber();
  const fetchThreads = useServerFn(listThreads);

  const [threads, setThreads] = useState<ThreadCard[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchThreads({ data: {} })
      .then((res) => {
        if (!cancelled) setThreads(res.threads);
      })
      .catch(() => {
        if (!cancelled) setError("تعذّر تحميل الثريدات، حاول تحديث الصفحة");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchThreads]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((t) => t.title.toLowerCase().includes(q));
  }, [threads, query]);

  return (
    <main dir="rtl" className="relative min-h-screen px-4 pb-24 pt-8">
      <div className="fixed right-4 top-4 z-40">
        <VisitorMenu visitorNumber={visitorNumber} />
      </div>

      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-10 text-center">
          <Link
            to="/"
            className="surface-card mb-8 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-bold text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary"
          >
            <ArrowRight className="h-3.5 w-3.5" />
            الرجوع للرئيسية
          </Link>
          <p className="wordmark mb-6 text-xl">OUTLAW</p>
          <div className="halo mx-auto mb-5 h-28 w-28 overflow-hidden rounded-full border border-primary/40 glow-ring">
            <img src={logoAsset} alt="شعار Outlaw" className="h-full w-full object-cover" />
          </div>
          <h1 className="bg-gradient-to-l from-primary via-primary-glow to-primary bg-clip-text text-3xl font-extrabold tracking-tight text-transparent rise-in">
            الثريدات
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            ابحث عن ثريد بالاسم أو أنشئ ثريدك الخاص
          </p>
        </header>

        <div className="mb-6 space-y-3">
          <div className="surface-card flex items-center gap-2 rounded-2xl border border-border px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث باسم الثريد…"
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          <Link
            to="/threads/new"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-primary to-primary-glow px-6 py-3 text-sm font-bold text-primary-foreground shadow-[var(--shadow-elegant)] transition-opacity hover:opacity-90"
          >
            <PenSquare className="h-4 w-4" />
            إنشاء ثريد
          </Link>
        </div>

        {loading ? (
          <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            جاري التحميل…
          </p>
        ) : error ? (
          <p className="text-center text-sm text-destructive">{error}</p>
        ) : visible.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            {query ? "لا يوجد ثريد بهذا الاسم." : "لا توجد ثريدات بعد، كن أول من ينشر."}
          </p>
        ) : (
          <div className="space-y-6">
            {visible.map((thread) => (
              <article
                key={thread.id}
                className="surface-card overflow-hidden rounded-3xl border border-border text-right"
              >
                {thread.coverUrl ? (
                  <img
                    src={thread.coverUrl}
                    alt={thread.title}
                    loading="lazy"
                    className="h-48 w-full object-cover"
                  />
                ) : null}
                <div className="space-y-3 p-4">
                  <h2 className="text-base font-extrabold text-primary">{thread.title}</h2>
                  <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                    {thread.excerpt}
                  </p>
                  <Link
                    to="/threads/$id"
                    params={{ id: thread.id }}
                    className="inline-flex items-center gap-2 rounded-xl border border-primary/50 px-5 py-2 text-xs font-bold text-primary transition-colors hover:bg-accent"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    المشاهدة
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
