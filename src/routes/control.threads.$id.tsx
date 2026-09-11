import { createFileRoute, useParams } from "@tanstack/react-router";
import { ThreadEditor } from "@/components/ThreadEditor";

export const Route = createFileRoute("/control/threads/$id")({
  head: () => ({
    meta: [
      { title: "تعديل ثريد | لوحة التحكم السرية" },
      {
        name: "description",
        content: "تعديل ثريد منشور من لوحة التحكم السرية وتطبيق التغييرات مباشرة.",
      },
      { property: "og:title", content: "تعديل ثريد | لوحة التحكم السرية" },
      { property: "og:description", content: "تعديل ثريد منشور من لوحة التحكم." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ControlThreadEdit,
});

function ControlThreadEdit() {
  const { id } = useParams({ from: "/control/threads/$id" });
  return <ThreadEditor threadId={id} adminMode />;
}
