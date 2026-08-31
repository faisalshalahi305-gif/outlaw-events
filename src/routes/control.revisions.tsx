import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ArrowRight, Loader2, Save, Trash2 } from "lucide-react";

import {
  approveRevision,
  listRevisions,
  rejectRevision,
  type RevisionRow,
} from "@/lib/revisions.functions";
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

const STATUS_LABEL: Record<string, string> = {
  pending: "بانتظار المراجعة",
  approved: "معتمد ومطبّق",
  rejected: "مرفوض",
};

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
  const load = useServerFn(listRevisions);
  const approve = useServerFn(approveRevision);
  const reject = useServerFn(rejectRevision);

  const [rows, setRows] = useState<RevisionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string>("");
  const [message, setMessage] = useState("");

  const refresh = async () => {
    try {
      const res = await load({
        data: { accessToken: readAccessToken(), visitorToken: readVisitorToken() },
      });
      setRows(res.revisions);
      setLoading(false);
    } catch {
      setError("تعذّر تحميل قائمة التعديلات");
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onApprove = async (id: string) => {
    setBusy(id);
    setMessage("");
    try {
      await approve({
        data: {
          id,
          accessToken: readAccessToken(),
          visitorToken: readVisitorToken(),
        },
      });
      setMessage("تم اعتماد التعديل وتطبيقه على الموقع ✓");
      await refresh();
    } catch {
      setMessage("تعذّر اعتماد التعديل");
    }
    setBusy("");
    setTimeout(() => setMessage(""), 4000);
  };

  const onReject = async (id: string) => {
    setBusy(id);
    try {
      await reject({
        data: {
          id,
          accessToken: readAccessToken(),
          visitorToken: readVisitorToken(),
        },
      });
      await refresh();
    } catch {
      setMessage("تعذّر رفض التعديل");
    }
    setBusy("");
  };

  return (
    <main dir="rtl" className="relative min-h-screen px-4 pb-24 pt-8">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-10 text-center">
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
            راجع التعديلات المرسلة، واضغط «حفظ» لاعتمادها وتطبيقها على الموقع
            الرئيسي.
          </p>
          {message ? (
            <p className="mt-4 text-sm font-bold text-primary">{message}</p>
          ) : null}
        </header>

        {loading ? (
          <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            جاري التحميل…
          </p>
        ) : error ? (
          <p className="text-center text-sm text-destructive">{error}</p>
        ) : rows.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            لا توجد تعديلات مرسلة حتى الآن.
          </p>
        ) : (
          <div className="space-y-6">
            {rows.map((row) => (
              <article
                key={row.id}
                className="surface-card rounded-3xl border border-border p-5 text-right"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-sm font-extrabold text-primary">
                    {SECTION_LABEL[row.section] ?? row.section}
                  </span>
                  <span className="rounded-full border border-border px-3 py-1 text-[11px] text-muted-foreground">
                    {STATUS_LABEL[row.status] ?? row.status}
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
                  {row.items.map((item, index) => (
                    <div
                      key={`${row.id}-${item.blockId || "new"}-${index}`}
                      className="rounded-2xl border border-border/60 p-3"
                    >
                      <p className="text-xs font-bold text-primary">
                        {item.op === "create"
                          ? `إضافة عنصر جديد (${item.slot})`
                          : item.op === "delete"
                            ? `حذف العنصر رقم ${item.slot}`
                            : `العنصر رقم ${item.slot}`}
                      </p>

                      {item.op !== "create" ? (
                        <p className="mt-2 whitespace-pre-wrap rounded-xl border border-destructive/30 p-2 text-xs leading-6 text-muted-foreground line-through">
                          {item.before || "(فارغ)"}
                        </p>
                      ) : null}

                      {item.op !== "delete" ? (
                        <p className="mt-2 whitespace-pre-wrap rounded-xl border border-primary/40 p-2 text-sm leading-6 text-foreground">
                          {item.after || "(فارغ)"}
                        </p>
                      ) : null}

                      {item.beforeImages.length ? (
                        <div className="mt-3">
                          <p className="text-[11px] text-muted-foreground">
                            الصور الحالية
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {item.beforeImages.map((path) => (
                              <img
                                key={`before-${path}`}
                                src={row.imageUrls[path] ?? ""}
                                alt="صورة قبل التعديل"
                                loading="lazy"
                                className="h-24 w-24 rounded-xl border border-destructive/30 object-cover opacity-70"
                              />
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {item.images.length ? (
                        <div className="mt-3">
                          <p className="text-[11px] text-muted-foreground">
                            الصور بعد التعديل
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {item.images.map((path) => (
                              <img
                                key={`after-${path}`}
                                src={row.imageUrls[path] ?? ""}
                                alt="صورة بعد التعديل"
                                loading="lazy"
                                className="h-24 w-24 rounded-xl border border-primary/40 object-cover"
                              />
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>


                {row.status === "pending" ? (
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      onClick={() => onApprove(row.id)}
                      disabled={busy === row.id}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-l from-primary to-primary-glow px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-[var(--shadow-elegant)] transition-opacity hover:opacity-90 disabled:opacity-60"
                    >
                      {busy === row.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      حفظ
                    </button>
                    <button
                      onClick={() => onReject(row.id)}
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
