import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useApp } from "@/lib/store";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Maximize2, Share2, AlertTriangle, Phone } from "lucide-react";

export const Route = createFileRoute("/emergency")({
  head: () => ({
    meta: [
      { title: "Emergency — MedsBuddy" },
      { name: "description", content: "Emergency profile and shareable QR code for first responders." },
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
    QRCode.toDataURL(payload, { width: 512, margin: 1, errorCorrectionLevel: "M" }).then(setDataUrl).catch(() => setDataUrl(""));
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
    } catch {
      /* fall through */
    }
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = "emergency-qr.png";
    a.click();
  };

  const ready = profile.name && (meds.length > 0 || profile.allergies || profile.conditions);

  return (
    <AppShell title="Emergency">
      <div className="rounded-3xl bg-destructive/10 border-2 border-destructive/30 p-5 mb-5">
        <div className="flex items-center gap-2 text-destructive font-semibold mb-2">
          <AlertTriangle className="size-5" /> For first responders
        </div>
        <p className="text-sm text-foreground">Show this QR code to paramedics, hospital staff, or anyone helping in an emergency. Works offline.</p>
      </div>

      <div className="rounded-3xl bg-card border p-5 grid place-items-center">
        {dataUrl ? (
          <button onClick={() => setFull(true)} className="block">
            <img src={dataUrl} alt="Emergency QR" className="size-64 sm:size-72" />
          </button>
        ) : (
          <div className="size-64 grid place-items-center text-muted-foreground">Generating…</div>
        )}
        <div className="text-center mt-4">
          <div className="text-lg font-semibold">{profile.name || "Add your profile"}</div>
          {profile.bloodGroup && <div className="text-sm text-muted-foreground">Blood: {profile.bloodGroup}</div>}
          {profile.allergies && <div className="text-sm text-destructive mt-1">⚠ Allergies: {profile.allergies}</div>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <button onClick={() => setFull(true)} className="rounded-2xl bg-secondary text-secondary-foreground py-3 font-medium inline-flex items-center justify-center gap-2">
          <Maximize2 className="size-4" /> Full screen
        </button>
        <button onClick={share} disabled={!dataUrl} className="rounded-2xl bg-primary text-primary-foreground py-3 font-medium inline-flex items-center justify-center gap-2 disabled:opacity-50">
          <Share2 className="size-4" /> Share
        </button>
      </div>

      {profile.emergencyContacts.length > 0 && (
        <div className="mt-5">
          <h2 className="mb-2">Emergency contacts</h2>
          <div className="space-y-2">
            {profile.emergencyContacts.map((c, i) => (
              <a key={i} href={`tel:${c.phone}`} className="flex items-center justify-between rounded-2xl bg-card border p-3">
                <div>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.relation}</div>
                </div>
                <div className="inline-flex items-center gap-2 text-primary font-semibold">
                  <Phone className="size-4" /> {c.phone}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {!ready && (
        <p className="text-center text-sm text-muted-foreground mt-5">
          Tip: add your name, allergies, and medications on the Profile page for a complete emergency QR.
        </p>
      )}

      {full && dataUrl && (
        <div className="fixed inset-0 z-50 bg-background grid place-items-center p-6" onClick={() => setFull(false)}>
          <div className="text-center">
            <img src={dataUrl} alt="Emergency QR" className="w-[min(90vw,90vh)] h-[min(90vw,90vh)] mx-auto" />
            <div className="mt-4 text-lg font-semibold">{profile.name}</div>
            {profile.bloodGroup && <div className="text-muted-foreground">Blood: {profile.bloodGroup}</div>}
            {profile.allergies && <div className="text-destructive mt-1">⚠ {profile.allergies}</div>}
            <div className="text-xs text-muted-foreground mt-4">Tap anywhere to close</div>
          </div>
        </div>
      )}
    </AppShell>
  );
}