import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Loader2, Search, Trash2 } from "lucide-react";

import { decideEdit, listEdits, type EditRequest } from "@/lib/edits.functions";
import { readAccessToken, readVisitorToken } from "@/lib/gate-identity";

export const Route = createFileRoute("/control/revisions")({
  head: () => ({
    meta: [
      { title: "قائمة التعديلات | لوحة التحكم السرية" },
      {
        name: "description",
        content: "مراجعة التعديلات المرسلة من الزوار واعتمادها لتطبيقها على الموقع.",
      },
      { property: "og:title", content: "قائمة التعديلات | لوحة التحكم السرية" },
      { property: "og:description", content: "مراجعة واعتماد التعديلات." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RevisionsPanel,
});

const SECTION_LABEL: Record<string, string> = {
  characters: "الشخصيات الرئيسية",
  events: "أحداث أوت لاو الأخيرة",
};

const TABS: { value: "pending" | "approved" | "rejected" | "all"; label: string }[] = [
  { value: "pending", label: "قيد المراجعة" },
  { value: "approved", label: "مقبولة" },
  { value: "rejected", label: "مرفوضة" },
  { value: "all", label: "الكل" },
];

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

function RevisionsPanel() {
  const load = useServerFn(listEdits);
  const decide = useServerFn(decideEdit);

  const [requests, setRequests] = useState<EditRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState<(typeof TABS)[number]["value"]>("pending");
  const [query, setQuery] = useState("");

  const refresh = async () => {
    try {
      setError("");
      const res = await load({
        data: { accessToken: readAccessToken(), visitorToken: readVisitorToken() },
      });
      setRequests(res.requests);
    } catch {
      setError("تعذّر تحميل قائمة التعديلات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = useMemo(() => {
    const q = query.trim();
    return requests.filter((r) => {
      if (tab !== "all" && r.status !== tab) return false;
      if (!q) return true;
      const haystack = [
        SECTION_LABEL[r.section] ?? r.section,
        r.note ?? "",
        r.visitorNumber ? String(r.visitorNumber) : "",
        ...r.entries.map((e) => e.text),
      ].join(" ");
      return haystack.includes(q);
    });
  }, [requests, tab, query]);

  const act = async (id: string, action: "approve" | "reject") => {
    setBusy(id);
    setMessage("");
    try {
      await decide({
        data: {
          id,
          action,
          accessToken: readAccessToken(),
          visitorToken: readVisitorToken(),
        },
      });
      setMessage(action === "approve" ? "تم القبول والنشر على الموقع ✓" : "تم رفض التعديل");
      await refresh();
    } catch {
      setMessage("تعذّر تنفيذ العملية");
    }
    setBusy("");
    setTimeout(() => setMessage(""), 4000);
  };

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <main dir="rtl" className="relative min-h-screen px-4 pb-24 pt-8">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-8 text-center">
          <Link
            to="/control"
            className="surface-card mb-8 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-bold text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary"
          >
            <ArrowRight className="h-3.5 w-3.5" />
            الرجوع للوحة التحكم
          </Link>
          <h1 className="bg-gradient-to-l from-primary via-primary-glow to-primary bg-clip-text text-3xl font-extrabold text-transparent">
            قائمة التعديلات
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {pendingCount} تعديل بانتظار المراجعة. القبول ينشر النسخة المرسلة مباشرة.
          </p>
          {message ? (
            <p className="mt-4 text-sm font-bold text-primary">{message}</p>
          ) : null}
        </header>

        <div className="mb-6 flex flex-wrap justify-center gap-2">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`rounded-full border px-4 py-1.5 text-xs font-bold transition-colors ${
                tab === t.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="surface-card mb-8 flex items-center gap-2 rounded-2xl border border-border px-4 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="بحث بالنص أو الملاحظة أو رقم الزائر"
            className="w-full bg-transparent py-1.5 text-sm text-foreground outline-none"
          />
        </div>

        {loading ? (
          <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            جاري التحميل…
          </p>
        ) : error ? (
          <p className="text-center text-sm text-destructive">{error}</p>
        ) : visible.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">لا توجد تعديلات هنا.</p>
        ) : (
          <div className="space-y-6">
            {visible.map((row) => (
              <article
                key={row.id}
                className="surface-card rounded-3xl border border-border p-5 text-right"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-sm font-extrabold text-primary">
                    {SECTION_LABEL[row.section] ?? row.section}
                  </span>
                  <span className="rounded-full border border-border px-3 py-1 text-[11px] text-muted-foreground">
                    {row.status === "pending"
                      ? "قيد المراجعة"
                      : row.status === "approved"
                        ? "مقبول ومنشور"
                        : "مرفوض"}
                  </span>
                </div>

                <p className="mt-2 text-xs text-muted-foreground">
                  {row.visitorNumber ? `زائر-${row.visitorNumber} · ` : ""}
                  {formatDate(row.createdAt)}
                </p>

                {row.note ? (
                  <p className="mt-3 rounded-2xl border border-border/60 p-3 text-sm leading-6 text-foreground">
                    {row.note}
                  </p>
                ) : null}

                <div className="mt-4 space-y-4">
                  {row.entries.map((entry, index) => (
                    <div
                      key={`${row.id}-${index}`}
                      className="rounded-2xl border border-border/60 p-3"
                    >
                      <p className="text-xs font-bold text-primary">العنصر {index + 1}</p>
                      {entry.images.length ? (
                        <div className="mt-3 space-y-2">
                          {entry.images.map((path) => (
                            <img
                              key={path}
                              src={row.imageUrls[path] ?? ""}
                              alt={`صورة العنصر ${index + 1}`}
                              loading="lazy"
                              className="h-auto max-h-72 w-full rounded-xl border border-border object-contain"
                            />
                          ))}
                        </div>
                      ) : null}
                      {entry.text ? (
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-foreground">
                          {entry.text}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>

                {row.status === "pending" ? (
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      onClick={() => act(row.id, "approve")}
                      disabled={busy === row.id}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-l from-primary to-primary-glow px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-[var(--shadow-elegant)] transition-opacity hover:opacity-90 disabled:opacity-60"
                    >
                      {busy === row.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      قبول ونشر
                    </button>
                    <button
                      onClick={() => act(row.id, "reject")}
                      disabled={busy === row.id}
                      className="inline-flex items-center gap-2 rounded-xl border border-input px-5 py-2.5 text-sm font-bold text-muted-foreground transition-colors hover:border-destructive/60 hover:text-destructive disabled:opacity-60"
                    >
                      <Trash2 className="h-4 w-4" />
                      رفض
                    </button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
