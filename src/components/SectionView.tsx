import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Loader2, PencilLine } from "lucide-react";

import { VisitorMenu } from "@/components/VisitorMenu";
import { useVisitorNumber } from "@/lib/use-visitor";
import { loadSection } from "@/lib/edits.functions";
import type { EditEntry } from "@/lib/edits-shared";
import logoAsset from "@/assets/outlaw-mark.jpg";

/** Read-only public view of a published section (text + images). */
export function SectionView({
  section,
  title,
  subtitle,
  blockLabel,
}: {
  section: string;
  title: string;
  subtitle: string;
  blockLabel: string;
}) {
  const visitorNumber = useVisitorNumber();
  const fetchSection = useServerFn(loadSection);

  const [entries, setEntries] = useState<EditEntry[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchSection({ data: { section } })
      .then((res) => {
        if (cancelled) return;
        setEntries(res.entries);
        setUrls(res.imageUrls);
      })
      .catch(() => {
        if (!cancelled) setError("تعذّر تحميل المحتوى، حاول تحديث الصفحة");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [section, fetchSection]);

  return (
    <main dir="rtl" className="relative min-h-screen px-4 pb-24 pt-8">
      <div className="fixed right-4 top-4 z-40">
        <VisitorMenu visitorNumber={visitorNumber} />
      </div>

      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-12 text-center">
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
            {title}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">{subtitle}</p>
          <div className="ornament-diamond mt-6 text-[10px] tracking-[0.4em] text-muted-foreground/70">
            OUTLAW
          </div>
          <Link
            to="/revisions/$section"
            params={{ section }}
            className="surface-card mt-8 inline-flex items-center gap-2 rounded-full border border-primary/50 px-5 py-2.5 text-xs font-bold text-primary transition-colors hover:bg-accent"
          >
            <PencilLine className="h-3.5 w-3.5" />
            اقترح تعديلًا على هذه الصفحة
          </Link>
        </header>

        {loading ? (
          <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            جاري التحميل…
          </p>
        ) : error ? (
          <p className="text-center text-sm text-destructive">{error}</p>
        ) : entries.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">لا يوجد محتوى بعد.</p>
        ) : (
          <div className="space-y-12">
            {entries.map((entry, index) => (
              <article
                key={index}
                className="surface-card rounded-3xl border border-border p-4 text-right"
              >
                <h2 className="mb-4 text-sm font-extrabold text-primary">
                  {blockLabel} {index + 1}
                </h2>
                {entry.images.map((path) => (
                  <div
                    key={path}
                    className="mb-3 overflow-hidden rounded-2xl border border-border"
                  >
                    <img
                      src={urls[path] ?? ""}
                      alt={`${blockLabel} ${index + 1}`}
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
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
