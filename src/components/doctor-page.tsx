import { useApp, adherence } from "@/lib/store";
import { speak, stopSpeaking } from "@/lib/voice";
import {
  generateDoctorHandoff,
  generateVisitSummary,
  humanizePreVisitSummary,
  saveVisitMemory,
  transcribeAudio,
} from "@/lib/alibaba-api";
import {
  Activity,
  Calendar,
  Check,
  ClipboardList,
  FileText,
  Mic,
  Pill,
  Sparkles,
  Stethoscope,
  Volume2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ADVOCATE_ALERT_COOLDOWN_MS,
  AI,
  TRANSCRIPT_MERGE_DELAY_MS,
  analyzeTranscriptForAdvocateAlert,
  buildCarePlanResponseWithQwen,
  buildDoctorConsentMessage,
  buildDoctorPatientContextAnswer,
  buildIntentResponse,
  buildMedicationHistory,
  buildPatientSummary,
  buildReadablePreVisitFallback,
  buildSpokenVisitSummary,
  buildSummaryFromTranscript,
  buildVisitOpeningMessages,
  canMedsBuddyRespondInStage,
  cleanSpeechToTextTranscript,
  cleanTranscriptInput,
  cleanVisitTranscript,
  conversationToTranscript,
  dedupeConversation,
  detectSemanticIntentWithLLM,
  detectVisitStage,
  getPatientId,
  getSupportedRecordingMimeType,
  getTranscriptDelta,
  isFastLocalIntent,
  isLowValueTranscript,
  isStartTalkingCommand,
  isStopTalkingCommand,
  lastMedsBuddyQuestionWasForDoctor,
  lastMedsBuddyQuestionWasForPatient,
  looksLikeDoctorAnswerToMedsBuddy,
  looksLikePatientFirstPersonStatement,
  mergeAdjacentConversationMessages,
  mergeRemoteSummary,
  normalizeTranscriptText,
  parseTranscriptMessages,
  semanticSpeakerToConversationSpeaker,
  shouldUseLlmVisitReasoning,
  type AdvocateAlertTopic,
  type ConversationMessage,
  type DemoStage,
  type DoctorVisitConsent,
  type SemanticIntentDecision,
  type SpeakerMode,
  type VisitSummaryData,
} from "@/lib/doctor-visit-agent";

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: { transcript: string };
};

type SpeechRecognitionEventLike = Event & {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
};

