import { createFileRoute } from "@tanstack/react-router";
import { BlocksBoard } from "@/components/BlocksBoard";

export const Route = createFileRoute("/control/characters")({
  head: () => ({
    meta: [
      { title: "التحكم في الشخصيات الرئيسية | OUTLAW" },
      {
        name: "description",
        content:
          "تحرير صور ونصوص وجداول صفحة الشخصيات الرئيسية من لوحة التحكم السرية.",
      },
      { property: "og:title", content: "التحكم في الشخصيات الرئيسية | OUTLAW" },
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
      section="characters"
      title="الشخصيات الرئيسية"
      subtitle="تحرير الصور والنصوص والجداول ثم الضغط على حفظ"
      blockLabel="الشخصية"
      admin
      backTo="/control"
      backLabel="الرجوع للوحة التحكم"
    />
  ),
});
