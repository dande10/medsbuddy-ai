import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useApp, adherence } from "@/lib/store";
import { Pill, Check, X, Trash2, Plus } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/reminders")({
  head: () => ({
    meta: [
      { title: "Medications — MedsBuddy" },
      { name: "description", content: "Track medications, log doses, and watch your adherence." },
    ],
  }),
  component: Reminders,
});

function Reminders() {
  const { meds, doses, addMed, removeMed, logDose } = useApp();
  const [open, setOpen] = useState(false);
  const adh = adherence(doses, 7);

  return (
    <AppShell>
      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="text-xs text-muted-foreground font-medium">Stay on schedule</div>
          <h1>Medications</h1>
        </div>
        <button onClick={() => setOpen(true)} className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold inline-flex items-center gap-1.5 shadow-elegant">
          <Plus className="size-4" /> Add
        </button>
      </div>

      {/* Adherence ring */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl gradient-hero text-primary-foreground p-5 mb-5 shadow-elegant relative overflow-hidden">
        <div className="absolute -top-10 -right-10 size-32 rounded-full bg-white/10 blur-2xl" />
        <div className="text-sm opacity-85 font-medium">7-day adherence</div>
        <div className="flex items-end gap-3 mt-1">
          <div className="text-5xl font-bold tracking-tight">{adh}<span className="text-2xl">%</span></div>
          <div className="text-xs opacity-80 pb-2">
            {doses.filter((d) => d.at > Date.now() - 7 * 86400000).length} doses logged
          </div>
        </div>
        <div className="mt-3 h-2 rounded-full bg-white/20 overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${adh}%` }} transition={{ duration: 0.8 }} className="h-full bg-white rounded-full" />
        </div>
      </motion.div>

      {meds.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-border bg-card/50 p-8 text-center">
          <div className="size-14 rounded-2xl bg-primary/10 text-primary grid place-items-center mx-auto mb-3">
            <Pill className="size-6" />
          </div>
          <div className="font-semibold">Let's set up your medications</div>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
            Add what you take and MedsBuddy will help you stay on track — and remind you when you forget.
          </p>
          <button onClick={() => setOpen(true)} className="mt-4 rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold">
            Add first medication
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {meds.map((m, idx) => {
            const last = doses.find((d) => d.medId === m.id);
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="rounded-2xl bg-card border shadow-card p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="size-11 rounded-xl bg-primary/10 text-primary grid place-items-center"><Pill className="size-5" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[16px] truncate">{m.name}</div>
                    <div className="text-sm text-muted-foreground">{m.dosage} · {m.frequency}</div>
                    {last && (
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Last: {last.status} · {new Date(last.at).toLocaleString()}
                      </div>
                    )}
                  </div>
                  <button onClick={() => removeMed(m.id)} className="text-muted-foreground p-1" aria-label="Remove">
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => logDose(m.id, "taken")}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary text-primary-foreground py-2.5 font-semibold active:scale-95 transition"
                  >
                    <Check className="size-4" /> Taken
                  </button>
                  <button
                    onClick={() => logDose(m.id, "skipped")}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-secondary text-secondary-foreground py-2.5 font-semibold active:scale-95 transition"
                  >
                    <X className="size-4" /> Skip
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {open && <AddMedDialog onClose={() => setOpen(false)} onAdd={(m) => { addMed(m); setOpen(false); }} />}
    </AppShell>
  );
}

function AddMedDialog({ onClose, onAdd }: { onClose: () => void; onAdd: (m: { name: string; dosage: string; frequency: string; times: string[] }) => void }) {
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("Once daily");
  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm grid place-items-end sm:place-items-center p-4" onClick={onClose}>
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-card rounded-3xl p-5 shadow-2xl">
        <h2 className="mb-3">Add medication</h2>
        <div className="space-y-3">
          <Field label="Name"><input className="w-full rounded-xl border px-3 py-2.5" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Lisinopril" /></Field>
          <Field label="Dosage"><input className="w-full rounded-xl border px-3 py-2.5" value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder="e.g. 10mg" /></Field>
          <Field label="Frequency">
            <select className="w-full rounded-xl border px-3 py-2.5 bg-background" value={frequency} onChange={(e) => setFrequency(e.target.value)}>
              <option>Once daily</option><option>Twice daily</option><option>Three times daily</option><option>As needed</option>
            </select>
          </Field>
        </div>
        <div className="flex gap-2 mt-5">
          <button className="flex-1 rounded-xl bg-secondary text-secondary-foreground py-2.5 font-medium" onClick={onClose}>Cancel</button>
          <button
            className="flex-1 rounded-xl bg-primary text-primary-foreground py-2.5 font-semibold disabled:opacity-50"
            disabled={!name.trim()}
            onClick={() => onAdd({ name: name.trim(), dosage: dosage.trim(), frequency, times: [] })}
          >Save</button>
        </div>
      </motion.div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