type SpeechRecognitionErrorEventLike = Event & {
  error?: string;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export function DoctorPage() {
  const state = useApp();
  const {
    profile,
    meds,
    doses,
    symptoms,
    appointments,
    addSummary,
    addVisit,
    addNote,
    resetCurrentPatientContext,
  } = state;
  const [mounted, setMounted] = useState(false);
  const [stage, setStage] = useState<DemoStage>("idle");
  const [patientSummaryApproved, setPatientSummaryApproved] = useState(false);
  const [patientContextDraft, setPatientContextDraft] = useState("");
  const [approvedPatientContext, setApprovedPatientContext] = useState("");
  const [preVisitSummaryPreparing, setPreVisitSummaryPreparing] = useState(false);
  const [doctorVisitConsent, setDoctorVisitConsent] = useState<DoctorVisitConsent>("pending");
  const [summarySaved, setSummarySaved] = useState(false);
  const [visitMessages, setVisitMessages] = useState<ConversationMessage[]>([]);
  const [wakeStatus, setWakeStatus] = useState("MedsBuddy is listening");
  const [simulatedTranscript, setSimulatedTranscript] = useState("");
  const [lastProcessedTranscript, setLastProcessedTranscript] = useState("");
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceSpeaking, setVoiceSpeaking] = useState(false);
  const [medsBuddyTalking, setMedsBuddyTalking] = useState(true);
  const [summarySpeaking, setSummarySpeaking] = useState(false);
  const [advocateActive, setAdvocateActive] = useState(false);
  const [visitSummary, setVisitSummary] = useState<VisitSummaryData>(() =>
    buildSummaryFromTranscript([], ""),
  );
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const elevenLabsSttUnavailableRef = useRef(false);
  const sttRequestChainRef = useRef<Promise<void>>(Promise.resolve());
  const visitMessagesRef = useRef<ConversationMessage[]>([]);
  const voiceSpeakingRef = useRef(false);
  const medsBuddyTalkingRef = useRef(true);
  const advocateActiveRef = useRef(false);
  const spokenMedsBuddyKeysRef = useRef<Set<string>>(new Set());
  const alertedTopicsRef = useRef<Set<AdvocateAlertTopic>>(new Set());
  const handledCarePlanKeysRef = useRef<Set<string>>(new Set());
  const lastAdvocateAlertAtRef = useRef(0);
  const semanticRequestIdRef = useRef(0);
  const humanizedSummaryCacheRef = useRef<Map<string, string>>(new Map());
  const humanizeInFlightKeyRef = useRef<string | null>(null);
  const transcriptBufferRef = useRef("");
  const transcriptBufferTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transcriptBufferStartedAtRef = useRef<number | null>(null);
  const structuredPatientContextForQwen = useMemo(() => buildPatientSummary(state), [state]);
  const readablePreVisitFallback = useMemo(() => buildReadablePreVisitFallback(state), [state]);
  const patientId = useMemo(() => getPatientId(state), [state]);
  const patientContextForVisit =
    approvedPatientContext || patientContextDraft || "Preparing your pre-visit summary...";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!patientSummaryApproved) {
      const summaryKey = `${patientId}:${structuredPatientContextForQwen}`;
      const cachedSummary = humanizedSummaryCacheRef.current.get(summaryKey);

      setPatientContextDraft(cachedSummary || readablePreVisitFallback);

      if (cachedSummary) {
        setPreVisitSummaryPreparing(false);
        return;
      }

      if (humanizeInFlightKeyRef.current === summaryKey) {
        setPreVisitSummaryPreparing(false);
        return;
      }

      let active = true;
      humanizeInFlightKeyRef.current = summaryKey;
      setPreVisitSummaryPreparing(false);

      void humanizePreVisitSummary({
        patientId,
        rawPatientContext: structuredPatientContextForQwen,
      })
        .then((result) => {
          if (!active || humanizeInFlightKeyRef.current !== summaryKey) return;
          const summary = result.summary || readablePreVisitFallback;
          humanizedSummaryCacheRef.current.set(summaryKey, summary);
          setPatientContextDraft(summary);
        })
        .catch(() => {
          if (!active || humanizeInFlightKeyRef.current !== summaryKey) return;
          setPatientContextDraft(readablePreVisitFallback);
        })
        .finally(() => {
          if (humanizeInFlightKeyRef.current === summaryKey) {
            humanizeInFlightKeyRef.current = null;
          }
          if (active) setPreVisitSummaryPreparing(false);
        });

      return () => {
        active = false;
      };
    }
  }, [
    structuredPatientContextForQwen,
    readablePreVisitFallback,
    patientId,
    patientSummaryApproved,
  ]);

  useEffect(() => {
    return () => stopSpeaking();
  }, []);

  useEffect(() => {
    visitMessagesRef.current = visitMessages;
  }, [visitMessages]);

  useEffect(() => {
    advocateActiveRef.current = advocateActive;
  }, [advocateActive]);

  useEffect(() => {
    medsBuddyTalkingRef.current = medsBuddyTalking;
    if (!medsBuddyTalking) {
      stopSpeaking();
      voiceSpeakingRef.current = false;
      setVoiceSpeaking(false);
    }
  }, [medsBuddyTalking]);

  const adh = adherence(doses, 7);
  const last7 = Date.now() - 7 * 86400000;
  const recentSymptoms = symptoms.filter((s) => s.at >= last7);
  const upcoming = appointments.filter((a) => a.at >= Date.now()).sort((a, b) => a.at - b.at)[0];

  const startVisit = () => {
    if (!patientSummaryApproved) {
      toast.error("Please approve the pre-visit summary before starting the live visit.");
      return;
    }
    beginVisit();
  };

  const beginVisit = () => {
    const approvedContext = patientContextForVisit.trim() || readablePreVisitFallback;
    addSummary(approvedContext);
    stopSpeaking();
    if (transcriptBufferTimerRef.current) {
      clearTimeout(transcriptBufferTimerRef.current);
      transcriptBufferTimerRef.current = null;
    }
    transcriptBufferRef.current = "";
    transcriptBufferStartedAtRef.current = null;
    spokenMedsBuddyKeysRef.current.clear();
    alertedTopicsRef.current.clear();
    handledCarePlanKeysRef.current.clear();
    lastAdvocateAlertAtRef.current = 0;
    setDoctorVisitConsent("pending");
    setVisitMessages([buildDoctorConsentMessage(approvedContext, profile.name || "Vasanthi")]);
    setVisitSummary(buildSummaryFromTranscript([], approvedContext));
    setWakeStatus("Waiting for doctor consent");
    setSimulatedTranscript("");
    setLastProcessedTranscript("");
    setSummarySaved(false);
    setAdvocateActive(false);
    setMedsBuddyTalking(true);
    setStage("active");
    toast.success("AI Patient Advocate visit started");
  };

  useEffect(() => {
    if (stage !== "active") return;
    if (!medsBuddyTalking) return;

    const unsaidMessages = visitMessages.filter((message, index) => {
      if (message.speaker !== "MedsBuddy") return false;
      const key = `${index}:${normalizeTranscriptText(message.text)}`;
      if (spokenMedsBuddyKeysRef.current.has(key)) return false;
      spokenMedsBuddyKeysRef.current.add(key);
      return true;
    });

    if (!unsaidMessages.length) return;

    const textToSpeak = unsaidMessages.map((message) => message.text).join(" ");
    voiceSpeakingRef.current = true;
    setVoiceSpeaking(true);
    const returnToListening = () => {
      voiceSpeakingRef.current = false;
      setVoiceSpeaking(false);
      if (stage === "active" && doctorVisitConsent === "granted") {
        setWakeStatus("MedsBuddy is listening");
      }
    };
    void speak(textToSpeak, () => {
      returnToListening();
    }).catch(() => {
      returnToListening();
    });
  }, [doctorVisitConsent, medsBuddyTalking, stage, visitMessages]);

  const handleDoctorConsents = () => {
    const openingMessages = buildVisitOpeningMessages();
    setDoctorVisitConsent("granted");
    setWakeStatus("MedsBuddy is listening");
    // Once doctor consent is granted, MedsBuddy can respond from conversation context
    // without requiring the doctor to repeat the wake word.
    setAdvocateActive(true);
    advocateActiveRef.current = true;
    setVisitMessages((messages) => dedupeConversation([...messages, ...openingMessages]));
    setVisitSummary(buildSummaryFromTranscript(openingMessages, patientContextForVisit));
  };

  const handleDoctorDeclines = () => {
    setDoctorVisitConsent("declined");
    setWakeStatus("Doctor did not consent");
    setVisitMessages((messages) =>
      dedupeConversation([
        ...messages,
        {
          speaker: "MedsBuddy",
          text: "Understood. MedsBuddy will not participate in this visit or record the conversation.",
        },
      ]),
    );
  };

  const addMedsBuddyVisitMessage = useCallback((text: string, status: string): boolean => {
    if (!medsBuddyTalkingRef.current) {
      setWakeStatus("MedsBuddy Talking is OFF. Still listening and capturing the visit.");
      return false;
    }
    setWakeStatus(status);
    setVisitMessages((messages) => {
      const withResponse = dedupeConversation([...messages, { speaker: "MedsBuddy", text }]);
      visitMessagesRef.current = withResponse;
      return withResponse;
    });
    return true;
  }, []);

  const addTranscriptMessages = useCallback(
    (transcript: string, speaker: SpeakerMode): boolean => {
      if (!transcript.trim() || isLowValueTranscript(transcript)) return false;

      const cleanedTranscript = cleanSpeechToTextTranscript(transcript);
      if (process.env.NODE_ENV !== "production") {
        console.log("RAW_STT_TRANSCRIPT:", transcript);
        console.log("CLEANED_STT_TRANSCRIPT:", cleanedTranscript);
      }

      const currentMessages = visitMessagesRef.current;
      const parsedMessages = mergeAdjacentConversationMessages(
        parseTranscriptMessages(cleanedTranscript, speaker, currentMessages)
          .map((message) => ({
            ...message,
            text: cleanTranscriptInput(message.text),
          }))
          .filter((message) => !isLowValueTranscript(message.text)),
      );
      if (!parsedMessages.length) return false;
      for (const message of parsedMessages) {
        console.info("[MedsBuddy speaker detection]", {
          rawTranscript: transcript,
          cleanedTranscript,
          messageText: message.text,
          detectedSpeaker: message.speaker,
          confidence: message.speakerConfidence ?? null,
          source: message.speakerSource ?? "local_rules",
          reason: message.speakerReason ?? "No speaker reason recorded.",
        });
      }

      const nextMessages = dedupeConversation(
        mergeAdjacentConversationMessages([...currentMessages, ...parsedMessages]),
      );
      visitMessagesRef.current = nextMessages;
      setVisitMessages(nextMessages);
      setWakeStatus("MedsBuddy is understanding the conversation");

      const latestMessage = nextMessages[nextMessages.length - 1];
      const latestText =
        latestMessage?.text ?? parsedMessages.map((message) => message.text).join(" ");
      const latestTurnText = latestText;
      const latestSpeaker = latestMessage?.speaker;
      const latestSpeakerConfidence = latestMessage?.speakerConfidence ?? 0.75;
      const needsLlmSpeakerClassification = latestSpeakerConfidence < 0.72;
      const requestId = semanticRequestIdRef.current + 1;
      semanticRequestIdRef.current = requestId;
      const currentTranscript = conversationToTranscript(nextMessages);
      const currentVisitStage = detectVisitStage(currentTranscript);
      console.info("[MedsBuddy visit stage]", {
        stage: currentVisitStage,
        latestSpeaker,
        latestText,
      });

      const hasStopTalkingCommand = parsedMessages.some((message) =>
        isStopTalkingCommand(message.text),
      );
      const hasStartTalkingCommand = parsedMessages.some((message) =>
        isStartTalkingCommand(message.text),
      );

      if (hasStopTalkingCommand) {
        setMedsBuddyTalking(false);
        medsBuddyTalkingRef.current = false;
        setWakeStatus("MedsBuddy Talking is OFF. Still listening and capturing the visit.");
        return true;
      }

      if (hasStartTalkingCommand) {
        setMedsBuddyTalking(true);
        medsBuddyTalkingRef.current = true;
        addMedsBuddyVisitMessage(
          "MedsBuddy Talking is on. I’ll speak when it helps the visit.",
          "MedsBuddy Talking is ON",
        );
        return true;
      }

      if (isStopTalkingCommand(latestText)) {
        setMedsBuddyTalking(false);
        medsBuddyTalkingRef.current = false;
        setWakeStatus("MedsBuddy Talking is OFF. Still listening and capturing the visit.");
        return true;
      }

      if (isStartTalkingCommand(latestText)) {
        setMedsBuddyTalking(true);
        medsBuddyTalkingRef.current = true;
        addMedsBuddyVisitMessage(
          "MedsBuddy Talking is on. I’ll speak when it helps the visit.",
          "MedsBuddy Talking is ON",
        );
        return true;
      }

      const fastIntent = AI.detectIntent({
        text: latestText,
        speaker: latestSpeaker,
        advocateActive: advocateActiveRef.current,
      });

      if (
        !needsLlmSpeakerClassification &&
        fastIntent === "patient_history_request" &&
        canMedsBuddyRespondInStage(currentVisitStage, fastIntent)
      ) {
        if (!medsBuddyTalkingRef.current) {
          setWakeStatus("MedsBuddy Talking is OFF. Still listening and capturing the visit.");
          return true;
        }

        const fallbackHandoff = buildDoctorPatientContextAnswer(state, patientContextForVisit);
        setWakeStatus("MedsBuddy is preparing a concise doctor handoff");
        void generateDoctorHandoff({
          patientId: getPatientId(state),
          approvedPreVisitSummary: patientContextForVisit,
          patientContext: state.patientContext as unknown as Record<string, unknown>,
          medicationHistory: buildMedicationHistory(state),
        })
          .then((result) => {
            const handoff = result.handoff?.trim() || fallbackHandoff;
            addMedsBuddyVisitMessage(handoff, "MedsBuddy answered from the pre-visit summary");
          })
          .catch(() => {
            addMedsBuddyVisitMessage(
              fallbackHandoff,
              "MedsBuddy answered from the pre-visit summary",
            );
          });
        return true;
      }

      if (
        !needsLlmSpeakerClassification &&
        fastIntent === "care_plan_instruction" &&
        canMedsBuddyRespondInStage(currentVisitStage, fastIntent)
      ) {
        if (!medsBuddyTalkingRef.current) {
          setWakeStatus("MedsBuddy Talking is OFF. Still listening and capturing the visit.");
          return true;
        }

        setWakeStatus("MedsBuddy is checking the care plan for missing details");
        void buildCarePlanResponseWithQwen({
          text: latestText,
          messages: nextMessages,
          state,
          patientContext: patientContextForVisit,
          handledCarePlanKeys: handledCarePlanKeysRef.current,
        }).then((response) => {
          if (!response) {
            setWakeStatus("MedsBuddy is ready for follow-up questions");
            return;
          }
          addMedsBuddyVisitMessage(response, "MedsBuddy is clarifying the care plan");
        });
        return true;
      }

      const fastResponse =
        !needsLlmSpeakerClassification &&
        isFastLocalIntent(fastIntent) &&
        canMedsBuddyRespondInStage(currentVisitStage, fastIntent) &&
        buildIntentResponse(
          fastIntent,
          latestText,
          nextMessages,
          state,
          handledCarePlanKeysRef.current,
          patientContextForVisit,
        );

      if (fastResponse) {
        if (fastIntent === "direct_call") {
          setAdvocateActive(true);
          advocateActiveRef.current = true;
        }
        setWakeStatus(
          fastIntent === "direct_call"
            ? "MedsBuddy was called"
            : "MedsBuddy answered from the pre-visit summary",
        );
        addMedsBuddyVisitMessage(
          fastResponse,
          fastIntent === "direct_call"
            ? "MedsBuddy was called"
            : "MedsBuddy answered from the pre-visit summary",
        );
        return true;
      }

      const fastAlert = analyzeTranscriptForAdvocateAlert(
        currentTranscript,
        patientContextForVisit,
      );
      const now = Date.now();
      if (
        !needsLlmSpeakerClassification &&
        fastAlert &&
        !alertedTopicsRef.current.has(fastAlert.topic) &&
        now - lastAdvocateAlertAtRef.current >= ADVOCATE_ALERT_COOLDOWN_MS
      ) {
        alertedTopicsRef.current.add(fastAlert.topic);
        lastAdvocateAlertAtRef.current = now;
        addMedsBuddyVisitMessage(fastAlert.response, "MedsBuddy noticed a clarification");
        return true;
      }

      if (!medsBuddyTalkingRef.current) {
        setWakeStatus("MedsBuddy Talking is OFF. Still listening and capturing the visit.");
        return true;
      }

      if (
        !shouldUseLlmVisitReasoning({
          latestText,
          latestSpeaker,
          latestSpeakerConfidence,
          fastIntent,
        })
      ) {
        setWakeStatus(
          advocateActiveRef.current
            ? "MedsBuddy is ready for follow-up questions"
            : "MedsBuddy is listening",
        );
        return true;
      }

      void (async () => {
        const semanticDecision = await detectSemanticIntentWithLLM({
          latestTranscript: `${latestSpeaker}: ${latestText}`,
          currentTranscript,
          patientContext: patientContextForVisit,
          state,
        });
        if (requestId !== semanticRequestIdRef.current) return;
        if (semanticDecision) {
          console.info("[MedsBuddy LLM speaker/intent classification]", {
            rawTranscript: transcript,
            cleanedTranscript,
            messageText: latestTurnText,
            previousSpeaker: latestSpeaker,
            localConfidence: latestSpeakerConfidence,
            llmSpeaker: semanticDecision.speaker,
            intent: semanticDecision.intent,
            shouldRespond: semanticDecision.shouldRespond,
          });
        }

        const fallbackIntent = AI.detectIntent({
          text: latestText,
          speaker: latestSpeaker,
          advocateActive: advocateActiveRef.current,
        });

        const decision: SemanticIntentDecision = semanticDecision ?? {
          speaker: latestSpeaker
            ? (latestSpeaker.toLowerCase() as SemanticIntentDecision["speaker"])
            : "unknown",
          intent: fallbackIntent,
          shouldRespond: fallbackIntent !== "none" && fallbackIntent !== "normal_conversation",
          response: "",
          requestedFields: [],
          missingFields: [],
          patientClarificationQuestion: "",
          includePreviousVisitHistory: false,
        };
        const asyncVisitStage = detectVisitStage(
          conversationToTranscript(visitMessagesRef.current),
        );
        const correctedSpeaker = semanticSpeakerToConversationSpeaker(decision.speaker);
        const ignorePatientCorrectionAfterMedsBuddyQuestion =
          correctedSpeaker === "Patient" &&
          latestSpeaker === "Doctor" &&
          lastMedsBuddyQuestionWasForDoctor(visitMessagesRef.current) &&
          looksLikeDoctorAnswerToMedsBuddy(latestTurnText);
        const ignoreDoctorCorrectionAfterMedsBuddyPatientQuestion =
          correctedSpeaker === "Doctor" &&
          latestSpeaker === "Patient" &&
          lastMedsBuddyQuestionWasForPatient(visitMessagesRef.current) &&
          looksLikePatientFirstPersonStatement(latestTurnText);

        if (
          correctedSpeaker &&
          correctedSpeaker !== "MedsBuddy" &&
          latestSpeaker &&
          correctedSpeaker !== latestSpeaker &&
          !ignorePatientCorrectionAfterMedsBuddyQuestion &&
          !ignoreDoctorCorrectionAfterMedsBuddyPatientQuestion
        ) {
          setVisitMessages((messages) => {
            let lastIndex = -1;
            for (let index = messages.length - 1; index >= 0; index -= 1) {
              const message = messages[index];
              if (message.speaker === latestSpeaker && message.text === latestTurnText) {
                lastIndex = index;
                break;
              }
            }
            if (lastIndex < 0) return messages;
            const corrected = [...messages];
            corrected[lastIndex] = { ...corrected[lastIndex], speaker: correctedSpeaker };
            visitMessagesRef.current = corrected;
            return corrected;
          });
        }

        if (decision.intent === "direct_call") {
          setAdvocateActive(true);
          advocateActiveRef.current = true;
        }

        const stageAllowsResponse = canMedsBuddyRespondInStage(asyncVisitStage, decision.intent);
        const localIntentResponse =
          stageAllowsResponse && decision.intent === "care_plan_instruction"
            ? await buildCarePlanResponseWithQwen({
                text: latestText,
                messages: visitMessagesRef.current,
                state,
                patientContext: patientContextForVisit,
                handledCarePlanKeys: handledCarePlanKeysRef.current,
              })
            : stageAllowsResponse
              ? buildIntentResponse(
                  decision.intent,
                  latestText,
                  visitMessagesRef.current,
                  state,
                  handledCarePlanKeysRef.current,
                  patientContextForVisit,
                  decision,
                )
              : null;
        const shouldPreferLocalResponse =
          decision.intent === "care_plan_instruction" ||
          decision.intent === "medication_history_request" ||
          /\b0 percent|zero taken|zero missed\b/i.test(decision.response);

        const intentResponse =
          decision.shouldRespond &&
          stageAllowsResponse &&
          (shouldPreferLocalResponse
            ? localIntentResponse
            : decision.response || localIntentResponse);

        if (intentResponse) {
          addMedsBuddyVisitMessage(
            intentResponse,
            decision.intent === "direct_call"
              ? "MedsBuddy was called"
              : "MedsBuddy is answering the doctor",
          );
        } else {
          const alert = analyzeTranscriptForAdvocateAlert(
            conversationToTranscript(visitMessagesRef.current),
            patientContextForVisit,
          );
          const now = Date.now();
          if (
            alert &&
            !alertedTopicsRef.current.has(alert.topic) &&
            now - lastAdvocateAlertAtRef.current >= ADVOCATE_ALERT_COOLDOWN_MS
          ) {
            alertedTopicsRef.current.add(alert.topic);
            lastAdvocateAlertAtRef.current = now;
            addMedsBuddyVisitMessage(alert.response, "MedsBuddy noticed a clarification");
          } else {
            setWakeStatus(
              advocateActiveRef.current
                ? "MedsBuddy is ready for follow-up questions"
                : "MedsBuddy is listening",
            );
          }
        }
      })();

      return true;
    },
    [addMedsBuddyVisitMessage, patientContextForVisit, state],
  );

  const handleSimulatedTranscript = () => {
    const delta = getTranscriptDelta(simulatedTranscript, lastProcessedTranscript);
    const added = addTranscriptMessages(delta, "Auto");
    if (!added) return;
    setLastProcessedTranscript(simulatedTranscript.trim());
    setSimulatedTranscript("");
  };

  const flushBufferedTranscript = useCallback((): boolean => {
    if (transcriptBufferTimerRef.current) {
      clearTimeout(transcriptBufferTimerRef.current);
      transcriptBufferTimerRef.current = null;
    }
    const mergedTranscript = transcriptBufferRef.current.replace(/\s+/g, " ").trim();
    const waitMs = transcriptBufferStartedAtRef.current
      ? Date.now() - transcriptBufferStartedAtRef.current
      : 0;
    transcriptBufferRef.current = "";
    transcriptBufferStartedAtRef.current = null;
    if (!mergedTranscript) return false;
    console.info("[MedsBuddy transcript pipeline]", {
      finalMergedTranscript: mergedTranscript,
      timeWaitingBeforeReasoningMs: waitMs,
    });
    return addTranscriptMessages(mergedTranscript, "Auto");
  }, [addTranscriptMessages]);

  const queueTranscriptChunk = useCallback(
    (transcript: string) => {
      const cleanedChunk = cleanSpeechToTextTranscript(transcript);
      if (!cleanedChunk) return;

      if (voiceSpeakingRef.current) {
        if (isStopTalkingCommand(cleanedChunk)) {
          stopSpeaking();
          voiceSpeakingRef.current = false;
          setVoiceSpeaking(false);
          setMedsBuddyTalking(false);
          medsBuddyTalkingRef.current = false;
          transcriptBufferRef.current = "";
          transcriptBufferStartedAtRef.current = null;
          if (transcriptBufferTimerRef.current) {
            clearTimeout(transcriptBufferTimerRef.current);
            transcriptBufferTimerRef.current = null;
          }
          setWakeStatus("MedsBuddy Talking is OFF. Still listening and capturing the visit.");
        }
        return;
      }

      if (isLowValueTranscript(cleanedChunk)) return;

      if (!transcriptBufferRef.current) {
        transcriptBufferStartedAtRef.current = Date.now();
      }
      transcriptBufferRef.current = [transcriptBufferRef.current, cleanedChunk]
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      console.info("[MedsBuddy transcript pipeline]", {
        rawSttTranscript: transcript,
        bufferedTranscript: transcriptBufferRef.current,
        timeWaitingBeforeReasoningMs: transcriptBufferStartedAtRef.current
          ? Date.now() - transcriptBufferStartedAtRef.current
          : 0,
      });
      setWakeStatus("MedsBuddy is listening and combining the full thought");

      if (transcriptBufferTimerRef.current) {
        clearTimeout(transcriptBufferTimerRef.current);
      }
      transcriptBufferTimerRef.current = setTimeout(() => {
        flushBufferedTranscript();
      }, TRANSCRIPT_MERGE_DELAY_MS);
    },
    [flushBufferedTranscript],
  );

  useEffect(() => {
    if (!mounted) return;

    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const canRecordForElevenLabs =
      Boolean(navigator.mediaDevices?.getUserMedia) &&
      typeof MediaRecorder !== "undefined" &&
      !elevenLabsSttUnavailableRef.current;
    setVoiceSupported(canRecordForElevenLabs || Boolean(Recognition));

    const stopElevenLabsRecorder = () => {
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }
      mediaRecorderRef.current = null;
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    };

    const stopBrowserRecognition = () => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };

    const startBrowserRecognition = () => {
      if (!Recognition) return false;

      const recognition = new Recognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognitionRef.current = recognition;

      recognition.onresult = (event) => {
        const finalText: string[] = [];
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          if (result?.isFinal) finalText.push(result[0].transcript);
        }
        const transcript = finalText.join(" ").trim();
        if (transcript) {
          queueTranscriptChunk(transcript);
        }
      };

      recognition.onerror = (event) => {
        setVoiceListening(false);
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setWakeStatus("Microphone permission is blocked");
          toast.error("Microphone permission is blocked. Use the transcript box instead.");
        }
      };

      recognition.onend = () => {
        if (stage === "active" && doctorVisitConsent === "granted" && !voiceSpeakingRef.current) {
          try {
            recognition.start();
            setVoiceListening(true);
          } catch {
            setVoiceListening(false);
          }
        }
      };

      try {
        recognition.start();
        setVoiceListening(true);
        setWakeStatus("Browser speech recognition is listening");
        return true;
      } catch {
        setVoiceListening(false);
        return false;
      }
    };

    if (stage !== "active" || doctorVisitConsent !== "granted") {
      stopElevenLabsRecorder();
      stopBrowserRecognition();
      setVoiceListening(false);
      return;
    }

    let cancelled = false;

    if (!canRecordForElevenLabs) {
      const started = startBrowserRecognition();
      if (!started) {
        setWakeStatus("Microphone is unavailable. Use the transcript box instead.");
      }
      return () => {
        stopBrowserRecognition();
      };
    }

    void navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        const mimeType = getSupportedRecordingMimeType();
        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        mediaStreamRef.current = stream;
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (event) => {
          if (cancelled || !event.data || event.data.size < 1200) return;
          const audioChunk = event.data;
          sttRequestChainRef.current = sttRequestChainRef.current
            .catch(() => undefined)
            .then(async () => {
              try {
                const result = await transcribeAudio(audioChunk);
                const transcript = result.text?.trim();
                if (transcript && !cancelled) {
                  queueTranscriptChunk(transcript);
                }
              } catch (error) {
                console.warn("[MedsBuddy STT] ElevenLabs STT failed. Falling back.", error);
                elevenLabsSttUnavailableRef.current = true;
                setWakeStatus("ElevenLabs STT unavailable. Falling back to browser speech.");
                stopElevenLabsRecorder();
                startBrowserRecognition();
              }
            });
        };

        recorder.onerror = () => {
          elevenLabsSttUnavailableRef.current = true;
          setWakeStatus("ElevenLabs STT recorder failed. Falling back to browser speech.");
          stopElevenLabsRecorder();
          startBrowserRecognition();
        };

        recorder.start(4500);
        setVoiceListening(true);
        setWakeStatus("ElevenLabs STT is listening");
      })
      .catch(() => {
        if (cancelled) return;
        elevenLabsSttUnavailableRef.current = true;
        setVoiceListening(false);
        setWakeStatus("Microphone permission is blocked");
        toast.error("Microphone permission is blocked. Use the transcript box instead.");
        startBrowserRecognition();
      });

    return () => {
      cancelled = true;
      stopElevenLabsRecorder();
      stopBrowserRecognition();
      if (transcriptBufferTimerRef.current) {
        clearTimeout(transcriptBufferTimerRef.current);
        transcriptBufferTimerRef.current = null;
      }
    };
  }, [doctorVisitConsent, mounted, queueTranscriptChunk, stage]);

  const endVisit = async () => {
    flushBufferedTranscript();
    const cleanedMessages = cleanVisitTranscript(visitMessagesRef.current);
    const closingMessage = "Thank you, Doctor. I've updated the patient's care plan.";
    const summaryMessages = dedupeConversation([
      ...cleanedMessages,
      { speaker: "MedsBuddy", text: closingMessage },
    ]);
    const localSummary = buildSummaryFromTranscript(cleanedMessages, patientContextForVisit);
    const transcript = conversationToTranscript(summaryMessages);

    setVisitSummary(localSummary);
    setStage("summary");
    toast.success("Care plan updated. AI Patient Advocate summary ready");
    setSummarySpeaking(true);
    void speak(closingMessage, () => setSummarySpeaking(false)).catch(() => {
      setSummarySpeaking(false);
    });

    if (!summarySaved) {
      addVisit({
        doctor: upcoming?.doctor || "Demo doctor",
        specialty: upcoming?.specialty || "Primary care",
        summary: localSummary.visitSummary,
        patientSummary: patientContextForVisit,
        topicsDiscussed: localSummary.patientConcerns,
        diagnosisOrConcerns: localSummary.diagnosis,
        medicationChanges: localSummary.medicationChanges,
        actionItems: localSummary.followUpInstructions,
        questionsAnswered: localSummary.doctorAnswers,
        carePlan: localSummary.nextAppointmentQuestions,
        notes: transcript,
      });
      addNote(`AI Patient Advocate follow-up: ${localSummary.followUpInstructions}`);
      if (localSummary.medicationGuidance) {
        addNote(`Medication schedule: ${localSummary.medicationGuidance}`);
      }
      if (localSummary.warningSigns && !localSummary.warningSigns.includes("not been discussed")) {
        addNote(`Warning signs: ${localSummary.warningSigns}`);
      }
      void saveVisitMemory({
        patientId: getPatientId(state),
        visitSummary: localSummary.visitSummary,
        diagnosis: localSummary.diagnosis,
        medications: localSummary.medicationChanges,
        allergies: state.profile.allergies || "No allergies recorded.",
        followUp: localSummary.followUpInstructions,
        warningSigns: localSummary.warningSigns,
        approvedByPatient: true,
      }).catch(() => {
        toast.error("Could not save visit memory to Alibaba ECS.");
      });
      resetCurrentPatientContext();
      setSummarySaved(true);
    }

    void generateVisitSummary({
      patientId: getPatientId(state),
      patientContext: patientContextForVisit,
      medicationHistory: buildMedicationHistory(state),
      transcript,
    })
      .then((remoteSummary) => {
        setVisitSummary(mergeRemoteSummary(localSummary, remoteSummary.summary));
      })
      .catch(() => {
        toast.info("Alibaba ECS summary unavailable. Showing local visit summary.");
      });
  };

  const speakVisitSummary = () => {
    stopSpeaking();
    const spokenSummary = buildSpokenVisitSummary(visitSummary);
    setSummarySpeaking(true);
    void speak(spokenSummary, () => setSummarySpeaking(false)).catch(() => {
      setSummarySpeaking(false);
      toast.error("Voice summary is not available in this browser.");
    });
  };

  const approvePatientContext = () => {
    const approvedContext = patientContextDraft.trim() || readablePreVisitFallback;
    setPatientContextDraft(approvedContext);
    setApprovedPatientContext(approvedContext);
    setPatientSummaryApproved(true);
    toast.success("Pre-visit summary approved");
  };

  const editPatientContext = () => {
    setPatientSummaryApproved(false);
    setApprovedPatientContext("");
  };

  if (!mounted) {
    return (
      <div className="rounded-[28px] gradient-hero text-primary-foreground p-6 shadow-elegant mb-5 min-h-[180px]" />
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[28px] gradient-hero text-primary-foreground p-6 shadow-elegant mb-5 relative overflow-hidden"
      >
        <div className="absolute -top-16 -right-16 size-48 rounded-full bg-white/10 blur-3xl" />
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-2xl bg-white/20 backdrop-blur grid place-items-center">
            <Stethoscope className="size-6" />
          </div>
          <div>
            <div className="text-[12px] opacity-80 font-medium">AI Patient Advocate</div>
            <h1 className="text-primary-foreground text-2xl">AI Patient Advocate</h1>
          </div>
        </div>
        {stage !== "idle" && (
          <p className="text-sm opacity-90 mt-3">
            MedsBuddy listens after consent, speaks directly to the doctor on behalf of the patient
            when clinically useful, lets the doctor respond, and summarizes the whole visit.
          </p>
        )}
      </motion.div>

      <>
        <AIAdvocateDemo
          stage={stage}
          patientSummary={patientContextForVisit}
          patientContextDraft={patientContextDraft}
          patientSummaryApproved={patientSummaryApproved}
          preVisitSummaryPreparing={preVisitSummaryPreparing}
          onPatientContextDraftChange={(value) => {
            setPatientContextDraft(value);
            setPatientSummaryApproved(false);
            setApprovedPatientContext("");
          }}
          onApprovePatientContext={approvePatientContext}
          onEditPatientContext={editPatientContext}
          messages={visitMessages}
          wakeStatus={wakeStatus}
          simulatedTranscript={simulatedTranscript}
          onSimulatedTranscriptChange={setSimulatedTranscript}
          onSubmitTranscript={handleSimulatedTranscript}
          onStartVisit={startVisit}
          onEndVisit={endVisit}
          doctorVisitConsent={doctorVisitConsent}
          onDoctorConsents={handleDoctorConsents}
          onDoctorDeclines={handleDoctorDeclines}
          voiceSupported={voiceSupported}
          voiceListening={voiceListening}
          voiceSpeaking={voiceSpeaking}
          medsBuddyTalking={medsBuddyTalking}
          onMedsBuddyTalkingChange={setMedsBuddyTalking}
        />

        {stage === "summary" && (
          <VisitSummary
            summary={visitSummary}
            onSpeakSummary={speakVisitSummary}
            summarySpeaking={summarySpeaking}
          />
        )}
      </>
    </>
  );
}

