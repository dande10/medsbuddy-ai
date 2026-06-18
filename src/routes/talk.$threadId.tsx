import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { MicButton } from "@/components/mic-button";
import { AiOrb } from "@/components/ai-orb";
import { useApp, type ChatMessage } from "@/lib/store";
import { detectNavigation } from "@/lib/nav-commands";
import { aiChat } from "@/lib/ai-chat.functions";
import { speak, stopSpeaking } from "@/lib/voice";
import { useEffect, useMemo, useRef, useState } from "react";
import { Trash2, Send, Sparkles, History, Plus, X, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/talk/$threadId")({
  head: () => ({
    meta: [
      { title: "Talk — MedsBuddy" },
      { name: "description", content: "Speak naturally with your AI patient advocate." },
    ],
  }),
  component: TalkThreadPage,
});

const SUGGESTIONS = [
  "How are you today?",
  "Who are you?",
  "I have a symptom I want to remember",
  "Help me prepare for my doctor visit",
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
    "When the patient asks who or what you are, proactively explain your purpose in warm, human language.",
    "",
    "## Voice & personality",
    "Always: friendly, caring, calm, supportive, encouraging, professional. Never: robotic, cold, judgmental, overly technical. Use short, natural sentences (1–3).",
    "",
    "## Proactive care",
    "Acknowledge symptoms warmly, confirm they are remembered for the next doctor visit, and offer to log details. Say \"I've made a note of that\" so the patient feels heard.",
    "",
    "## Boundaries",
    "You are not a doctor. For urgent symptoms (chest pain, trouble breathing, severe bleeding, suicidal thoughts), kindly tell the patient to call emergency services.",
    "Use the patient context below — never invent medications or symptoms.",
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

function TalkThreadPage() {
  const { threadId } = useParams({ from: "/talk/$threadId" });
  const navigate = useNavigate();
  const {
    threads,
    appendToThread,
    clearThread,
    deleteThread,
    createThread,
    setActiveThread,
    addSymptom,
  } = useApp();

  const thread = threads.find((t) => t.id === threadId);
  const messages: ChatMessage[] = thread?.messages ?? [];

  const [busy, setBusy] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [autoListen, setAutoListen] = useState(false);
  const [input, setInput] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Mark this thread active when it loads
  useEffect(() => {
    if (thread) setActiveThread(thread.id);
  }, [thread, setActiveThread]);

  // Wait for the persisted store to hydrate before deciding anything.
  useEffect(() => {
    const unsub = useApp.persist.onFinishHydration(() => setHydrated(true));
    if (useApp.persist.hasHydrated()) setHydrated(true);
    return () => unsub();
  }, []);

  // If, after hydration, the thread still doesn't exist, bounce back to /talk
  // so the index route can create or pick a valid one.
  useEffect(() => {
    if (hydrated && !thread) navigate({ to: "/talk", replace: true });
  }, [hydrated, thread, navigate]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, busy]);

  const sortedThreads = useMemo(
    () => [...threads].sort((a, b) => b.updatedAt - a.updatedAt),
    [threads],
  );

  const handleNewChat = () => {
    stopSpeaking();
    setSpeaking(false);
    const tid = createThread();
    setDrawerOpen(false);
    navigate({ to: "/talk/$threadId", params: { threadId: tid } });
  };

  const handleSwitchThread = (tid: string) => {
    stopSpeaking();
    setSpeaking(false);
    setDrawerOpen(false);
    navigate({ to: "/talk/$threadId", params: { threadId: tid } });
  };

  const handleDeleteThread = (tid: string) => {
    deleteThread(tid);
    if (tid === threadId) {
      const next = threads.find((t) => t.id !== tid);
      if (next) navigate({ to: "/talk/$threadId", params: { threadId: next.id }, replace: true });
      else navigate({ to: "/talk", replace: true });
    }
  };

  const handleUtterance = async (raw: string) => {
    const text = raw.trim();
    if (!text || busy || !thread) return;
    setAutoListen(false);

    const nav = detectNavigation(text);
    if (nav) {
      appendToThread(thread.id, { role: "user", content: text });
      appendToThread(thread.id, { role: "assistant", content: `Opening ${nav.label}.` });
      setSpeaking(true);
      await speak(`Opening ${nav.label}.`, () => setSpeaking(false));
      navigate({ to: nav.to });
      return;
    }

    const symp = looksLikeSymptom(text);
    if (symp) addSymptom({ name: symp.name, severity: symp.severity, notes: text });

    appendToThread(thread.id, { role: "user", content: text });
    setBusy(true);
    try {
      const state = useApp.getState();
      const sys = buildSystemPrompt(state);
      const current = state.threads.find((t) => t.id === thread.id);
      const history = (current?.messages ?? []).slice(-8).map((m) => ({ role: m.role, content: m.content }));
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
      appendToThread(thread.id, { role: "assistant", content: finalReply });
      setBusy(false);
      setSpeaking(true);
      await speak(finalReply, () => { setSpeaking(false); setAutoListen(true); });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not reach the AI.";
      appendToThread(thread.id, { role: "assistant", content: `Sorry — ${msg}` });
      setBusy(false);
    }
  };

  if (!hydrated || !thread) {
    return <div className="py-20 text-center text-sm text-muted-foreground">Opening MedsBuddy…</div>;
  }

  return (
    <>
      <div className="flex flex-col" style={{ minHeight: "calc(100vh - 200px)" }}>
        {/* AI header */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setDrawerOpen(true)}
            className="size-10 rounded-full bg-card border grid place-items-center text-muted-foreground hover:bg-secondary transition shrink-0"
            aria-label="Chat history"
          >
            <History className="size-4" />
          </button>
          <AiOrb size={56} speaking={speaking} listening={autoListen} thinking={busy} />
          <div className="flex-1 min-w-0">
            <div className="text-[11px] text-muted-foreground font-medium truncate">
              {thread?.title || "MedsBuddy AI"}
            </div>
            <div className="text-base font-semibold tracking-tight leading-tight">
              {busy ? "Thinking…" : speaking ? "Speaking…" : "How can I help?"}
            </div>
          </div>
          <button
            onClick={handleNewChat}
            className="rounded-full bg-primary text-primary-foreground px-3 py-2 text-xs font-semibold inline-flex items-center gap-1 shadow-elegant shrink-0"
            aria-label="New chat"
          >
            <Plus className="size-3.5" /> New
          </button>
        </div>

        {/* Chat */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-1 -mx-1 px-1">
          {messages.length === 0 && (
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
            {messages.map((m) => (
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
          {messages.length > 0 && (
            <button
              onClick={() => { stopSpeaking(); if (thread) clearThread(thread.id); }}
              className="mt-3 mx-auto block text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <Trash2 className="size-3" /> Clear this conversation
            </button>
          )}
        </div>
      </div>

      {/* History drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 240 }}
              className="fixed inset-y-0 left-0 z-50 w-[85%] max-w-sm bg-background border-r shadow-2xl flex flex-col"
            >
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-muted-foreground font-medium">Conversations</div>
                  <h2 className="text-lg font-semibold">Chat history</h2>
                </div>
                <button onClick={() => setDrawerOpen(false)} className="size-9 rounded-full bg-card border grid place-items-center" aria-label="Close">
                  <X className="size-4" />
                </button>
              </div>
              <div className="p-3">
                <button
                  onClick={handleNewChat}
                  className="w-full rounded-xl bg-primary text-primary-foreground py-3 font-semibold inline-flex items-center justify-center gap-2 shadow-elegant"
                >
                  <Plus className="size-4" /> New chat
                </button>
              </div>
              <ul className="flex-1 overflow-y-auto px-3 pb-4 space-y-1.5">
                {sortedThreads.length === 0 && (
                  <li className="text-sm text-muted-foreground text-center py-10">No conversations yet.</li>
                )}
                {sortedThreads.map((t) => {
                  const active = t.id === threadId;
                  const preview = t.messages[t.messages.length - 1]?.content?.slice(0, 60) ?? "Empty chat";
                  return (
                    <li
                      key={t.id}
                      className={`rounded-xl border px-3 py-2.5 flex items-start gap-2 transition ${
                        active ? "bg-primary/10 border-primary/40" : "bg-card hover:bg-secondary/50"
                      }`}
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => handleSwitchThread(t.id)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleSwitchThread(t.id); }}
                        className="flex-1 min-w-0 text-left cursor-pointer"
                      >
                        <div className="text-[14px] font-medium truncate inline-flex items-center gap-1.5">
                          <MessageCircle className="size-3.5 text-primary shrink-0" />
                          {t.title}
                        </div>
                        <div className="text-[12px] text-muted-foreground truncate mt-0.5">{preview}</div>
                        <div className="text-[10px] text-muted-foreground mt-1">{new Date(t.updatedAt).toLocaleString()}</div>
                      </div>
                      <button
                        onClick={() => handleDeleteThread(t.id)}
                        className="size-8 rounded-lg grid place-items-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                        aria-label={`Delete ${t.title}`}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
