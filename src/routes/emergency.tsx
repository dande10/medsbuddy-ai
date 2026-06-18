import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useApp } from "@/lib/store";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Maximize2, Share2, Siren, Phone, Droplet, AlertOctagon, Pill, Heart, ChevronRight, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/emergency")({
  head: () => ({
    meta: [
      { title: "SOS — MedsBuddy" },
      { name: "description", content: "Emergency health profile and shareable QR for first responders. Works offline." },
    ],
  }),
  component: Emergency,
});

function Emergency() {
  const { profile, meds } = useApp();
  const [dataUrl, setDataUrl] = useState<string>("");
  const [full, setFull] = useState(false);

  const payload = JSON.stringify({
    type: "MedsBuddyEmergencyProfile",
    name: profile.name,
    dob: profile.dob,
    bloodGroup: profile.bloodGroup,
    allergies: profile.allergies,
    conditions: profile.conditions,
    medications: meds.map((m) => `${m.name} ${m.dosage} (${m.frequency})`),
    emergencyContacts: profile.emergencyContacts,
    primaryPhysician: profile.primaryPhysician,
  });

  useEffect(() => {
    QRCode.toDataURL(payload, {
      width: 600,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#0B1736", light: "#FFFFFF" },
    }).then(setDataUrl).catch(() => setDataUrl(""));
  }, [payload]);

  const share = async () => {
    if (!dataUrl) return;
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "emergency-qr.png", { type: "image/png" });
      if (navigator.share && (navigator.canShare?.({ files: [file] }) ?? false)) {
        await navigator.share({ files: [file], title: "Emergency Profile" });
        return;
      }
    } catch { /* fall through */ }
    const a = document.createElement("a");
    a.href = dataUrl; a.download = "emergency-qr.png"; a.click();
  };

  const ready = profile.name && (meds.length > 0 || profile.allergies || profile.conditions);

  return (
    <AppShell>
      {/* Hero SOS card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-[28px] gradient-emergency text-destructive-foreground p-6 shadow-elegant mb-5">
        <div className="absolute -top-16 -right-16 size-48 rounded-full bg-white/10 blur-3xl" />
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-2xl bg-white/20 backdrop-blur grid place-items-center sos-pulse">
            <Siren className="size-6" />
          </div>
          <div>
            <div className="text-[12px] opacity-90 font-medium">For first responders</div>
            <h1 className="text-primary-foreground text-2xl">Emergency Profile</h1>
          </div>
        </div>
        <p className="text-sm opacity-95 mt-3">Show this QR to paramedics, ER staff, or anyone helping. Works fully offline.</p>
      </motion.div>

      {!ready && (
        <Link to="/profile" className="flex items-center gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4 mb-4">
          <div className="size-10 rounded-xl bg-warning/20 text-warning grid place-items-center"><AlertOctagon className="size-5" /></div>
          <div className="flex-1">
            <div className="font-semibold text-[15px]">Complete your health profile</div>
            <div className="text-xs text-muted-foreground">Add name, allergies, and meds for a complete QR.</div>
          </div>
          <ChevronRight className="size-5 text-warning" />
        </Link>
      )}

      {/* QR card */}
      <motion.div initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-3xl bg-card border shadow-card p-5 mb-4">
        <button onClick={() => setFull(true)} className="block w-full">
          <div className="rounded-2xl bg-white p-4 grid place-items-center">
            {dataUrl ? (
              <img src={dataUrl} alt="Emergency QR" className="w-full max-w-xs aspect-square" />
            ) : (
              <div className="aspect-square w-full max-w-xs grid place-items-center text-muted-foreground">Generating…</div>
            )}
          </div>
        </button>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <button onClick={() => setFull(true)} className="rounded-xl bg-secondary text-secondary-foreground py-2.5 font-medium inline-flex items-center justify-center gap-2">
            <Maximize2 className="size-4" /> Full screen
          </button>
          <button onClick={share} disabled={!dataUrl} className="rounded-xl bg-primary text-primary-foreground py-2.5 font-medium inline-flex items-center justify-center gap-2 disabled:opacity-50">
            <Share2 className="size-4" /> Share
          </button>
        </div>
      </motion.div>

      {/* Health card */}
      <div className="rounded-3xl bg-card border shadow-card p-5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Heart className="size-5 text-destructive" />
          <h2 className="text-[15px] font-semibold">Health Card</h2>
        </div>
        <div className="text-xl font-bold tracking-tight">{profile.name || "—"}</div>
        {profile.dob && <div className="text-sm text-muted-foreground">DOB {profile.dob}</div>}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <Fact icon={Droplet} label="Blood" value={profile.bloodGroup || "—"} tint="danger" />
          <Fact icon={AlertOctagon} label="Allergies" value={profile.allergies || "None"} tint="warning" />
        </div>
        {profile.conditions && (
          <div className="mt-3">
            <div className="text-xs text-muted-foreground">Conditions</div>
            <div className="text-sm font-medium">{profile.conditions}</div>
          </div>
        )}
      </div>

      {/* Medications */}
      <div className="rounded-3xl bg-card border shadow-card p-5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Pill className="size-5 text-primary" />
          <h2 className="text-[15px] font-semibold">Current medications</h2>
        </div>
        {meds.length === 0 ? (
          <Link to="/reminders" className="text-sm text-primary font-medium">Add your medications →</Link>
        ) : (
          <ul className="divide-y">
            {meds.map((m) => (
              <li key={m.id} className="py-2 flex justify-between">
                <span className="font-medium text-[14px]">{m.name} <span className="text-muted-foreground font-normal">{m.dosage}</span></span>
                <span className="text-xs text-muted-foreground">{m.frequency}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Contacts */}
      <div className="rounded-3xl bg-card border shadow-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Phone className="size-5 text-success" />
          <h2 className="text-[15px] font-semibold">Emergency contacts</h2>
        </div>
        {profile.emergencyContacts.length === 0 ? (
          <Link to="/profile" className="text-sm text-primary font-medium">Add contacts →</Link>
        ) : (
          <div className="space-y-2">
            {profile.emergencyContacts.map((c, i) => (
              <a key={i} href={`tel:${c.phone}`} className="flex items-center justify-between rounded-xl bg-secondary/40 px-3 py-2.5">
                <div>
                  <div className="font-medium text-[14px]">{c.name}</div>
                  <div className="text-[11px] text-muted-foreground">{c.relation}</div>
                </div>
                <div className="inline-flex items-center gap-1.5 text-primary font-semibold text-sm">
                  <Phone className="size-4" /> {c.phone}
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {full && dataUrl && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/95 backdrop-blur-sm grid place-items-center p-4"
            onClick={() => setFull(false)}
          >
            <motion.div initial={{ scale: 0.85 }} animate={{ scale: 1 }} exit={{ scale: 0.85 }} className="text-center max-w-md w-full">
              <div className="rounded-3xl bg-white p-5">
                <img src={dataUrl} alt="Emergency QR" className="w-full aspect-square" />
              </div>
              <div className="mt-4 text-primary-foreground">
                <div className="text-xl font-bold">{profile.name}</div>
                {profile.bloodGroup && <div className="text-sm opacity-80">Blood: {profile.bloodGroup}</div>}
                {profile.allergies && <div className="text-sm mt-1 text-warning">⚠ {profile.allergies}</div>}
              </div>
              <button className="mt-4 size-12 rounded-full bg-white/15 text-primary-foreground grid place-items-center mx-auto">
                <X className="size-5" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  );
}

function Fact({ icon: Icon, label, value, tint }: { icon: typeof Droplet; label: string; value: string; tint: "danger" | "warning" }) {
  const cls = tint === "danger" ? "bg-destructive/10 text-destructive" : "bg-warning/15 text-warning";
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className={`size-8 rounded-lg grid place-items-center ${cls}`}><Icon className="size-4" /></div>
      <div className="text-[11px] text-muted-foreground mt-2">{label}</div>
      <div className="text-sm font-semibold truncate">{value}</div>
    </div>
  );
}
