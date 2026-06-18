import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useApp, type Profile } from "@/lib/store";
import { useState } from "react";
import { Plus, Trash2, CloudOff } from "lucide-react";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — MedsBuddy" },
      { name: "description", content: "Your medical profile used across MedsBuddy." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { profile, setProfile, simulateOffline, setSimulateOffline } = useApp();
  const [draft, setDraft] = useState<Profile>(profile);
  const [saved, setSaved] = useState(false);

  const upd = <K extends keyof Profile>(k: K, v: Profile[K]) => setDraft({ ...draft, [k]: v });

  const addContact = () => upd("emergencyContacts", [...draft.emergencyContacts, { name: "", phone: "", relation: "" }]);
  const removeContact = (i: number) => upd("emergencyContacts", draft.emergencyContacts.filter((_, idx) => idx !== i));
  const updateContact = (i: number, k: "name" | "phone" | "relation", v: string) =>
    upd("emergencyContacts", draft.emergencyContacts.map((c, idx) => (idx === i ? { ...c, [k]: v } : c)));

  return (
    <AppShell title="Your profile">
      <p className="text-sm text-muted-foreground mb-5">
        This information is stored on your device and used for AI replies, the doctor summary, and the emergency QR.
      </p>

      {/* Demo / Offline toggle */}
      <div className="rounded-2xl border bg-card shadow-card p-4 mb-5 flex items-center gap-3">
        <div className={`size-10 rounded-xl grid place-items-center shrink-0 ${simulateOffline ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"}`}>
          <CloudOff className="size-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[15px]">Simulate Offline Mode</div>
          <div className="text-[12px] text-muted-foreground">Demo offline behavior without turning Wi-Fi off. Doctor Summary, QR, and local data keep working.</div>
        </div>
        <button
          role="switch"
          aria-checked={simulateOffline}
          onClick={() => setSimulateOffline(!simulateOffline)}
          className={`relative h-7 w-12 rounded-full transition-colors shrink-0 ${simulateOffline ? "bg-primary" : "bg-secondary border"}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 size-6 rounded-full bg-background shadow transition-transform ${simulateOffline ? "translate-x-5" : "translate-x-0"}`}
          />
        </button>
      </div>

      <div className="space-y-3">
        <F label="Full name"><I value={draft.name} onChange={(v) => upd("name", v)} placeholder="Jane Doe" /></F>
        <div className="grid grid-cols-2 gap-3">
          <F label="Date of birth"><I type="date" value={draft.dob} onChange={(v) => upd("dob", v)} /></F>
          <F label="Blood group"><I value={draft.bloodGroup} onChange={(v) => upd("bloodGroup", v)} placeholder="O+" /></F>
        </div>
        <F label="Allergies"><I value={draft.allergies} onChange={(v) => upd("allergies", v)} placeholder="Penicillin, peanuts…" /></F>
        <F label="Medical conditions"><I value={draft.conditions} onChange={(v) => upd("conditions", v)} placeholder="Hypertension, diabetes…" /></F>
        <F label="Primary physician"><I value={draft.primaryPhysician} onChange={(v) => upd("primaryPhysician", v)} placeholder="Dr. Smith — 555-1234" /></F>

        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <h2>Emergency contacts</h2>
            <button onClick={addContact} className="inline-flex items-center gap-1 text-sm text-primary font-medium">
              <Plus className="size-4" /> Add
            </button>
          </div>
          {draft.emergencyContacts.length === 0 && (
            <div className="text-sm text-muted-foreground">No contacts yet.</div>
          )}
          <div className="space-y-3">
            {draft.emergencyContacts.map((c, i) => (
              <div key={i} className="rounded-2xl bg-card border p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <I value={c.name} onChange={(v) => updateContact(i, "name", v)} placeholder="Name" />
                  <I value={c.relation} onChange={(v) => updateContact(i, "relation", v)} placeholder="Relation" />
                </div>
                <div className="flex gap-2">
                  <I value={c.phone} onChange={(v) => updateContact(i, "phone", v)} placeholder="Phone" />
                  <button onClick={() => removeContact(i)} className="size-10 rounded-xl bg-secondary text-secondary-foreground grid place-items-center" aria-label="Remove">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => {
            setProfile(draft);
            setSaved(true);
            setTimeout(() => setSaved(false), 1500);
          }}
          className="w-full rounded-2xl bg-primary text-primary-foreground py-3.5 font-semibold mt-4"
        >
          {saved ? "Saved ✓" : "Save profile"}
        </button>
      </div>
    </AppShell>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
function I({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border bg-background px-3 py-2.5 outline-none focus:ring-2 focus:ring-ring"
    />
  );
}