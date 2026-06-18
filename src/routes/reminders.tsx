import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useApp, adherence } from "@/lib/store";
import { Pill, Check, X, Trash2, Plus } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/reminders")({
  head: () => ({
    meta: [
      { title: "Medications — MedsBuddy" },
      { name: "description", content: "Track your medications, doses, and adherence." },
    ],
  }),
  component: Reminders,
});

function Reminders() {
  const { meds, doses, addMed, removeMed, logDose } = useApp();
  const [open, setOpen] = useState(false);
  const adh = adherence(doses, 7);

  return (
    <AppShell title="Medications">
      <div className="rounded-2xl bg-primary/10 border border-primary/20 p-4 mb-4">
        <div className="text-sm text-primary font-medium">7-day adherence</div>
        <div className="text-3xl font-bold text-primary mt-1">{adh}%</div>
        <div className="text-xs text-muted-foreground mt-1">
          {doses.filter((d) => d.at > Date.now() - 7 * 86400000).length} doses logged
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2>Your medications</h2>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium"
        >
          <Plus className="size-4" /> Add
        </button>
      </div>

      {meds.length === 0 ? (
        <div className="text-center text-muted-foreground py-10">
          <Pill className="size-10 mx-auto mb-2 opacity-50" />
          <p>No medications yet. Tap Add to start.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {meds.map((m) => {
            const last = doses.find((d) => d.medId === m.id);
            return (
              <div key={m.id} className="rounded-2xl bg-card border p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-lg">{m.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {m.dosage} · {m.frequency}
                    </div>
                    {last && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Last: {last.status} · {new Date(last.at).toLocaleString()}
                      </div>
                    )}
                  </div>
                  <button onClick={() => removeMed(m.id)} className="text-muted-foreground" aria-label="Remove">
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => logDose(m.id, "taken")}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary text-primary-foreground py-2.5 font-medium"
                  >
                    <Check className="size-4" /> Taken
                  </button>
                  <button
                    onClick={() => logDose(m.id, "skipped")}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-secondary text-secondary-foreground py-2.5 font-medium"
                  >
                    <X className="size-4" /> Skip
                  </button>
                </div>
              </div>
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
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-card rounded-3xl p-5 shadow-2xl">
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
            className="flex-1 rounded-xl bg-primary text-primary-foreground py-2.5 font-medium disabled:opacity-50"
            disabled={!name.trim()}
            onClick={() => onAdd({ name: name.trim(), dosage: dosage.trim(), frequency, times: [] })}
          >
            Save
          </button>
        </div>
      </div>
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