import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { MicButton } from "@/components/mic-button";
import { useApp } from "@/lib/store";
import { detectNavigation } from "@/lib/nav-commands";
import { aiChat } from "@/lib/ai-chat.functions";
import { speak, stopSpeaking } from "@/lib/voice";
import { useEffect, useRef, useState } from "react";
import { Trash2, Send, Volume2 } from "lucide-react";

export const Route = createFileRoute("/talk")({
  head: () => ({
    meta: [
      { title: "Talk — MedsBuddy" },
      { name: "description", content: "Speak naturally to your AI patient advocate." },
    ],
  }),
  component: TalkPage,
});

function buildSystemPrompt(state: ReturnType<typeof useApp.getState>): string {
  const { profile, meds, doses, symptoms } = state;
  const recentDoses = doses.slice(0, 10).map((d) => `${new Date(d.at).toLocaleString()}: ${d.medName} — ${d.status}`).join("; ");
  const recentSymp = symptoms.slice(0, 8).map((s) => `${new Date(s.at).toLocaleString()}: ${s.name} (severity ${s.severity})`).join("; ");
  return [
    "You are MedsBuddy AI, a warm, calm, voice-first patient advocate.",
    "Speak in short, clear sentences (1-3 sentences). You are not a doctor; remind users to consult one for diagnosis.",
    "If user reports a symptom, acknowledge and confirm it has been logged.",
    "If user asks about their meds or history, use the context below — DO NOT invent.",
    "",
    `Patient: ${profile.name || "Unknown"}, DOB ${profile.dob || "?"}, allergies: ${profile.allergies || "none recorded"}, conditions: ${profile.conditions || "none recorded"}.`,
    `Medications: ${meds.map((m) => `${m.name} ${m.dosage} (${m.frequency})`).join("; ") || "none"}.`,
    `Recent doses: ${recentDoses || "none"}.`,
    `Recent symptoms: ${recentSymp || "none"}.`,
  ].join("\n");
}

function looksMedical(text: string): boolean {
  return /side effect|interaction|recall|safe to take|what is|how does|symptom of/i.test(text);
}

function looksLikeSymptom(text: string): { name: string; severity: number } | null {
  const m = text.match(/\b(?:i (?:feel|have|am)|my .+ (?:hurts|aches))\b[^.]*/i);
  if (!m) return null;
  const symptomMatch = text.match(/\b(dizz\w*|headache|nause\w*|tired|fatigue|pain|chest pain|short(?:ness)? of breath|cough|fever|anxious|nausea|vomit\w*)\b/i);
  if (!symptomMatch) return null;
  return { name: symptomMatch[0].toLowerCase(), severity: 5 };
}

function TalkPage() {
  const navigate = useNavigate();
  const { chat, appendChat, clearChat, addSymptom } = useApp();
  const [busy, setBusy] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [autoListen, setAutoListen] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chat.length, busy]);

  const handleUtterance = async (raw: string) => {
    const text = raw.trim();
    if (!text || busy) return;
    setAutoListen(false);

    // 1) Smart navigation
    const nav = detectNavigation(text);
    if (nav) {
      appendChat({ role: "user", content: text });
      appendChat({ role: "assistant", content: `Opening ${nav.label}.` });
      setSpeaking(true);
      await speak(`Opening ${nav.label}.`, () => setSpeaking(false));
      navigate({ to: nav.to });
      return;
    }

    // 2) Symptom capture
    const symp = looksLikeSymptom(text);
    if (symp) {
      addSymptom({ name: symp.name, severity: symp.severity, notes: text });
    }

    appendChat({ role: "user", content: text });
    setBusy(true);
    try {
      const state = useApp.getState();
      const sys = buildSystemPrompt(state);
      const history = state.chat.slice(-8).map((m) => ({ role: m.role, content: m.content }));
      const useSearch = looksMedical(text) && (typeof navigator === "undefined" || navigator.onLine);

      const { reply } = await aiChat({
        data: {
          messages: [
            { role: "system" as const, content: sys },
            ...history,
            { role: "user" as const, content: text },
          ],
          useWebSearch: useSearch,
          searchQuery: useSearch ? text : undefined,
        },
      });
      const finalReply = (symp ? `Got it — I've logged "${symp.name}". ` : "") + reply;
      appendChat({ role: "assistant", content: finalReply });
      setBusy(false);
      setSpeaking(true);
      await speak(finalReply, () => {
        setSpeaking(false);
        setAutoListen(true);
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not reach the AI.";
      appendChat({ role: "assistant", content: `Sorry — ${msg}` });
      setBusy(false);
    }
  };

  return (
    <AppShell title="Talk to MedsBuddy">
      <div className="flex flex-col h-[calc(100vh-260px)] min-h-[420px]">
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-1">
          {chat.length === 0 && (
            <div className="text-center text-muted-foreground py-12 px-6">
              <Volume2 className="size-10 mx-auto mb-3 text-primary/60" />
              <p className="font-medium text-foreground">Try saying:</p>
              <ul className="mt-3 space-y-1.5 text-sm">
                <li>"Did I take my medicine today?"</li>
                <li>"I feel dizzy."</li>
                <li>"Prepare me for my doctor visit."</li>
                <li>"Open emergency."</li>
              </ul>
            </div>
          )}
          {chat.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${
                  m.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {busy && <div className="text-sm text-muted-foreground px-2">Thinking…</div>}
        </div>

        <div className="pt-4 border-t mt-3">
          <div className="flex items-center justify-center mb-4">
            <MicButton
              onTranscript={handleUtterance}
              busy={busy}
              speaking={speaking}
              autoStart={autoListen}
              size="xl"
            />
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const t = input.trim();
              if (!t) return;
              setInput("");
              handleUtterance(t);
            }}
            className="flex gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Or type a message…"
              className="flex-1 rounded-full border bg-card px-4 py-2.5 text-[15px] outline-none focus:ring-2 focus:ring-ring"
            />
            <button type="submit" className="size-11 rounded-full bg-primary text-primary-foreground grid place-items-center" aria-label="Send">
              <Send className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => {
                stopSpeaking();
                clearChat();
              }}
              className="size-11 rounded-full bg-secondary text-secondary-foreground grid place-items-center"
              aria-label="Clear conversation"
            >
              <Trash2 className="size-5" />
            </button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}