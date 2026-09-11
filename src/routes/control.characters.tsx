import { createFileRoute } from "@tanstack/react-router";
import { SectionBoard } from "@/components/SectionBoard";

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
    <SectionBoard
      section="characters"
      title="الشخصيات الرئيسية"
      blockLabel="الشخصية"
      mode="publish"
      backTo="/control"
      backLabel="الرجوع للوحة التحكم"
    />
  ),
});
