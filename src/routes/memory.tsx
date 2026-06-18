import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useApp } from "@/lib/store";
import {
  Activity,
  Pill,
  Calendar,
  FileText,
  HelpCircle,
  StickyNote,
  Plus,
  Clock,
  Check,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
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

type Kind = "symptom" | "note" | "question" | "summary" | "medication" | "appt";
type Item = { id: string; at: number; kind: Kind; title: string; sub?: string };

type Filter = "all" | "symptom" | "note" | "question" | "summary" | "medication";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "symptom", label: "Symptoms" },
  { id: "note", label: "Notes" },
  { id: "question", label: "Questions" },
  { id: "summary", label: "Summaries" },
  { id: "medication", label: "Medications" },
];

function Memory() {
  const {
    symptoms,
    doses,
    appointments,
    summaries,
    notes,
    questions,
    addSymptom,
    addNote,
    addQuestion,
    toggleQuestion,
    removeQuestion,
    removeNote,
  } = useApp();
  const [filter, setFilter] = useState<Filter>("all");
  const [composer, setComposer] = useState<null | "symptom" | "note" | "question">(null);

  const items = useMemo<Item[]>(() => {
    const all: Item[] = [
      ...symptoms.map<Item>((s) => ({
        id: "s" + s.id,
        at: s.at,
        kind: "symptom",
        title: `Symptom: ${s.name}`,
        sub: `Severity ${s.severity}/10${s.notes ? ` — ${s.notes}` : ""}`,
      })),
      ...notes.map<Item>((n) => ({
        id: "n" + n.id,
        at: n.at,
        kind: "note",
        title: "Health note",
        sub: n.text,
      })),
      ...questions.map<Item>((q) => ({
        id: "q" + q.id,
        at: q.at,
        kind: "question",
        title: q.asked ? "Asked at visit" : "Doctor question",
        sub: q.text,
      })),
      ...summaries.map<Item>((s) => ({
        id: "sum" + s.id,
        at: s.at,
        kind: "summary",
        title: "Doctor summary (approved)",
        sub: s.text.slice(0, 200),
      })),
      ...doses.map<Item>((d) => ({
        id: "d" + d.id,
        at: d.at,
        kind: "medication",
        title: d.medName,
        sub: `Marked ${d.status}`,
      })),
      ...appointments.map<Item>((a) => ({
        id: "a" + a.id,
        at: a.at,
        kind: "appt",
        title: `Appointment: ${a.doctor}`,
        sub: a.notes,
      })),
    ];
    const filtered = filter === "all" ? all : all.filter((i) => i.kind === filter);
    return filtered.sort((a, b) => b.at - a.at);
  }, [symptoms, notes, questions, summaries, doses, appointments, filter]);

  return (
    <AppShell>
      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="text-xs text-muted-foreground font-medium">Your health timeline</div>
          <h1>Health memory</h1>
        </div>
        <button onClick={() => setComposer("symptom")} className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold inline-flex items-center gap-1.5 shadow-elegant">
          <Plus className="size-4" /> Log
        </button>
      </div>

      {/* Quick-add row */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <QuickAdd icon={Activity} label="Symptom" onClick={() => setComposer("symptom")} />
        <QuickAdd icon={StickyNote} label="Note" onClick={() => setComposer("note")} />
        <QuickAdd icon={HelpCircle} label="Question" onClick={() => setComposer("question")} />
      </div>

      {/* Filter chips */}
      <div className="flex gap-1.5 overflow-x-auto -mx-5 px-5 pb-3 mb-2 no-scrollbar">
        {FILTERS.map((f) => {
          const active = f.id === filter;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium border transition ${
                active
                  ? "bg-primary text-primary-foreground border-primary shadow-card"
                  : "bg-card text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {items.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-border bg-card/50 p-8 text-center">
          <div className="size-14 rounded-2xl bg-primary/10 text-primary grid place-items-center mx-auto mb-3">
            <Clock className="size-6" />
          </div>
          <div className="font-semibold">
            {filter === "all" ? "Your timeline starts here" : "Nothing here yet"}
          </div>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
            Log symptoms, health notes, and questions for your doctor — only meaningful health events live here.
          </p>
          <button onClick={() => setComposer("symptom")} className="mt-4 rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold">
            Log your first symptom
          </button>
        </div>
      ) : (
        <ol className="relative ml-3 space-y-3 pl-6 border-l-2 border-border">
          {items.map((it, idx) => {
            const Icon =
              it.kind === "symptom" ? Activity :
              it.kind === "medication" ? Pill :
              it.kind === "appt" ? Calendar :
              it.kind === "summary" ? FileText :
              it.kind === "question" ? HelpCircle :
              StickyNote;
            const tone =
              it.kind === "symptom" ? "bg-warning/15 text-warning" :
              it.kind === "medication" ? "bg-primary/15 text-primary" :
              it.kind === "appt" ? "bg-success/15 text-success" :
              it.kind === "summary" ? "bg-success/15 text-success" :
              it.kind === "question" ? "bg-primary/15 text-primary" :
              "bg-secondary text-secondary-foreground";
            const qid = it.kind === "question" ? it.id.slice(1) : null;
            const nid = it.kind === "note" ? it.id.slice(1) : null;
            const qRow = qid ? questions.find((q) => q.id === qid) : null;
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
                    <div className="font-semibold text-[14px]">{it.title}</div>
                    <div className="text-[11px] text-muted-foreground shrink-0">{formatTime(it.at)}</div>
                  </div>
                  {it.sub && <div className="text-sm text-muted-foreground mt-0.5">{it.sub}</div>}
                  {(qid || nid) && (
                    <div className="flex gap-2 mt-2.5 pt-2.5 border-t border-border/60">
                      {qid && qRow && (
                        <button
                          onClick={() => toggleQuestion(qid)}
                          className={`text-[12px] font-medium inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${
                            qRow.asked ? "bg-success/15 text-success" : "bg-primary/10 text-primary"
                          }`}
                        >
                          <Check className="size-3" /> {qRow.asked ? "Asked" : "Mark asked"}
                        </button>
                      )}
                      <button
                        onClick={() => (qid ? removeQuestion(qid) : nid ? removeNote(nid) : undefined)}
                        className="text-[12px] font-medium text-muted-foreground hover:text-destructive inline-flex items-center gap-1 ml-auto"
                      >
                        <Trash2 className="size-3" /> Remove
                      </button>
                    </div>
                  )}
                </div>
              </motion.li>
            );
          })}
        </ol>
      )}

      {composer === "symptom" && (
        <AddSymptomDialog onClose={() => setComposer(null)} onAdd={(s) => { addSymptom(s); setComposer(null); }} />
      )}
      {composer === "note" && (
        <TextDialog
          title="Add a health note"
          placeholder="e.g. Felt dizzy after lunch"
          onClose={() => setComposer(null)}
          onSave={(t) => { addNote(t); setComposer(null); }}
        />
      )}
      {composer === "question" && (
        <TextDialog
          title="Save a question for your doctor"
          placeholder="e.g. Could my headaches be medication related?"
          onClose={() => setComposer(null)}
          onSave={(t) => { addQuestion(t); setComposer(null); }}
        />
      )}

      <p className="text-center text-xs text-muted-foreground mt-6">
        <Link to="/talk" className="text-primary font-medium">Talk to MedsBuddy</Link> to log hands-free. Chat history lives on the Talk page.
      </p>
    </AppShell>
  );
}

function QuickAdd({ icon: Icon, label, onClick }: { icon: typeof Activity; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl bg-card border shadow-card px-3 py-3 flex flex-col items-center gap-1 text-[12px] font-medium hover:bg-secondary/40 transition active:scale-[0.98]"
    >
      <Icon className="size-5 text-primary" />
      {label}
    </button>
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
