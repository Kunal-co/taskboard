import { createFileRoute } from "@tanstack/react-router";
import { Board } from "@/components/board/Board";

const title = "Task Board — Drag-and-drop kanban with markdown notes";
const description =
  "A fast, private kanban board: drag tasks between columns, tag and color-code them, write markdown notes, and switch between light, dark and midnight themes.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <>
      <h1 className="sr-only">Task Board</h1>
      <Board />
    </>
  );
}
