import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useApp } from "@/lib/store";
import { useEffect } from "react";

export const Route = createFileRoute("/talk/")({
  component: TalkRedirect,
});

function TalkRedirect() {
  const navigate = useNavigate();
  const { threads, activeThreadId, createThread } = useApp();

  useEffect(() => {
    const target =
      (activeThreadId && threads.find((t) => t.id === activeThreadId)?.id) ||
      threads[0]?.id ||
      createThread();
    navigate({ to: "/talk/$threadId", params: { threadId: target }, replace: true });
  }, [activeThreadId, threads, createThread, navigate]);

  return (
    <div className="py-20 text-center text-sm text-muted-foreground">Opening MedsBuddy…</div>
  );
}
