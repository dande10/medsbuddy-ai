import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useApp } from "@/lib/store";
import { Activity, Plus, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/symptoms")({
  head: () => ({
    meta: [
      { title: "Symptoms — MedsBuddy" },
      { name: "description", content: "Log symptoms for doctor visits and daily tracking." },
    ],
  }),
  component: Symptoms,
});

const commonSymptoms = ["Fever", "Dizziness", "Fatigue", "Leg pain", "Back pain", "Headache"];

function Symptoms() {
  const { symptoms, addSymptom, removeSymptom, removeSymptomsByKeyword } = useApp();
  const [name, setName] = useState("");
  const [severity, setSeverity] = useState(5);
  const [notes, setNotes] = useState("");

  const saveSymptom = () => {
    const trimmedName = name.trim();
    const trimmedNotes = notes.trim();
    if (!trimmedName) return;

    addSymptom({
      name: trimmedName,
      severity,
      notes: trimmedNotes || undefined,
    });
    toast.success("Symptom logged");
    setName("");
    setSeverity(5);
    setNotes("");
  };

  const deleteSymptom = (symptom: (typeof symptoms)[number]) => {
    if (isUtiRelatedSymptom(symptom)) {
      const removedCount = removeSymptomsByKeyword("UTI");
      if (removedCount > 0) {
        toast.success("Removed UTI-related symptoms");
        return;
      }
    }

    removeSymptom(symptom.id);
    toast.success("Symptom removed");
  };

  return (
    <AppShell>
      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="text-xs text-muted-foreground font-medium">Daily health tracking</div>
          <h1>Symptoms</h1>
        </div>
      </div>

      <section className="rounded-3xl bg-card border shadow-card p-4 mb-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="size-11 rounded-2xl bg-warning/15 text-warning grid place-items-center">
            <Activity className="size-5" />
          </div>
          <div>
            <div className="font-semibold">Log symptom</div>
            <div className="text-xs text-muted-foreground">
              Save what happened so MedsBuddy can include it in doctor visits.
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="text-sm font-medium">Symptom</span>
            <input
              className="mt-1 w-full rounded-xl border bg-background px-3 py-2.5"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. evening dizziness"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            {commonSymptoms.map((symptom) => (
              <button
                key={symptom}
                type="button"
                onClick={() => setName(symptom)}
                className="rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground"
              >
                {symptom}
              </button>
            ))}
          </div>

          <label className="block">
            <span className="text-sm font-medium">Severity: {severity}/10</span>
            <input
              className="mt-2 w-full accent-primary"
              type="range"
              min="1"
              max="10"
              value={severity}
              onChange={(event) => setSeverity(Number(event.target.value))}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium">Notes</span>
            <textarea
              className="mt-1 min-h-24 w-full rounded-xl border bg-background px-3 py-2.5"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="When did it start? What makes it better or worse?"
            />
          </label>

          <button
            type="button"
            onClick={saveSymptom}
            disabled={!name.trim()}
            className="w-full rounded-2xl bg-primary text-primary-foreground py-3 font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Plus className="size-4" /> Save symptom
          </button>
        </div>
      </section>

      <div className="flex items-baseline justify-between mb-3">
        <h2>Recent symptoms</h2>
        <span className="text-xs text-muted-foreground">{symptoms.length} logged</span>
      </div>

      {symptoms.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-border bg-card/50 p-8 text-center">
          <div className="size-14 rounded-2xl bg-warning/15 text-warning grid place-items-center mx-auto mb-3">
            <Activity className="size-6" />
          </div>
          <div className="font-semibold">No symptoms logged yet</div>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
            Add a symptom above. It will be available for Doctor Visit summaries.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {symptoms.map((symptom, index) => (
            <motion.article
              key={symptom.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.03, 0.18) }}
              className="rounded-2xl bg-card border shadow-card p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-[16px]">{symptom.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {formatDateTime(symptom.at)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="rounded-full bg-warning/15 text-warning px-3 py-1 text-xs font-semibold">
                    {symptom.severity}/10
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteSymptom(symptom)}
                    className="size-9 rounded-full border bg-background text-muted-foreground grid place-items-center transition hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Delete ${symptom.name}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
              {symptom.notes && (
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {symptom.notes}
                </p>
              )}
            </motion.article>
          ))}
        </div>
      )}
    </AppShell>
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

function isUtiRelatedSymptom(symptom: { name: string; notes?: string }) {
  return /\buti\b|urinary tract infection|urinary infection|burning while urinating|burning or discomfort while urinating|discomfort while urinating|urinating|urination/i.test(
    `${symptom.name} ${symptom.notes ?? ""}`,
  );
}
