import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Loader2, Plus, Radio, Trash2 } from "lucide-react";

import {
  addStreamer,
  approveStreamer,
  deleteStreamer,
  listStreamers,
  rejectStreamerRemoval,
  type StreamerRow,
} from "@/lib/streamers.functions";
import { readAccessToken, readVisitorToken } from "@/lib/gate-identity";

export const Route = createFileRoute("/control/streamers")({
  head: () => ({
    meta: [
      { title: "لوحة الستريمرز | لوحة التحكم السرية" },
      {
        name: "description",
        content: "مراجعة طلبات الستريمرز واعتمادها، وإضافة أو حذف الستريمرز من القائمة الرئيسية.",
      },
      { property: "og:title", content: "لوحة الستريمرز | لوحة التحكم السرية" },
      { property: "og:description", content: "إدارة قائمة ستريمرز أوت لاو." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StreamersPanel,
});

const TABS = [
  { key: "pending", label: "الطلبات" },
  { key: "removal", label: "طلبات الحذف" },
  { key: "approved", label: "القائمة الرئيسية" },
] as const;

function StreamersPanel() {
  const load = useServerFn(listStreamers);
  const approve = useServerFn(approveStreamer);
  const remove = useServerFn(deleteStreamer);
  const add = useServerFn(addStreamer);
  const keepStreamer = useServerFn(rejectStreamerRemoval);

  const [rows, setRows] = useState<StreamerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("pending");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState("");
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const tokens = () => ({
    accessToken: readAccessToken(),
    visitorToken: readVisitorToken(),
  });

  const refresh = () =>
    load({ data: tokens() })
      .then((res) => {
        setRows(res.streamers);
        setError("");
        setLoading(false);
      })
      .catch(() => {
        setError("تعذر تحميل الستريمرز");
        setLoading(false);
      });

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const act = async (id: string, action: "approve" | "delete" | "keep") => {
    setBusy(id);
    try {
      if (action === "approve") await approve({ data: { id, ...tokens() } });
      else if (action === "keep") await keepStreamer({ data: { id, ...tokens() } });
      else await remove({ data: { id, ...tokens() } });
      await refresh();
    } catch {
      setError("تعذر تنفيذ العملية");
    }
    setBusy("");
  };

  const addManual = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    setError("");
    try {
      const res = await add({ data: { username: newName.trim(), ...tokens() } });
      if (!res.ok) setError("الحساب غير موجود على Kick");
      else {
        setNewName("");
        await refresh();
      }
    } catch {
      setError("تعذر إضافة الستريمر");
    }
    setAdding(false);
  };

  const pendingCount = rows.filter((r) => r.status === "pending").length;
  const removalCount = rows.filter((r) => r.removalRequestedAt !== null).length;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (tab === "removal" ? r.removalRequestedAt === null : r.status !== tab) return false;
      if (!q) return true;
      return r.username.toLowerCase().includes(q) || r.displayName.toLowerCase().includes(q);
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
            <Radio className="h-7 w-7 text-primary" />
          </div>
          <h1 className="mt-6 text-2xl font-extrabold text-primary">لوحة الستريمرز</h1>
          <div className="ornament-line mx-auto mt-4 w-48" />
          <p className="mt-3 text-xs font-bold text-muted-foreground">
            {pendingCount} طلب قيد المراجعة · {removalCount} طلب حذف ·{" "}
            {rows.filter((r) => r.status === "approved").length} ستريمر معتمد
          </p>
        </header>

        <div className="surface-card mt-8 flex items-center gap-2 rounded-2xl border border-primary/40 p-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            dir="ltr"
            placeholder="Kick Username"
            className="min-w-0 flex-1 rounded-xl border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-primary/60"
          />
          <button
            onClick={addManual}
            disabled={adding}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-l from-primary to-primary-glow px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
          >
            {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            إضافة
          </button>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
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
          placeholder="بحث باسم المستخدم"
          className="surface-card mt-4 w-full rounded-xl border border-border bg-transparent px-4 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary/60"
        />

        {error ? (
          <p className="mt-4 text-center text-xs font-bold text-destructive">{error}</p>
        ) : null}

        {loading ? (
          <div className="mt-12 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            جاري التحميل…
          </div>
        ) : filtered.length === 0 ? (
          <p className="mt-12 text-center text-sm font-bold text-muted-foreground">
            لا يوجد ستريمرز في هذه القائمة
          </p>
        ) : (
          <ul className="mt-6 space-y-3">
            {filtered.map((s) => (
              <li
                key={s.id}
                className="surface-card flex items-center justify-between gap-3 rounded-2xl border border-primary/40 p-4"
              >
                <div className="min-w-0 flex-1 text-right">
                  <p className="truncate text-sm font-extrabold text-primary" dir="ltr">
                    {s.username}
                  </p>
                  {s.displayName && s.displayName !== s.username ? (
                    <p className="mt-0.5 truncate text-[11px] font-bold text-foreground/70" dir="ltr">
                      {s.displayName}
                    </p>
                  ) : null}
                  <p className="mt-1 text-[11px] font-bold text-muted-foreground">
                    {s.visitorNumber ? `الزائر-${s.visitorNumber}` : "أضيف من اللوحة"}
                  </p>

                  {s.removalRequestedAt ? (
                    <p className="mt-1 text-[11px] font-bold text-destructive">
                      طلب حذف
                      {s.removalVisitorNumber ? ` من الزائر-${s.removalVisitorNumber}` : ""}
                    </p>
                  ) : null}
                </div>

                <div className="flex items-center gap-2">
                  {s.removalRequestedAt ? (
                    <button
                      onClick={() => act(s.id, "keep")}
                      disabled={busy === s.id}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-primary/60 px-4 py-2 text-xs font-bold text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
                    >
                      {busy === s.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      رفض الطلب
                    </button>
                  ) : null}
                  {s.status === "pending" ? (
                    <button
                      onClick={() => act(s.id, "approve")}
                      disabled={busy === s.id}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-l from-primary to-primary-glow px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
                    >
                      {busy === s.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      حفظ
                    </button>
                  ) : null}
                  <button
                    onClick={() => act(s.id, "delete")}
                    disabled={busy === s.id}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-destructive/60 px-4 py-2 text-xs font-bold text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    حذف
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
