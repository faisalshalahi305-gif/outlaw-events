import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Users, Flame, PencilLine } from "lucide-react";

export const Route = createFileRoute("/revisions/")({
  head: () => ({
    meta: [
      { title: "التعديلات | OUTLAW" },
      {
        name: "description",
        content:
          "اقترح تعديلات على الشخصيات الرئيسية أو أحداث أوت لاو، وأرسلها للمراجعة قبل نشرها.",
      },
      { property: "og:title", content: "التعديلات | OUTLAW" },
      {
        property: "og:description",
        content: "أرسل نسخة معدّلة من محتوى الموقع للمراجعة.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RevisionsHome,
});

function RevisionsHome() {
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
          <PencilLine className="h-8 w-8 text-primary" />
        </div>

        <h1 className="mt-8 bg-gradient-to-l from-primary via-primary-glow to-primary bg-clip-text text-3xl font-extrabold text-transparent">
          التعديلات
        </h1>
        <div className="ornament-line mx-auto mt-5 w-56" />
        <p className="mt-4 text-sm text-muted-foreground">
          اختر القسم الذي تريد تعديله. ستظهر لك آخر نسخة منشورة على الموقع، وبعد
          الانتهاء اضغط «إرسال» لترسل نسختك للمراجعة.
        </p>

        <nav className="mt-12 space-y-5">
          <Link
            to="/revisions/$section"
            params={{ section: "characters" }}
            className="surface-card group flex items-center justify-between rounded-2xl border-2 border-primary/60 px-6 py-5 text-right transition-all hover:border-primary hover:shadow-[var(--shadow-elegant)]"
          >
            <Users className="h-5 w-5 text-primary" />
            <span className="text-lg font-extrabold text-primary">
              الشخصيات الرئيسية
            </span>
            <ArrowLeft className="h-5 w-5 text-primary transition-transform group-hover:-translate-x-1" />
          </Link>

          <Link
            to="/revisions/$section"
            params={{ section: "events" }}
            className="surface-card group flex items-center justify-between rounded-2xl border-2 border-primary/60 px-6 py-5 text-right transition-all hover:border-primary hover:shadow-[var(--shadow-elegant)]"
          >
            <Flame className="h-5 w-5 text-primary" />
            <span className="text-lg font-extrabold text-primary">
              احداث اوت لاو الاخيرة
            </span>
            <ArrowLeft className="h-5 w-5 text-primary transition-transform group-hover:-translate-x-1" />
          </Link>
        </nav>
      </div>
    </main>
  );
}
