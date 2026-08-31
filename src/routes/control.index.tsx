import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Users, Flame, Lightbulb, PencilLine, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/control/")({
  head: () => ({
    meta: [
      { title: "لوحة التحكم السرية | OUTLAW" },
      {
        name: "description",
        content:
          "لوحة التحكم السرية في Outlaw: تحكّم في الشخصيات الرئيسية وأحداث أوت لاو الأخيرة.",
      },
      { property: "og:title", content: "لوحة التحكم السرية | OUTLAW" },
      {
        property: "og:description",
        content: "إدارة الصور والنصوص والجداول في Outlaw.",
      },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ControlPanel,
});

function ControlPanel() {
  return (
    <main
      dir="rtl"
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-5 py-16"
    >
      <span className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />

      <div className="relative z-10 w-full max-w-md text-center">
        <Link
          to="/"
          className="surface-card mb-8 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-bold text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary"
        >
          <ArrowRight className="h-3.5 w-3.5" />
          الرجوع للرئيسية
        </Link>

        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-primary/60 glow-ring">
          <ShieldCheck className="h-8 w-8 text-primary" />
        </div>

        <h1 className="mt-8 bg-gradient-to-l from-primary via-primary-glow to-primary bg-clip-text text-3xl font-extrabold text-transparent">
          لوحة التحكم السرية
        </h1>
        <div className="ornament-line mx-auto mt-5 w-56" />

        <nav className="mt-12 space-y-5">
          <Link
            to="/control/characters"
            className="surface-card group flex items-center justify-between rounded-2xl border-2 border-primary/60 px-6 py-5 text-right transition-all hover:border-primary hover:shadow-[var(--shadow-elegant)]"
          >
            <Users className="h-5 w-5 text-primary" />
            <span className="text-lg font-extrabold text-primary">
              التحكم في الشخصيات الرئيسية
            </span>
            <ArrowLeft className="h-5 w-5 text-primary transition-transform group-hover:-translate-x-1" />
          </Link>

          <Link
            to="/control/events"
            className="surface-card group flex items-center justify-between rounded-2xl border-2 border-primary/60 px-6 py-5 text-right transition-all hover:border-primary hover:shadow-[var(--shadow-elegant)]"
          >
            <Flame className="h-5 w-5 text-primary" />
            <span className="text-lg font-extrabold text-primary">
              التحكم في أحداث أوت لاو الأخيرة
            </span>
            <ArrowLeft className="h-5 w-5 text-primary transition-transform group-hover:-translate-x-1" />
          </Link>

          <Link
            to="/control/revisions"
            className="surface-card group flex items-center justify-between rounded-2xl border-2 border-primary/60 px-6 py-5 text-right transition-all hover:border-primary hover:shadow-[var(--shadow-elegant)]"
          >
            <PencilLine className="h-5 w-5 text-primary" />
            <span className="text-lg font-extrabold text-primary">قائمة التعديلات</span>
            <ArrowLeft className="h-5 w-5 text-primary transition-transform group-hover:-translate-x-1" />
          </Link>

          <Link
            to="/control/suggestions"
            className="surface-card group flex items-center justify-between rounded-2xl border-2 border-primary/60 px-6 py-5 text-right transition-all hover:border-primary hover:shadow-[var(--shadow-elegant)]"
          >
            <Lightbulb className="h-5 w-5 text-primary" />
            <span className="text-lg font-extrabold text-primary">الاقتراحات</span>
            <ArrowLeft className="h-5 w-5 text-primary transition-transform group-hover:-translate-x-1" />
          </Link>
        </nav>

      </div>
    </main>
  );
}
