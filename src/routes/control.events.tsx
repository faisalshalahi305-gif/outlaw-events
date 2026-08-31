import { createFileRoute } from "@tanstack/react-router";
import { BlocksBoard } from "@/components/BlocksBoard";

export const Route = createFileRoute("/control/events")({
  head: () => ({
    meta: [
      { title: "التحكم في أحداث أوت لاو الأخيرة | OUTLAW" },
      {
        name: "description",
        content:
          "تحرير صور ونصوص وجداول صفحة أحداث أوت لاو الأخيرة من لوحة التحكم السرية.",
      },
      {
        property: "og:title",
        content: "التحكم في أحداث أوت لاو الأخيرة | OUTLAW",
      },
      {
        property: "og:description",
        content: "إضافة وتعديل وحذف الصور والنصوص والجداول.",
      },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <BlocksBoard
      section="events"
      title="احداث اوت لاو الاخيرة"
      subtitle="تحرير الصور والنصوص والجداول ثم الضغط على حفظ"
      blockLabel="الحدث"
      admin
      backTo="/control"
      backLabel="الرجوع للوحة التحكم"
    />
  ),
});
