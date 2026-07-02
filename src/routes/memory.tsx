import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useApp, type VisitRecord } from "@/lib/store";
import { Calendar, ClipboardList, Mic, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/memory")({
  head: () => ({
    meta: [
      { title: "Visit memory — MedsBuddy" },
      {
        name: "description",
        content: "Saved doctor visit summaries.",
      },
    ],
  }),
  component: Memory,
});

function Memory() {
  const { visits, removeVisit } = useApp();
  const sortedVisits = [...visits].sort((a, b) => b.at - a.at);

  return (
    <AppShell>
      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="text-xs text-muted-foreground font-medium">Doctor visit records</div>
          <h1>Doctor visit summaries</h1>
        </div>
        <Link
          to="/doctor"
          className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold inline-flex items-center gap-1.5 shadow-elegant"
        >
          <Mic className="size-4" /> New visit
        </Link>
      </div>

      {sortedVisits.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-border bg-card/50 p-8 text-center">
          <div className="size-14 rounded-2xl bg-primary/10 text-primary grid place-items-center mx-auto mb-3">
            <ClipboardList className="size-6" />
          </div>
          <div className="font-semibold">No visit summaries yet</div>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
            End a Doctor Visit to save the summary here. You can come back anytime to review or
            delete it.
          </p>
          <Link
            to="/doctor"
            className="mt-4 inline-flex rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold"
          >
            Start Doctor Visit
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedVisits.map((visit, index) => (
            <VisitCard
              key={visit.id}
              visit={visit}
              index={index}
              onDelete={() => removeVisit(visit.id)}
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}

function VisitCard({
  visit,
  index,
  onDelete,
}: {
  visit: VisitRecord;
  index: number;
  onDelete: () => void;
}) {
  const title = `${visit.specialty || "Doctor"} visit${visit.doctor ? ` · ${visit.doctor}` : ""}`;

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.2) }}
      className="rounded-2xl bg-card border shadow-card p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground font-medium">
            <Calendar className="size-3.5" /> {formatDateTime(visit.at)}
          </div>
          <h2 className="text-[17px] font-semibold mt-1">{title}</h2>
        </div>
        <button
          onClick={onDelete}
          className="size-9 rounded-full bg-secondary text-muted-foreground hover:text-destructive grid place-items-center shrink-0"
          aria-label="Delete visit summary"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      <div className="mt-4 space-y-3">
        <p className="rounded-xl border bg-background p-3 text-[14px] leading-relaxed">
          {visit.summary}
        </p>
      </div>
    </motion.article>
  );
}

function formatDateTime(at: number) {
  return new Date(at).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