function AIAdvocateDemo({
  stage,
  patientSummary,
  patientContextDraft,
  patientSummaryApproved,
  preVisitSummaryPreparing,
  onPatientContextDraftChange,
  onApprovePatientContext,
  onEditPatientContext,
  messages,
  wakeStatus,
  simulatedTranscript,
  onSimulatedTranscriptChange,
  onSubmitTranscript,
  onStartVisit,
  onEndVisit,
  doctorVisitConsent,
  onDoctorConsents,
  onDoctorDeclines,
  voiceSupported,
  voiceListening,
  voiceSpeaking,
  medsBuddyTalking,
  onMedsBuddyTalkingChange,
}: {
  stage: DemoStage;
  patientSummary: string;
  patientContextDraft: string;
  patientSummaryApproved: boolean;
  preVisitSummaryPreparing: boolean;
  onPatientContextDraftChange: (value: string) => void;
  onApprovePatientContext: () => void;
  onEditPatientContext: () => void;
  messages: ConversationMessage[];
  wakeStatus: string;
  simulatedTranscript: string;
  onSimulatedTranscriptChange: (value: string) => void;
  onSubmitTranscript: () => void;
  onStartVisit: () => void;
  onEndVisit: () => void;
  doctorVisitConsent: DoctorVisitConsent;
  onDoctorConsents: () => void;
  onDoctorDeclines: () => void;
  voiceSupported: boolean;
  voiceListening: boolean;
  voiceSpeaking: boolean;
  medsBuddyTalking: boolean;
  onMedsBuddyTalkingChange: (value: boolean) => void;
}) {
  const active = stage === "active";
  const visitCanListen = doctorVisitConsent === "granted";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-card border shadow-card p-4 mb-3"
    >
      {stage === "idle" && (
        <>
          <div className="rounded-xl border bg-background p-3 mb-3">
            <div className="text-[12px] font-semibold text-primary mb-1">
              Review Before Your Appointment
            </div>
            <textarea
              value={patientContextDraft}
              onChange={(event) => onPatientContextDraftChange(event.target.value)}
              className="min-h-[260px] w-full resize-none rounded-xl border bg-card px-3 py-3 text-[13px] leading-relaxed text-foreground"
              aria-label="Pre-visit summary for doctor visit"
            />
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button
                onClick={onApprovePatientContext}
                disabled={!patientContextDraft.trim()}
                className="rounded-xl bg-primary text-primary-foreground px-4 py-3 text-sm font-semibold disabled:opacity-50"
              >
                {patientSummaryApproved ? "Approved" : "Approve Summary"}
              </button>
              <button
                onClick={onEditPatientContext}
                className="rounded-xl bg-secondary text-secondary-foreground px-4 py-3 text-sm font-semibold"
              >
                Edit
              </button>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {preVisitSummaryPreparing
                ? "MedsBuddy is refining this summary in the background. You can approve and start now."
                : "Patient reviews and approves this summary before MedsBuddy uses it in the visit."}
            </p>
          </div>
          <button
            onClick={onStartVisit}
            disabled={!patientSummaryApproved}
            className="w-full rounded-2xl gradient-hero text-primary-foreground py-5 px-4 text-lg font-semibold inline-flex items-center justify-center gap-3 shadow-elegant disabled:opacity-50"
          >
            <Sparkles className="size-6" /> Start Live Visit
          </button>
        </>
      )}

      {active && (
        <>
          <div className="rounded-2xl bg-primary/10 border border-primary/25 p-4 mb-3 flex items-center gap-3">
            <span className="relative grid place-items-center size-10 rounded-full bg-primary/20">
              {visitCanListen && (
                <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
              )}
              <Mic className="size-5 text-primary relative" />
            </span>
            <div>
              <div className="font-semibold text-primary">{wakeStatus}</div>
              <div className="text-[12px] text-muted-foreground">
                {!visitCanListen
                  ? voiceSpeaking
                    ? "MedsBuddy is speaking out loud."
                    : doctorVisitConsent === "declined"
                      ? "MedsBuddy is not participating because the doctor did not consent."
                      : "MedsBuddy is waiting for the doctor's consent before listening."
                  : voiceSpeaking
                    ? "MedsBuddy is speaking out loud."
                    : voiceSupported
                      ? voiceListening
                        ? "Microphone is listening. MedsBuddy will speak to the doctor for the patient when needed."
                        : "Microphone is not active yet. Use the transcript box if permission is blocked."
                      : "This browser does not support speech recognition. Use the transcript box below."}
              </div>
            </div>
          </div>
          {visitCanListen && (
            <div className="mb-3 grid gap-2 sm:grid-cols-2">
              <button
                onClick={() => onMedsBuddyTalkingChange(true)}
                className={`rounded-xl px-4 py-3 text-sm font-semibold ${
                  medsBuddyTalking
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                MedsBuddy Talking: ON
              </button>
              <button
                onClick={() => onMedsBuddyTalkingChange(false)}
                className={`rounded-xl px-4 py-3 text-sm font-semibold ${
                  !medsBuddyTalking
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                MedsBuddy Talking: OFF
              </button>
            </div>
          )}
          <div className="rounded-xl border bg-background p-3 mb-3">
            <div className="text-[12px] font-semibold text-primary mb-1">Pre-Visit Summary</div>
            <p className="whitespace-pre-line text-[13px] text-muted-foreground leading-relaxed">
              {patientSummary}
            </p>
          </div>
          <div className="space-y-2">
            {messages.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-background p-4 text-sm text-muted-foreground">
                Start speaking. MedsBuddy will label the speaker automatically.
              </div>
            ) : (
              messages.map((row, index) => (
                <ConversationRow
                  key={`${row.speaker}-${index}`}
                  speaker={row.speaker}
                  text={row.text}
                />
              ))
            )}
          </div>
          {doctorVisitConsent === "pending" && (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button
                onClick={onDoctorConsents}
                className="rounded-2xl bg-primary text-primary-foreground py-4 px-4 text-sm font-semibold"
              >
                Doctor consents
              </button>
              <button
                onClick={onDoctorDeclines}
                className="rounded-2xl bg-secondary text-secondary-foreground py-4 px-4 text-sm font-semibold"
              >
                Doctor does not consent
              </button>
            </div>
          )}
          {visitCanListen && (
            <div className="mt-4 rounded-2xl border bg-background p-3">
              <label htmlFor="wake-transcript" className="text-[12px] font-semibold text-primary">
                Simulate live transcript
              </label>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  id="wake-transcript"
                  value={simulatedTranscript}
                  onChange={(e) => onSimulatedTranscriptChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onSubmitTranscript();
                  }}
                  placeholder='Try: "Doctor, can you summarize the approved patient context?"'
                  className="min-w-0 flex-1 rounded-xl border bg-background px-3 py-2 text-sm"
                />
                <button
                  onClick={onSubmitTranscript}
                  disabled={!simulatedTranscript.trim()}
                  className="rounded-xl bg-secondary text-secondary-foreground px-4 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  Add to visit
                </button>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                MedsBuddy listens for clinical context and speaks to the doctor on the patient's
                behalf when an important clarification is missing.
              </p>
            </div>
          )}
          <button
            onClick={onEndVisit}
            className="mt-4 w-full rounded-2xl bg-primary text-primary-foreground py-4 text-lg font-semibold inline-flex items-center justify-center gap-2"
          >
            <ClipboardList className="size-5" /> End Visit
          </button>
        </>
      )}

      {stage === "summary" && (
        <div className="rounded-2xl bg-success/10 border border-success/30 p-4 flex items-start gap-3">
          <div className="size-10 rounded-xl bg-success/20 text-success grid place-items-center shrink-0">
            <Check className="size-5" />
          </div>
          <div>
            <div className="font-semibold text-success">AI Patient Advocate visit completed</div>
            <p className="text-[13px] text-muted-foreground mt-1">
              The structured visit summary is ready below and saved to patient history.
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function ConversationRow({ speaker, text }: { speaker: string; text: string }) {
  const isAdvocate = speaker === "MedsBuddy";
  return (
    <div
      className={`rounded-xl border p-3 ${
        isAdvocate ? "bg-primary/5 border-primary/20" : "bg-background"
      }`}
    >
      <div
        className={`text-[12px] font-semibold ${isAdvocate ? "text-primary" : "text-muted-foreground"}`}
      >
        {speaker}
      </div>
      <div className="text-[14px] leading-relaxed mt-1">{text}</div>
    </div>
  );
}

function VisitSummary({
  summary,
  onSpeakSummary,
  summarySpeaking,
}: {
  summary: VisitSummaryData;
  onSpeakSummary: () => void;
  summarySpeaking: boolean;
}) {
  return (
    <Section icon={ClipboardList} title="Visit Summary" tint="success">
      <div className="space-y-3">
        <button
          onClick={onSpeakSummary}
          className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-semibold inline-flex items-center justify-center gap-2"
        >
          <Volume2 className="size-4" />
          {summarySpeaking ? "Speaking visit summary..." : "Speak Brief Summary"}
        </button>
        <SummaryBlock title="Reason for Visit" body={summary.visitSummary} />
        <SummaryBlock title="Patient Symptoms" body={summary.patientConcerns} />
        <SummaryBlock title="Doctor Assessment" body={summary.doctorAssessment} />
        <SummaryBlock title="Diagnosis" body={summary.diagnosis} />
        <SummaryBlock title="Medication Instructions" body={summary.medicationGuidance} />
        <SummaryBlock title="Follow-up Plan" body={summary.followUpPlan} />
        <SummaryBlock title="Warning Signs" body={summary.warningSigns} />
        <SummaryBlock title="Questions Asked by MedsBuddy" body={summary.medsBuddyQuestions} />
        <SummaryBlock title="Doctor Responses (Summarized)" body={summary.doctorAnswers} />
        <SummaryBlock title="Plain-language Explanation" body={summary.simpleExplanation} />
        <SummaryBlock title="Caregiver Summary" body={summary.caregiverSummary} />
        <SummaryBlock title="Next Appointment Checklist" body={summary.nextAppointmentQuestions} />
      </div>
    </Section>
  );
}

function SummaryBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border bg-background p-3">
      <div className="text-[12px] font-semibold text-primary mb-1">{title}</div>
      <div className="text-[14px] leading-relaxed">{body}</div>
    </div>
  );
}

function MetricSection({
  icon,
  title,
  value,
  label,
  children,
}: {
  icon: typeof Pill;
  title: string;
  value: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Section icon={icon} title={title} tint="primary">
      <div className="text-3xl font-bold tracking-tight">{value}</div>
      <div className="text-xs text-muted-foreground mb-3">{label}</div>
      {children}
    </Section>
  );
}

function Section({
  icon: Icon,
  title,
  tint,
  children,
}: {
  icon: typeof Pill;
  title: string;
  tint: "primary" | "success" | "warning";
  children: React.ReactNode;
}) {
  const tintClass = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
  }[tint];
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-card border shadow-card p-4 mb-3"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className={`size-8 rounded-lg grid place-items-center ${tintClass}`}>
          <Icon className="size-4" />
        </div>
        <h2 className="text-[15px] font-semibold">{title}</h2>
      </div>
      {children}
    </motion.div>
  );
}
