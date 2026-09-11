import { createFileRoute } from "@tanstack/react-router";
import { ThreadEditor } from "@/components/ThreadEditor";

export const Route = createFileRoute("/threads/new")({
  head: () => ({
    meta: [
      { title: "إنشاء ثريد جديد | OUTLAW" },
      {
        name: "description",
        content: "أنشئ ثريدًا جديدًا في موقع أوت لاو بالعنوان والصورة والنبذة والمحتوى الكامل.",
      },
      { property: "og:title", content: "إنشاء ثريد جديد | OUTLAW" },
      { property: "og:description", content: "أنشئ ثريدًا جديدًا وانشره لجميع الزوار." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <ThreadEditor />,
});
