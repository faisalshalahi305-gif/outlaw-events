import { createFileRoute } from "@tanstack/react-router";

import { StreamersSection } from "@/components/StreamersSection";

export const Route = createFileRoute("/streamers")({
  head: () => ({
    meta: [
      { title: "جميع الاستريمر على Kick | OUTLAW" },
      {
        name: "description",
        content:
          "قائمة ستريمرز أوت لاو على منصة Kick مع حالة البث المباشر وعدد المشاهدين والمتابعين، وتحديث تلقائي للحالة.",
      },
      { property: "og:title", content: "جميع الاستريمر على Kick | OUTLAW" },
      {
        property: "og:description",
        content: "تابع ستريمرز أوت لاو على Kick: من مباشر الآن وعدد المشاهدين.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StreamersSection,
});
