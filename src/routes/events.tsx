import { createFileRoute } from "@tanstack/react-router";
import { SectionView } from "@/components/SectionView";

export const Route = createFileRoute("/events")({
  head: () => ({
    meta: [
      { title: "أحداث أوت لاو الأخيرة | OUTLAW" },
      {
        name: "description",
        content:
          "أحداث أوت لاو الأخيرة: صور ونصوص تُحفظ تلقائياً وتظهر لكل زائر بتصميم حديث وفخم.",
      },
      { property: "og:title", content: "أحداث أوت لاو الأخيرة | OUTLAW" },
      {
        property: "og:description",
        content: "أحداث أوت لاو الأخيرة — صور ونصوص محفوظة تظهر للجميع.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <SectionView
      section="events"
      title="احداث اوت لاو الاخيرة"
      subtitle="آخر نسخة منشورة من أحداث أوت لاو"
      blockLabel="الحدث"
    />
  ),
});
