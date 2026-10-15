import { createFileRoute } from "@tanstack/react-router";
import { UseFirstSection } from "@/components/loopan/Widgets";

export const Route = createFileRoute("/use-first")({
  head: () => ({
    meta: [
      { title: "Use First — Loopan" },
      { name: "description", content: "Groceries that are close to expiring, so you can use them first." },
      { property: "og:title", content: "Use First — Loopan" },
      { property: "og:description", content: "Groceries that are close to expiring, so you can use them first." },
    ],
  }),
  component: () => <UseFirstSection limit={9} />,
});
