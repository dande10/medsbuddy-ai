import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { MicButton } from "@/components/mic-button";
import { AiOrb } from "@/components/ai-orb";
import { useApp } from "@/lib/store";
import { detectNavigation } from "@/lib/nav-commands";
import { aiChat } from "@/lib/ai-chat.functions";
import { speak, stopSpeaking } from "@/lib/voice";
import { useEffect, useRef, useState } from "react";
import { Trash2, Send, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/talk")({
  head: () => ({
    meta: [
      { title: "Talk — MedsBuddy" },
      { name: "description", content: "Speak naturally with your AI patient advocate." },
    ],
  }),
  component: TalkPage,
});

const SUGGESTIONS = [
  "Did I take my medicine today?",
  "Prepare me for my appointment",
  "Explain my medication",
  "Read my health summary",
];

function buildSystemPrompt(state: ReturnType<typeof useApp.getState>): string {
  const { profile, meds, doses, symptoms } = state;
  const recentDoses = doses.slice(0, 10).map((d) => `${new Date(d.at).toLocaleString()}: ${d.medName} — ${d.status}`).join("; ");
  const recentSymp = symptoms.slice(0, 8).map((s) => `${new Date(s.at).toLocaleString()}: ${s.name} (severity ${s.severity})`).join("; ");
  return [
    "You are MedsBuddy, an AI Patient Advocate — a caring healthcare companion, not a chatbot, assistant, search engine, or registration form.",
    "",
    "## Identity & purpose",
    "Name: MedsBuddy. Role: AI Patient Advocate.",
    "Mission: help the patient remember important health information, track symptoms, organize medications, prepare for doctor visits, and feel supported throughout their healthcare journey.",
    "When the patient asks who or what you are, proactively explain your purpose in warm, human language. Examples:",
    "  - \"Who are you?\" → \"I'm MedsBuddy, your AI Patient Advocate. I'm here to help you stay organized, remember important health information, and prepare for doctor visits.\"",
    "  - \"What are you doing here?\" → \"I'm here to help you keep track of your health, medications, symptoms, and doctor visits. Think of me as your personal health companion.\"",
    "  - \"Are you a doctor?\" → \"No, I'm not a doctor. I'm a healthcare companion that helps you organize information and prepare for conversations with your healthcare providers.\"",
    "  - \"How are you today?\" → \"I'm doing well and ready to help. How are you feeling today?\" — then gently ask about symptoms, medication concerns, or whether they'd like to add a health note.",
    "",
    "## Voice & personality",
    "Always: friendly, caring, calm, supportive, encouraging, professional.",
    "Never: robotic, cold, judgmental, overly technical, or salesy.",
    "Use short, natural sentences (1–3). Speak the way a trusted companion would, not a customer-service bot. No emoji unless the patient uses them first. No medical disclaimers stuffed into every reply — only when truly relevant.",
    "",
    "## Proactive care",
    "If the patient reports a symptom: acknowledge warmly (\"I'm sorry you're experiencing that.\"), confirm it has been remembered for their next doctor visit, and ask one gentle follow-up if helpful.",
    "If they share a health detail or concern: respond with \"I've made a note of that.\" so they feel heard.",
    "If they share multiple things: \"I'll include this in your health summary so it's easier to discuss with your doctor.\"",
    "If they seem unsure what to do, offer a few warm options: talk about how they're feeling, review medications, prepare for a visit, or update their health timeline.",
    "",
    "## Boundaries",
    "You are not a doctor and do not diagnose, prescribe, or change dosages — gently encourage the patient to bring concerns to their clinician.",
    "For anything urgent (chest pain, trouble breathing, suicidal thoughts, severe bleeding), tell them kindly to call emergency services right away.",
    "Use the patient context below — never invent medications, symptoms, or history. If something isn't recorded, say so honestly and offer to add it.",
    "",
    "## Patient context",
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

    const nav = detectNavigation(text);
    if (nav) {
      appendChat({ role: "user", content: text });
      appendChat({ role: "assistant", content: `Opening ${nav.label}.` });
      setSpeaking(true);
      await speak(`Opening ${nav.label}.`, () => setSpeaking(false));
      navigate({ to: nav.to });
      return;
    }

    const symp = looksLikeSymptom(text);
    if (symp) addSymptom({ name: symp.name, severity: symp.severity, notes: text });

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
      await speak(finalReply, () => { setSpeaking(false); setAutoListen(true); });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not reach the AI.";
      appendChat({ role: "assistant", content: `Sorry — ${msg}` });
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="flex flex-col" style={{ minHeight: "calc(100vh - 200px)" }}>
        {/* AI header */}
        <div className="flex items-center gap-4 mb-4">
          <AiOrb size={64} speaking={speaking} listening={autoListen} thinking={busy} />
          <div className="flex-1">
            <div className="text-xs text-muted-foreground font-medium">MedsBuddy AI</div>
            <div className="text-lg font-semibold tracking-tight leading-tight">
              {busy ? "Thinking…" : speaking ? "Speaking…" : "How can I help?"}
            </div>
          </div>
          {chat.length > 0 && (
            <button
              onClick={() => { stopSpeaking(); clearChat(); }}
              className="size-10 rounded-full bg-card border grid place-items-center text-muted-foreground hover:bg-secondary transition"
              aria-label="Clear conversation"
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </div>

        {/* Chat */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-1 -mx-1 px-1">
          {chat.length === 0 && (
            <div className="py-6">
              <div className="text-center text-sm text-muted-foreground mb-4 inline-flex items-center gap-1.5 mx-auto w-full justify-center">
                <Sparkles className="size-4 text-primary" />
                Try one of these
              </div>
              <div className="grid gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleUtterance(s)}
                    className="text-left rounded-2xl border bg-card hover:bg-secondary/50 shadow-card px-4 py-3 text-[15px] transition active:scale-[0.98]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence initial={false}>
            {chat.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed shadow-card ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-card border rounded-bl-md"
                  }`}
                >
                  {m.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {busy && (
            <div className="flex justify-start">
              <div className="bg-card border rounded-2xl rounded-bl-md px-4 py-3 inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-primary typing-dot" />
                <span className="size-2 rounded-full bg-primary typing-dot" style={{ animationDelay: "0.15s" }} />
                <span className="size-2 rounded-full bg-primary typing-dot" style={{ animationDelay: "0.3s" }} />
              </div>
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="pt-4 mt-3">
          <div className="flex items-center justify-center mb-4">
            <MicButton onTranscript={handleUtterance} busy={busy} speaking={speaking} autoStart={autoListen} size="xl" />
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const t = input.trim();
              if (!t) return;
              setInput("");
              handleUtterance(t);
            }}
            className="flex gap-2 items-center bg-card border shadow-card rounded-full px-2 py-1.5"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Or type a message…"
              className="flex-1 bg-transparent px-3 py-2 text-[15px] outline-none"
            />
            <button type="submit" className="size-10 rounded-full bg-primary text-primary-foreground grid place-items-center disabled:opacity-50" disabled={!input.trim()} aria-label="Send">
              <Send className="size-4" />
            </button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
