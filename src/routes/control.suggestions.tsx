import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Lightbulb, Loader2, X } from "lucide-react";

import {
  listSuggestions,
  reviewSuggestion,
  type SuggestionRow,
} from "@/lib/suggestions.functions";
import { readAccessToken, readVisitorToken } from "@/lib/gate-identity";

export const Route = createFileRoute("/control/suggestions")({
  head: () => ({
    meta: [
      { title: "الاقتراحات | لوحة التحكم السرية" },
      {
        name: "description",
        content: "مراجعة اقتراحات الزوار وقبولها أو رفضها مع الصور وتاريخ الإرسال.",
      },
      { property: "og:title", content: "الاقتراحات | لوحة التحكم السرية" },
      { property: "og:description", content: "مراجعة الاقتراحات المرسلة." },
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

const TABS = [
  { key: "pending", label: "قيد المراجعة" },
  { key: "approved", label: "مقبولة" },
  { key: "rejected", label: "مرفوضة" },
  { key: "all", label: "الكل" },
] as const;

const STATUS_LABEL: Record<string, string> = {
  pending: "قيد المراجعة",
  approved: "مقبول",
  rejected: "مرفوض",
};

function SuggestionsPanel() {
  const load = useServerFn(listSuggestions);
  const review = useServerFn(reviewSuggestion);
  const [rows, setRows] = useState<SuggestionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("pending");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState("");

  const refresh = () =>
    load({ data: { accessToken: readAccessToken(), visitorToken: readVisitorToken() } })
      .then((res) => {
        setRows(res.suggestions);
        setError("");
        setLoading(false);
      })
      .catch(() => {
        setError("تعذر تحميل الاقتراحات");
        setLoading(false);
      });

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const decide = async (id: string, decision: "approved" | "rejected") => {
    setBusy(id);
    try {
      await review({
        data: {
          id,
          decision,
          accessToken: readAccessToken(),
          visitorToken: readVisitorToken(),
        },
      });
      await refresh();
    } catch {
      setError("تعذر حفظ القرار");
    }
    setBusy("");
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((s) => {
      if (tab !== "all" && (s.status || "pending") !== tab) return false;
      if (!q) return true;
      return (
        s.title.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.body.toLowerCase().includes(q) ||
        String(s.visitorNumber ?? "").includes(q)
      );
    });
  }, [rows, tab, query]);

  return (
    <main dir="rtl" className="relative min-h-screen overflow-hidden px-5 py-12">
      <span className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />

      <div className="relative z-10 mx-auto w-full max-w-2xl pb-28">
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
            {rows.filter((s) => (s.status || "pending") === "pending").length} اقتراح قيد
            المراجعة من {rows.length}
          </p>
        </header>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-full border px-4 py-1.5 text-xs font-bold transition-colors ${
                tab === t.key
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="بحث بالعنوان أو الاسم أو رقم الزائر"
          className="surface-card mt-4 w-full rounded-xl border border-border bg-transparent px-4 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary/60"
        />

        {loading ? (
          <div className="mt-12 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            جاري التحميل…
          </div>
        ) : error ? (
          <p className="mt-12 text-center text-sm font-bold text-destructive">{error}</p>
        ) : filtered.length === 0 ? (
          <p className="mt-12 text-center text-sm font-bold text-muted-foreground">
            لا توجد اقتراحات في هذه القائمة
          </p>
        ) : (
          <ul className="mt-8 space-y-5">
            {filtered.map((s) => (
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
                  {" · "}
                  <span
                    className={
                      s.status === "approved"
                        ? "text-primary"
                        : s.status === "rejected"
                          ? "text-destructive"
                          : "text-muted-foreground"
                    }
                  >
                    {STATUS_LABEL[s.status] ?? s.status}
                  </span>
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

                <div className="mt-5 flex items-center justify-end gap-2">
                  <button
                    onClick={() => decide(s.id, "rejected")}
                    disabled={busy === s.id || s.status === "rejected"}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-destructive/60 px-4 py-2 text-xs font-bold text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" />
                    رفض
                  </button>
                  <button
                    onClick={() => decide(s.id, "approved")}
                    disabled={busy === s.id || s.status === "approved"}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-l from-primary to-primary-glow px-4 py-2 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {busy === s.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    قبول
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
