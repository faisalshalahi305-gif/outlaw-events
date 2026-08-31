import { createFileRoute } from "@tanstack/react-router";

import { BlocksBoard } from "@/components/BlocksBoard";

const LABELS: Record<string, { title: string; blockLabel: string }> = {
  characters: { title: "الشخصيات الرئيسية", blockLabel: "الشخصية" },
  events: { title: "احداث اوت لاو الاخيرة", blockLabel: "الحدث" },
};

export const Route = createFileRoute("/revisions/$section")({
  head: ({ params }) => {
    const label = LABELS[params.section]?.title ?? "التعديلات";
    return {
      meta: [
        { title: `تعديل ${label} | OUTLAW` },
        {
          name: "description",
          content: `${label}: عدّل الصور والنصوص على آخر نسخة منشورة ثم أرسلها للمراجعة قبل نشرها.`,
        },
        { property: "og:title", content: `تعديل ${label} | OUTLAW` },
        { property: "og:description", content: "أرسل نسختك المعدّلة للمراجعة." },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: RevisionEditor,
});

function RevisionEditor() {
  const { section } = Route.useParams();
  const meta = LABELS[section];

  if (!meta) {
    return (
      <main dir="rtl" className="flex min-h-screen items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">قسم غير معروف.</p>
      </main>
    );
  }

  return (
    <BlocksBoard
      key={section}
      section={section}
      title={meta.title}
      subtitle="عدّل الصور والنصوص والجداول ثم اضغط «إرسال» لترسل نسختك للمراجعة"
      blockLabel={meta.blockLabel}
      mode="submit"
      backTo="/revisions"
      backLabel="الرجوع للتعديلات"
    />
  );
}
