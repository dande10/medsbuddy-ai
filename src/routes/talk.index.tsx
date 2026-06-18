import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useApp } from "@/lib/store";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/talk/")({
  component: TalkRedirect,
});

function TalkRedirect() {
  const [hydrated, setHydrated] = useState(false);
  const navigate = useNavigate();
  const { threads, activeThreadId, createThread } = useApp();

  useEffect(() => {
    const unsub = useApp.persist.onFinishHydration(() => setHydrated(true));
    if (useApp.persist.hasHydrated()) setHydrated(true);
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const target =
      (activeThreadId && threads.find((t) => t.id === activeThreadId)?.id) ||
      threads[0]?.id ||
      createThread();
    navigate({ to: "/talk/$threadId", params: { threadId: target }, replace: true });
  }, [hydrated, activeThreadId, threads, createThread, navigate]);

  return (
    <div className="py-20 text-center text-sm text-muted-foreground">Opening MedsBuddy…</div>
  );
}
