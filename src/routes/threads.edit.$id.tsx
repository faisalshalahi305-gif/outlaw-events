import { createFileRoute, useParams } from "@tanstack/react-router";
import { ThreadEditor } from "@/components/ThreadEditor";

export const Route = createFileRoute("/threads/edit/$id")({
  head: () => ({
    meta: [
      { title: "تحرير ثريد | OUTLAW" },
      {
        name: "description",
        content: "حرّر محتوى الثريد: العنوان، الصورة، النبذة، النصوص والصور ثم احفظ لينشر مباشرة.",
      },
      { property: "og:title", content: "تحرير ثريد | OUTLAW" },
      { property: "og:description", content: "حرّر محتوى الثريد ثم احفظه لينشر مباشرة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EditThread,
});

function EditThread() {
  const { id } = useParams({ from: "/threads/edit/$id" });
  return <ThreadEditor threadId={id} />;
}
