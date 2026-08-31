import { createFileRoute } from "@tanstack/react-router";
import { BlocksBoard } from "@/components/BlocksBoard";

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
    <BlocksBoard
      section="events"
      title="احداث اوت لاو الاخيرة"
      subtitle="صور ونصوص تُحفظ وتظهر لكل الزوار"
      blockLabel="الحدث"
    />
  ),
});
