import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/talk/$threadId")({
  component: () => <div className="py-20 text-center">Static Talk Page</div>,
});
