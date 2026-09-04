import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ArrowRight, Lightbulb, Loader2 } from "lucide-react";

import { listSuggestions, type SuggestionRow } from "@/lib/suggestions.functions";
import { readAccessToken, readVisitorToken } from "@/lib/gate-identity";

export const Route = createFileRoute("/control/suggestions")({
  head: () => ({
    meta: [
      { title: "الاقتراحات | لوحة التحكم السرية" },
      {
        name: "description",
        content: "عرض جميع الاقتراحات المرسلة من الزوار مع الصور وتاريخ الإرسال.",
      },
      { property: "og:title", content: "الاقتراحات | لوحة التحكم السرية" },
      { property: "og:description", content: "قائمة الاقتراحات المرسلة." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SuggestionsPanel,
});

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("ar", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function SuggestionsPanel() {
  const load = useServerFn(listSuggestions);
  const [rows, setRows] = useState<SuggestionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    load({ data: { accessToken: readAccessToken(), visitorToken: readVisitorToken() } })
      .then((res) => {
        if (cancelled) return;
        setRows(res.suggestions);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("تعذر تحميل الاقتراحات");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

  return (
    <main dir="rtl" className="relative min-h-screen overflow-hidden px-5 py-12">
      <span className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />

      <div className="relative z-10 mx-auto w-full max-w-2xl">
        <Link
          to="/control"
          className="surface-card mb-8 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-bold text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary"
        >
          <ArrowRight className="h-3.5 w-3.5" />
          الرجوع للوحة التحكم
        </Link>

        <header className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary/60 glow-ring">
            <Lightbulb className="h-7 w-7 text-primary" />
          </div>
          <h1 className="mt-6 text-2xl font-extrabold text-primary">الاقتراحات</h1>
          <div className="ornament-line mx-auto mt-4 w-48" />
          <p className="mt-3 text-xs font-bold text-muted-foreground">
            {rows.length} اقتراح مرسل
          </p>
        </header>

        {loading ? (
          <div className="mt-12 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            جاري التحميل…
          </div>
        ) : error ? (
          <p className="mt-12 text-center text-sm font-bold text-destructive">{error}</p>
        ) : rows.length === 0 ? (
          <p className="mt-12 text-center text-sm font-bold text-muted-foreground">
            لا توجد اقتراحات حتى الآن
          </p>
        ) : (
          <ul className="mt-10 space-y-5">
            {rows.map((s) => (
              <li
                key={s.id}
                className="surface-card rounded-2xl border border-primary/40 p-5 text-right"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-extrabold text-primary">{s.title}</span>
                  <span className="text-[11px] font-bold text-muted-foreground">
                    {formatDate(s.createdAt)}
                  </span>
                </div>
                <p className="mt-1 text-xs font-bold text-foreground/80">
                  {s.name}
                  {s.visitorNumber ? ` — الزائر-${s.visitorNumber}` : ""}
                </p>
                <div className="ornament-line my-4" />
                <p className="whitespace-pre-wrap text-sm leading-7 text-foreground">
                  {s.body}
                </p>

                {s.images.length ? (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {s.images.map((src, i) => (
                      <a
                        key={i}
                        href={src}
                        target="_blank"
                        rel="noreferrer"
                        className="overflow-hidden rounded-xl border border-primary/30"
                      >
                        <img
                          src={src}
                          alt={`صورة مرفقة ${i + 1} لاقتراح ${s.title}`}
                          loading="lazy"
                          className="w-full object-contain"
                        />
                      </a>
                    ))}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
