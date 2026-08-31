import { createFileRoute } from "@tanstack/react-router";
import { BlocksBoard } from "@/components/BlocksBoard";

export const Route = createFileRoute("/characters")({
  head: () => ({
    meta: [
      { title: "الشخصيات الرئيسية | OUTLAW" },
      {
        name: "description",
        content:
          "صفحة الشخصيات الرئيسية في Outlaw: 10 صور و10 نصوص تُحفظ وتظهر لكل الزوار.",
      },
      { property: "og:title", content: "الشخصيات الرئيسية | OUTLAW" },
      {
        property: "og:description",
        content: "الشخصيات الرئيسية في Outlaw — صور ونصوص محفوظة.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <BlocksBoard
      section="characters"
      title="الشخصيات الرئيسية"
      subtitle="10 صور و10 نصوص تُحفظ وتظهر لكل الزوار"
      blockLabel="الشخصية"
    />
  ),
});
