import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useApp } from "@/lib/store";
import { Activity, Pill, Calendar, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/memory")({
  head: () => ({
    meta: [
      { title: "Memory — MedsBuddy" },
      { name: "description", content: "Chronological health timeline." },
    ],
  }),
  component: Memory,
});

type Item = { id: string; at: number; kind: "symptom" | "dose" | "appt" | "chat"; title: string; sub?: string };

function Memory() {
  const { symptoms, doses, appointments, chat } = useApp();

  const items: Item[] = [
    ...symptoms.map<Item>((s) => ({ id: "s" + s.id, at: s.at, kind: "symptom", title: `Symptom: ${s.name}`, sub: `Severity ${s.severity}${s.notes ? ` — ${s.notes}` : ""}` })),
    ...doses.map<Item>((d) => ({ id: "d" + d.id, at: d.at, kind: "dose", title: `${d.medName}`, sub: d.status })),
    ...appointments.map<Item>((a) => ({ id: "a" + a.id, at: a.at, kind: "appt", title: `Appointment: ${a.doctor}`, sub: a.notes })),
    ...chat.filter((c) => c.role === "assistant").slice(-10).map<Item>((c) => ({ id: "c" + c.id, at: c.at, kind: "chat", title: "AI note", sub: c.content.slice(0, 120) })),
  ].sort((a, b) => b.at - a.at);

  return (
    <AppShell title="Health memory">
      {items.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">Nothing logged yet.</div>
      ) : (
        <ol className="relative border-l-2 border-border ml-3 space-y-4">
          {items.map((it) => {
            const Icon = it.kind === "symptom" ? Activity : it.kind === "dose" ? Pill : it.kind === "appt" ? Calendar : MessageCircle;
            const tone =
              it.kind === "symptom" ? "bg-destructive/15 text-destructive" :
              it.kind === "dose" ? "bg-primary/15 text-primary" :
              it.kind === "appt" ? "bg-accent text-accent-foreground" :
              "bg-secondary text-secondary-foreground";
            return (
              <li key={it.id} className="ml-5">
                <span className={`absolute -left-[14px] size-7 rounded-full grid place-items-center ${tone}`}>
                  <Icon className="size-3.5" />
                </span>
                <div className="rounded-xl bg-card border p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="font-medium">{it.title}</div>
                    <div className="text-xs text-muted-foreground shrink-0">{new Date(it.at).toLocaleString()}</div>
                  </div>
                  {it.sub && <div className="text-sm text-muted-foreground mt-0.5">{it.sub}</div>}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </AppShell>
  );
}