import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useApp } from "@/lib/store";
import { Activity, Pill, Calendar, MessageCircle, Plus, Clock } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/memory")({
  head: () => ({
    meta: [
      { title: "Health memory — MedsBuddy" },
      { name: "description", content: "Beautiful chronological timeline of your health events." },
    ],
  }),
  component: Memory,
});

type Item = { id: string; at: number; kind: "symptom" | "dose" | "appt" | "chat"; title: string; sub?: string };

function Memory() {
  const { symptoms, doses, appointments, chat, addSymptom } = useApp();
  const [adding, setAdding] = useState(false);

  const items: Item[] = [
    ...symptoms.map<Item>((s) => ({ id: "s" + s.id, at: s.at, kind: "symptom", title: `Symptom: ${s.name}`, sub: `Severity ${s.severity}${s.notes ? ` — ${s.notes}` : ""}` })),
    ...doses.map<Item>((d) => ({ id: "d" + d.id, at: d.at, kind: "dose", title: d.medName, sub: `Marked ${d.status}` })),
    ...appointments.map<Item>((a) => ({ id: "a" + a.id, at: a.at, kind: "appt", title: `Appointment: ${a.doctor}`, sub: a.notes })),
    ...chat.filter((c) => c.role === "assistant").slice(-10).map<Item>((c) => ({ id: "c" + c.id, at: c.at, kind: "chat", title: "MedsBuddy note", sub: c.content.slice(0, 120) })),
  ].sort((a, b) => b.at - a.at);

  return (
    <AppShell>
      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="text-xs text-muted-foreground font-medium">Your story</div>
          <h1>Health memory</h1>
        </div>
        <button onClick={() => setAdding(true)} className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold inline-flex items-center gap-1.5 shadow-elegant">
          <Plus className="size-4" /> Log
        </button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-border bg-card/50 p-8 text-center">
          <div className="size-14 rounded-2xl bg-primary/10 text-primary grid place-items-center mx-auto mb-3">
            <Clock className="size-6" />
          </div>
          <div className="font-semibold">Your timeline starts here</div>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
            Every dose, symptom, and conversation builds a story your doctor can trust.
          </p>
          <button onClick={() => setAdding(true)} className="mt-4 rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold">
            Log your first symptom
          </button>
        </div>
      ) : (
        <ol className="relative ml-3 space-y-3 pl-6 border-l-2 border-border">
          {items.map((it, idx) => {
            const Icon = it.kind === "symptom" ? Activity : it.kind === "dose" ? Pill : it.kind === "appt" ? Calendar : MessageCircle;
            const tone =
              it.kind === "symptom" ? "bg-warning/15 text-warning" :
              it.kind === "dose" ? "bg-primary/15 text-primary" :
              it.kind === "appt" ? "bg-success/15 text-success" :
              "bg-secondary text-secondary-foreground";
            return (
              <motion.li
                key={it.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                className="relative"
              >
                <span className={`absolute -left-[34px] size-8 rounded-full grid place-items-center ring-4 ring-background ${tone}`}>
                  <Icon className="size-4" />
                </span>
                <div className="rounded-2xl bg-card border shadow-card p-3.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="font-semibold text-[14px] capitalize">{it.title}</div>
                    <div className="text-[11px] text-muted-foreground shrink-0">{formatTime(it.at)}</div>
                  </div>
                  {it.sub && <div className="text-sm text-muted-foreground mt-0.5">{it.sub}</div>}
                </div>
              </motion.li>
            );
          })}
        </ol>
      )}

      {adding && <AddSymptomDialog onClose={() => setAdding(false)} onAdd={(s) => { addSymptom(s); setAdding(false); }} />}

      <p className="text-center text-xs text-muted-foreground mt-6">
        <Link to="/talk" className="text-primary font-medium">Talk to MedsBuddy</Link> to log hands-free.
      </p>
    </AppShell>
  );
}

function formatTime(at: number) {
  const d = new Date(at);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function AddSymptomDialog({ onClose, onAdd }: { onClose: () => void; onAdd: (s: { name: string; severity: number; notes?: string }) => void }) {
  const [name, setName] = useState("");
  const [severity, setSeverity] = useState(5);
  const [notes, setNotes] = useState("");
  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm grid place-items-end sm:place-items-center p-4" onClick={onClose}>
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-card rounded-3xl p-5 shadow-2xl">
        <h2 className="mb-3">Log a symptom</h2>
        <label className="block text-sm font-medium">Symptom
          <input className="mt-1 w-full rounded-xl border px-3 py-2.5" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. headache" />
        </label>
        <label className="block text-sm font-medium mt-3">Severity: <span className="text-primary">{severity}/10</span>
          <input type="range" min={1} max={10} value={severity} onChange={(e) => setSeverity(Number(e.target.value))} className="w-full mt-1 accent-[oklch(0.585_0.215_263)]" />
        </label>
        <label className="block text-sm font-medium mt-3">Notes (optional)
          <textarea className="mt-1 w-full rounded-xl border px-3 py-2.5" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="When, where, anything else…" />
        </label>
        <div className="flex gap-2 mt-5">
          <button className="flex-1 rounded-xl bg-secondary text-secondary-foreground py-2.5 font-medium" onClick={onClose}>Cancel</button>
          <button
            className="flex-1 rounded-xl bg-primary text-primary-foreground py-2.5 font-semibold disabled:opacity-50"
            disabled={!name.trim()}
            onClick={() => onAdd({ name: name.trim(), severity, notes: notes.trim() || undefined })}
          >
            Log
          </button>
        </div>
      </motion.div>
    </div>
  );
}
