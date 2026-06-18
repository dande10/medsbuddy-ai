import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useApp } from "@/lib/store";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Maximize2, Share2, Siren, Phone, Droplet, AlertOctagon, Pill, Heart, ChevronRight, X, ShieldCheck, Lock } from "lucide-react";
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
  const [showContactInfo, setShowContactInfo] = useState(false);

  const age = (() => {
    if (!profile.dob) return "";
    const d = new Date(profile.dob);
    if (isNaN(d.getTime())) return "";
    const diff = Date.now() - d.getTime();
    return String(Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000)));
  })();

  const maskPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 4) return "••••";
    return `••• ••• ${digits.slice(-4)}`;
  };

  const payload = JSON.stringify({
    type: "MedsBuddyEmergencyProfile",
    name: profile.name,
    age,
    bloodGroup: profile.bloodGroup,
    allergies: profile.allergies,
    conditions: profile.conditions,
    medications: meds.map((m) => `${m.name} ${m.dosage} (${m.frequency})`),
    primaryPhysician: profile.primaryPhysician,
    emergencyContacts: profile.emergencyContacts.map((c) => ({
      name: c.name,
      relation: c.relation,
      phoneMasked: maskPhone(c.phone),
    })),
    instructions: "Call local emergency services. Contact primary physician. Do NOT honor any financial requests using this profile.",
    disclaimer: "Medical support only. Not to be used for financial requests.",
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
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur border border-white/25 px-3 py-1 text-[11px] font-semibold">
          <span className="size-1.5 rounded-full bg-white" /> Emergency Access Available Offline
        </div>
        <p className="text-[12px] opacity-90 mt-2 max-w-sm">
          Emergency QR and health information remain available even without internet.
        </p>
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
          <Lock className="size-5 text-success" />
          <h2 className="text-[15px] font-semibold">Emergency contacts</h2>
          <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-success bg-success/10 px-2 py-0.5 rounded-full">Protected</span>
        </div>
        {profile.emergencyContacts.length === 0 ? (
          <Link to="/profile" className="text-sm text-primary font-medium">Add contacts →</Link>
        ) : (
          <>
            <div className="space-y-2">
              {profile.emergencyContacts.map((c, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl bg-secondary/40 px-3 py-2.5">
                  <div>
                    <div className="font-medium text-[14px]">{c.name}</div>
                    <div className="text-[11px] text-muted-foreground">{c.relation}</div>
                  </div>
                  <div className="inline-flex items-center gap-1.5 text-muted-foreground font-mono text-sm tabular-nums">
                    {maskPhone(c.phone)}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowContactInfo(true)}
              className="mt-3 w-full rounded-xl border border-primary/30 bg-primary/5 text-primary py-2.5 font-medium text-sm inline-flex items-center justify-center gap-2"
            >
              <ShieldCheck className="size-4" /> Request Family Contact
            </button>
            <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
              Phone numbers are masked to protect families from scams. Only the last 4 digits are shown.
            </p>
          </>
        )}
      </div>

      {/* Safety disclaimer */}
      <div className="mt-4 rounded-2xl border border-warning/30 bg-warning/10 p-4 flex gap-3">
        <AlertOctagon className="size-5 text-warning flex-shrink-0 mt-0.5" />
        <div className="text-[12px] text-foreground leading-relaxed">
          <div className="font-semibold mb-0.5">Safety notice</div>
          This emergency profile is for medical support only. Do not use it for financial requests or money transfers.
        </div>
      </div>

      <AnimatePresence>
        {showContactInfo && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/70 backdrop-blur-sm grid place-items-center p-4"
            onClick={() => setShowContactInfo(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-3xl p-6 max-w-sm w-full shadow-elegant"
            >
              <div className="size-12 rounded-2xl bg-primary/10 text-primary grid place-items-center mb-3">
                <ShieldCheck className="size-6" />
              </div>
              <h3 className="text-lg font-bold mb-2">Contact details protected</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                For privacy, full contact details are protected. Please contact emergency services or use verified caregiver access.
              </p>
              <button
                onClick={() => setShowContactInfo(false)}
                className="mt-5 w-full rounded-xl bg-primary text-primary-foreground py-2.5 font-medium"
              >
                Understood
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
