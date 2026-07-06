import { o as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as useApp, t as adherence } from "./store-CNkGaKo_.mjs";
import { a as humanizePreVisitSummary, c as speak, l as stopSpeaking, o as routeMedsBuddyAgent, r as generateVisitSummary, s as saveVisitMemory, t as analyzeCarePlanGaps, u as transcribeAudio } from "./voice-CdDuvBHY.mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { H as Check, L as ClipboardList, b as Mic, c as Sparkles, r as Volume2, s as Stethoscope } from "../_libs/lucide-react.mjs";
import { t as motion } from "../_libs/framer-motion.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/doctor.index-DAVc1MLR.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function buildPatientSummary(state) {
	const { profile, meds, doses, patientContext } = state;
	const last7 = Date.now() - 7 * 864e5;
	const taken = doses.filter((d) => d.at >= last7 && d.status === "taken").length;
	const missed = doses.filter((d) => d.at >= last7 && d.status !== "taken").length;
	const structuredContext = filterCurrentVisitPreVisitContext(withDefaultPreVisitContext(patientContext), state);
	const medicationHistory = doses.length === 0 ? "I don't have enough recent medication information yet." : [taken > 0 ? `${taken} dose${taken === 1 ? "" : "s"} marked as taken recently` : "", missed > 0 ? `${missed} dose${missed === 1 ? "" : "s"} marked as missed or skipped recently` : ""].filter(Boolean).join("; ") || "Recent medication details are limited.";
	const preVisitContext = normalizePreVisitContext(structuredContext, meds);
	return JSON.stringify({
		instruction: "Generate today's patient-friendly pre-visit summary from this structured PatientContext. Do not use raw chat artifacts. Do not invent facts.",
		profile: {
			name: profile.name || "the patient",
			allergies: profile.allergies || "",
			conditions: profile.conditions || ""
		},
		patientContext: preVisitContext,
		savedMedications: preVisitContext.medications,
		medicationHistory
	}, null, 2);
}
function buildReadablePreVisitFallback(state) {
	const { profile, meds, patientContext } = state;
	const context = normalizePreVisitContext(filterCurrentVisitPreVisitContext(withDefaultPreVisitContext(patientContext), state), meds);
	return [
		"Before today's appointment, here's what I'll share with your doctor after your approval.",
		`This summary is for ${profile.name || "the patient"}.`,
		"",
		"Reason for Visit",
		context.visitReason ? `- ${context.visitReason}` : "- Add the main reason for today's visit before sharing with the doctor.",
		"",
		"Current Symptoms",
		...context.symptoms.length ? context.symptoms.map((symptom) => `- ${symptom}`) : ["- No current symptoms captured from Talk yet."],
		...context.onset || context.duration ? [
			"",
			"Timeline",
			...context.onset ? [`- Started: ${context.onset}`] : [],
			...context.duration ? [`- ${context.duration}`] : []
		] : [],
		"",
		"Current Medications",
		...context.medications.length ? context.medications.map((medication) => `- ${medication}`) : ["- I don't have enough recent medication information yet."],
		...context.concerns.length ? [
			"",
			"Patient Concerns",
			...context.concerns.map((concern) => `- ${concern}`)
		] : [],
		...context.questionsForDoctor.length ? [
			"",
			"Questions for Doctor",
			...context.questionsForDoctor.map((question) => `- ${question}`)
		] : [],
		...context.patientNotes.length ? [
			"",
			"Patient Notes",
			...context.patientNotes.slice(0, 3).map((note) => `- ${note}`)
		] : [],
		...profile.allergies ? [
			"",
			"Allergies",
			`- ${profile.allergies}`
		] : [],
		...profile.conditions ? [
			"",
			"Existing Conditions",
			`- ${profile.conditions}`
		] : []
	].join("\n");
}
function withDefaultPreVisitContext(context) {
	return Object.assign({
		symptoms: [],
		medications: [],
		visitReason: "",
		onset: "",
		duration: "",
		patientNotes: [],
		concerns: [],
		questionsForDoctor: [],
		pregnancyContext: "",
		updatedAt: null
	}, context ?? {});
}
function normalizeClinicalTextForVisit(text) {
	return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}
function getClinicalKeywordsForVisit(text) {
	const stopWords = new Set([
		"about",
		"and",
		"for",
		"patient",
		"that",
		"the",
		"this",
		"while",
		"with"
	]);
	return normalizeClinicalTextForVisit(text).split(" ").filter((word) => word.length >= 4 && !stopWords.has(word));
}
function currentTalkMentionsClinicalItem(text, item) {
	const cleanText = normalizeClinicalTextForVisit(text);
	const cleanItem = normalizeClinicalTextForVisit(item);
	if (!cleanText || !cleanItem) return false;
	if (cleanText.includes(cleanItem)) return true;
	const keywords = getClinicalKeywordsForVisit(item);
	if (!keywords.length) return false;
	return keywords.filter((word) => cleanText.includes(word)).length >= Math.min(2, keywords.length);
}
function getCurrentTalkConversationText(state) {
	const currentVisitStartedAt = state.patientContext.currentVisitStartedAt ?? 0;
	const activeThread = state.threads.find((thread) => thread.id === state.activeThreadId);
	return (activeThread ? [activeThread] : state.threads.slice(0, 1)).flatMap((thread) => thread.messages.filter((message) => message.role === "user" && message.at >= currentVisitStartedAt).map((message) => message.content)).join(" ");
}
function getSavedVisitSummaryTextForVisit(state) {
	return [...state.visits.flatMap((visit) => [
		visit.summary,
		visit.patientSummary,
		visit.topicsDiscussed,
		visit.diagnosisOrConcerns,
		visit.notes
	]), ...state.summaries.map((summary) => summary.text)].filter(Boolean).join(" ");
}
function filterCurrentVisitPreVisitContext(context, state) {
	const currentTalkText = getCurrentTalkConversationText(state);
	const historyText = getSavedVisitSummaryTextForVisit(state);
	const keepCurrentField = (value) => {
		if (!value.trim()) return "";
		if (currentTalkMentionsClinicalItem(currentTalkText, value)) return value;
		if (currentTalkText.trim() && !currentTalkMentionsClinicalItem(historyText, value)) return value;
		return "";
	};
	const keepCurrentList = (values) => values.filter((value) => {
		if (currentTalkMentionsClinicalItem(currentTalkText, value)) return true;
		if (currentTalkText.trim() && !currentTalkMentionsClinicalItem(historyText, value)) return true;
		return false;
	});
	return {
		...context,
		symptoms: keepCurrentList(context.symptoms),
		visitReason: keepCurrentField(context.visitReason),
		onset: keepCurrentField(context.onset),
		duration: keepCurrentField(context.duration),
		patientNotes: keepCurrentList(context.patientNotes),
		concerns: keepCurrentList(context.concerns),
		questionsForDoctor: keepCurrentList(context.questionsForDoctor)
	};
}
function normalizePreVisitContext(context, meds) {
	const symptoms = normalizePreVisitSymptoms(context.symptoms);
	const visitReason = context.visitReason?.trim() || deriveReasonForVisit({
		...context,
		symptoms
	});
	const patientNotes = normalizePatientNotes(context.patientNotes);
	return {
		...context,
		symptoms,
		medications: normalizePreVisitMedications([...context.medications, ...meds.map((med) => [
			med.name,
			med.dosage,
			med.frequency
		].filter(Boolean).join(" ").replace(/\s+/g, " "))]),
		visitReason,
		patientNotes
	};
}
function deriveReasonForVisit(context) {
	const clinicalDetails = [
		...context.symptoms,
		...context.concerns,
		...context.patientNotes
	].map((item) => item.replace(/\bsymptoms should be discussed with the doctor during the visit\.?$/i, "").replace(/\.$/, "").trim()).filter(Boolean).filter((item, index, items) => {
		const key = normalizeTranscriptText(item);
		return items.findIndex((candidate) => normalizeTranscriptText(candidate) === key) === index;
	}).slice(0, 4);
	if (!clinicalDetails.length) return "";
	const [primary, ...related] = clinicalDetails;
	const relatedText = related.length ? ` with ${formatNaturalList(related)}` : "";
	const timeline = context.duration || context.onset;
	return `${primary}${relatedText}${timeline ? ` ${timeline.replace(/^started\s*/i, "starting ").replace(/\.$/, "").trim()}` : ""}.`;
}
function formatNaturalList(items) {
	if (items.length <= 1) return items[0] ?? "";
	if (items.length === 2) return `${items[0]} and ${items[1]}`;
	return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}
function normalizePreVisitSymptoms(symptoms) {
	const output = [];
	for (const symptom of symptoms) {
		const clean = symptom.trim().replace(/\.$/, "");
		if (!clean) continue;
		output.push(`${clean}.`);
	}
	return Array.from(new Set(output));
}
function normalizePatientNotes(notes) {
	const output = notes.map((note) => note.trim()).filter(Boolean);
	return Array.from(new Set(output));
}
function normalizePreVisitMedications(lines) {
	const medications = [];
	const seen = /* @__PURE__ */ new Set();
	for (const line of lines) {
		const clean = line.replace(/\s+/g, " ").trim();
		const key = clean.toLowerCase();
		if (!clean || seen.has(key)) continue;
		seen.add(key);
		medications.push(clean);
	}
	return medications;
}
function getPatientId(state) {
	return state.profile.name?.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "default-patient";
}
function buildMedicationHistory(state) {
	return `${state.meds.map((med) => `${med.name} ${med.dosage} (${med.frequency})`).join("; ") || "No medications listed."}\nRecent dose history: ${state.doses.slice(0, 8).map((dose) => `${dose.medName}: ${dose.status} at ${new Date(dose.at).toLocaleString()}`).join("; ") || "No recent dose history."}`;
}
var WAKE_WORD_PATTERN = /\b(?:(?:hey|okay|ok|hello|hi)\s+)?(?:meds\s*buddy|medz\s*buddy|medsbuddy|medbuddy|miss\s*buddy|mrs\s*buddy|matt'?s?\s*body|meds\s*body|miss\s*body|it'?s\s*buddy|made\s+his\s+body)\b/i;
var TRANSCRIPT_MERGE_DELAY_MS = 2600;
var STOP_TALKING_PATTERN = /\b(?:meds\s*buddy\s*)?(?:please\s+)?(?:stop talking|do not speak|don't speak|be quiet|stay quiet|stop speaking)\b/i;
var START_TALKING_PATTERN = /\b(?:meds\s*buddy\s*)?(?:please\s+)?(?:start talking|start speaking|you can speak now|speak now|talk now|you may speak)\b/i;
function getSupportedRecordingMimeType() {
	if (typeof MediaRecorder === "undefined") return "";
	return [
		"audio/webm;codecs=opus",
		"audio/webm",
		"audio/mp4",
		"audio/mpeg"
	].find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}
function cleanSpeechToTextTranscript(text) {
	let cleaned = text.replace(/\s+/g, " ").trim();
	for (const [pattern, replacement] of [
		[/\bvicente\b/gi, "Vasanthi"],
		[/\bvasanthi\b/gi, "Vasanthi"],
		[/\bmiss\s+buddy\b/gi, "MedsBuddy"],
		[/\bmrs\s+buddy\b/gi, "MedsBuddy"],
		[/\bmiss\s+body\b/gi, "MedsBuddy"],
		[/\bmeds\s+body\b/gi, "MedsBuddy"],
		[/\bariana\s+grande\b/gi, ""],
		[/^listen to how is your (.+)$/i, "How is your $1?"]
	]) cleaned = cleaned.replace(pattern, replacement);
	return cleaned.replace(/\s+([?.!,])/g, "$1").replace(/\?\?+/g, "?").trim();
}
function cleanTranscriptInput(text) {
	return cleanSpeechToTextTranscript(text.replace(/^\s*(doctor|patient|medsbuddy)\s*:\s*/i, ""));
}
function normalizeTranscriptText(text) {
	return text.toLowerCase().replace(/\s+/g, " ").trim();
}
function splitIntoPhrases(text) {
	return text.replace(/\s+/g, " ").split(/(?<=[.!?])\s+|\n+|;\s*/).map((phrase) => phrase.trim()).filter(Boolean);
}
function removeDuplicateRepeatedPhrases(text) {
	const seen = /* @__PURE__ */ new Set();
	const phrases = [];
	for (const phrase of splitIntoPhrases(text)) {
		const key = normalizeTranscriptText(phrase);
		if (seen.has(key)) continue;
		seen.add(key);
		phrases.push(phrase);
	}
	return phrases.join(" ");
}
function isLowValueTranscript(text) {
	const clean = normalizeTranscriptText(text).replace(/[^\w\s]/g, "").trim();
	if (!clean) return true;
	if (/^(doctor|patient|medsbuddy|say doctor|a doctor|the doctor)$/.test(clean)) return true;
	if (/^\d+\s*(a\s*)?doctor$/.test(clean)) return true;
	return clean.split(/\s+/).length < 3 && !WAKE_WORD_PATTERN.test(clean);
}
function getTranscriptDelta(currentTranscript, lastProcessedTranscript) {
	const current = currentTranscript.trim();
	const previous = lastProcessedTranscript.trim();
	if (!previous) return current;
	if (normalizeTranscriptText(current) === normalizeTranscriptText(previous)) return "";
	if (current.startsWith(previous)) return current.slice(previous.length).trim();
	return current;
}
function parseTranscriptMessages(transcript, selectedSpeaker, existingMessages = []) {
	const clean = transcript.trim();
	if (!clean) return [];
	const matches = [...clean.matchAll(/(Doctor|Patient|MedsBuddy)\s*:/gi)];
	if (!matches.length) {
		const cleanedText = removeDuplicateRepeatedPhrases(clean);
		if (selectedSpeaker !== "Auto") return [{
			speaker: selectedSpeaker,
			text: cleanedText
		}];
		return [{
			speaker: "Unknown",
			text: cleanedText,
			speakerConfidence: 0,
			speakerReason: "Awaiting Qwen speaker classification.",
			speakerSource: "qwen_pending"
		}];
	}
	const messages = [];
	for (const [index, match] of matches.entries()) {
		const start = (match.index ?? 0) + match[0].length;
		const end = matches[index + 1]?.index ?? clean.length;
		const text = removeDuplicateRepeatedPhrases(clean.slice(start, end));
		if (!text) continue;
		const matchedSpeaker = match[1];
		const classification = classifySpeakerFromTranscript(text, [...existingMessages, ...messages], matchedSpeaker);
		messages.push({
			speaker: classification.speaker,
			text,
			speakerConfidence: classification.confidence,
			speakerReason: classification.reason,
			speakerSource: classification.source
		});
	}
	return messages;
}
function semanticSpeakerToConversationSpeaker(speaker) {
	if (speaker === "doctor") return "Doctor";
	if (speaker === "patient") return "Patient";
	if (speaker === "medsbuddy") return "MedsBuddy";
	return null;
}
function lastMedsBuddyQuestionWasForDoctor(messages) {
	const lastMessage = [...messages].reverse().find((message) => message.speaker !== "Patient");
	if (lastMessage?.speaker !== "MedsBuddy") return false;
	return /\b(doctor|could you|can you|should she|should he|warning signs?|follow[-\s]?up|urgent care|medical attention|on .* behalf|please clarify|please confirm)\b/i.test(lastMessage.text);
}
function lastMedsBuddyQuestionWasForPatient(messages) {
	const lastMessage = messages[messages.length - 1];
	if (lastMessage?.speaker !== "MedsBuddy") return false;
	if (!/\?/.test(lastMessage.text)) return false;
	return /\b(vasanthi|patient)\b/i.test(lastMessage.text) && /\b(what|when|how|which|can you|could you|do you|are you|would you|confirm|tell me)\b/i.test(lastMessage.text);
}
function looksLikePatientFirstPersonStatement(text) {
	const clean = normalizeTranscriptText(text);
	if (/\?$/.test(clean)) return false;
	return /\b(i|i'm|i am|i’ve|i've|i have|i had|me|my|mine)\b/i.test(clean);
}
function isStopTalkingCommand(text) {
	return STOP_TALKING_PATTERN.test(text);
}
function isStartTalkingCommand(text) {
	return START_TALKING_PATTERN.test(text);
}
function isTalkingControlCommand(text) {
	return isStopTalkingCommand(text) || isStartTalkingCommand(text);
}
function looksLikeDoctorAnswerToMedsBuddy(text) {
	const clean = normalizeTranscriptText(text);
	return /^(yes|no|correct|that's right|that is right)\b/i.test(clean);
}
function classifySpeakerFromTranscript(text, existingMessages, hintedSpeaker) {
	const clean = normalizeTranscriptText(text);
	const withoutWakeWord = normalizeTranscriptText(text.replace(WAKE_WORD_PATTERN, " "));
	const recentHumanMessage = [...existingMessages].reverse().filter((message) => message.speaker === "Doctor" || message.speaker === "Patient")[0];
	if (lastMedsBuddyQuestionWasForPatient(existingMessages) && looksLikePatientFirstPersonStatement(text)) return {
		speaker: "Patient",
		confidence: .97,
		reason: "MedsBuddy just asked the patient a clarification question.",
		source: "local_rules"
	};
	if (lastMedsBuddyQuestionWasForDoctor(existingMessages) && looksLikeDoctorAnswerToMedsBuddy(text)) return {
		speaker: "Doctor",
		confidence: .96,
		reason: "MedsBuddy just asked the doctor a clarification question and this is medical guidance.",
		source: "local_rules"
	};
	if (WAKE_WORD_PATTERN.test(text)) return {
		speaker: "Doctor",
		confidence: .72,
		reason: "MedsBuddy was called.",
		source: "local_rules"
	};
	if (looksLikePatientFirstPersonStatement(withoutWakeWord)) return {
		speaker: "Patient",
		confidence: .72,
		reason: "First-person patient statement.",
		source: "local_rules"
	};
	if (/^doctor\b/i.test(clean)) return {
		speaker: "Doctor",
		confidence: .78,
		reason: "Transcript explicitly starts with doctor.",
		source: "local_rules"
	};
	if (looksLikeDoctorQuestionToPatient(text)) return {
		speaker: "Doctor",
		confidence: .74,
		reason: "Doctor-style question or prompt to the patient.",
		source: "local_rules"
	};
	if (/^patient\b/i.test(clean)) return {
		speaker: "Patient",
		confidence: .78,
		reason: "Transcript explicitly starts with patient.",
		source: "local_rules"
	};
	if (recentHumanMessage?.speaker === "Doctor") {
		if (looksLikeDoctorQuestionToPatient(recentHumanMessage.text)) return {
			speaker: "Patient",
			confidence: .62,
			reason: "Previous doctor message was a question to the patient.",
			source: "local_rules"
		};
	}
	if (recentHumanMessage?.speaker === "Patient" && looksLikeDoctorQuestionToPatient(text)) return {
		speaker: "Doctor",
		confidence: .62,
		reason: "Question after patient response.",
		source: "local_rules"
	};
	if (/\?$/.test(clean)) return {
		speaker: "Doctor",
		confidence: .62,
		reason: "Question mark suggests doctor question.",
		source: "local_rules"
	};
	if (hintedSpeaker && hintedSpeaker !== "MedsBuddy") return {
		speaker: hintedSpeaker,
		confidence: .68,
		reason: "ElevenLabs diarization label used as a hint; local rules were inconclusive.",
		source: "elevenlabs_label"
	};
	if (recentHumanMessage?.speaker) return {
		speaker: recentHumanMessage.speaker,
		confidence: .58,
		reason: "Local rules were inconclusive; using recent conversation flow.",
		source: "local_rules"
	};
	return {
		speaker: "Patient",
		confidence: .52,
		reason: "Local rules were inconclusive; defaulting to Patient.",
		source: "local_rules"
	};
}
function looksLikeDoctorQuestionToPatient(text) {
	const clean = normalizeTranscriptText(text);
	return /\?$/.test(clean) || /\b(what|when|where|why|how|tell me|describe|do you|are you|have you)\b/i.test(clean);
}
function dedupeConversation(messages) {
	const seen = /* @__PURE__ */ new Set();
	const cleanMessages = [];
	for (const message of messages) {
		const text = removeDuplicateRepeatedPhrases(message.text);
		const key = `${message.speaker}:${normalizeTranscriptText(text)}`;
		if (!text || seen.has(key)) continue;
		seen.add(key);
		cleanMessages.push({
			...message,
			text
		});
	}
	return cleanMessages;
}
function mergeAdjacentConversationMessages(messages) {
	const merged = [];
	for (const message of messages) {
		const text = removeDuplicateRepeatedPhrases(message.text).trim();
		if (!text) continue;
		const previous = merged[merged.length - 1];
		if (previous?.speaker === message.speaker && message.speaker !== "MedsBuddy" && !isTalkingControlCommand(previous.text) && !isTalkingControlCommand(text)) {
			previous.text = removeDuplicateRepeatedPhrases(`${previous.text} ${text}`);
			previous.speakerConfidence = Math.min(previous.speakerConfidence ?? 1, message.speakerConfidence ?? previous.speakerConfidence ?? 1);
			previous.speakerReason = [previous.speakerReason, message.speakerReason].filter(Boolean).join(" ");
			continue;
		}
		merged.push({
			...message,
			text
		});
	}
	return merged;
}
function conversationToTranscript(messages) {
	return dedupeConversation(messages).map((row) => `${row.speaker}: ${row.text}`).join("\n");
}
function getSpeakerLines(messages, speaker) {
	return dedupeConversation(messages).filter((message) => message.speaker === speaker).map((message) => message.text);
}
function joinLines(lines, fallback) {
	const clean = lines.map(removeDuplicateRepeatedPhrases).filter(Boolean);
	return clean.length ? clean.join(" ") : fallback;
}
function getPatientConcernText(messages) {
	return joinLines(getSpeakerLines(messages, "Patient"), "No patient concerns have been captured yet.");
}
function getDoctorAnswerText(messages) {
	return joinLines(getSpeakerLines(messages, "Doctor"), "No doctor response has been captured yet.");
}
function getWarningSignText(messages) {
	return joinLines(getSpeakerLines(messages, "Doctor").filter((line) => /warning|urgent|emergency|severe|worse|worsen/i.test(line)), "Warning signs have not been discussed yet. MedsBuddy can ask the doctor to clarify them.");
}
function looksLikeDoctorCarePlanInstruction(text) {
	const clean = normalizeTranscriptText(text);
	if (/give me|tell me|show me|patient history|history|details|information/.test(clean)) return false;
	if (/\b(where|how|when|what|why|describe|do you|are you|does it)\b/i.test(clean)) return false;
	return /(?:i will|i'll|we will|start|prescrib|give (?:her|him|the patient|you)|take|continue|stop|finish|schedule|follow up|follow-up|mg|mcg|ml|tablet|capsule|dose)/i.test(clean) || /\b(?:in|within|after)\s+(?:one|two|three|four|five|seven|ten|fourteen|\d+)\s*(?:days?|weeks?|months?)\b/i.test(clean) || /\b(?:if|watch for|seek care|urgent care|emergency|worsening|worse|warning signs?)\b/i.test(clean);
}
function mergeRecentDoctorCarePlan(messages, fallbackText) {
	const merged = [];
	for (let index = messages.length - 1; index >= 0; index -= 1) {
		const message = messages[index];
		if (message.speaker !== "Doctor" || !looksLikeDoctorCarePlanInstruction(message.text)) break;
		merged.unshift(message.text);
	}
	return (merged.length ? merged.join(" ") : fallbackText).replace(WAKE_WORD_PATTERN, "").replace(/\s+/g, " ").trim();
}
function collectDoctorCarePlan(messages, fallbackText) {
	return removeDuplicateRepeatedPhrases([...messages.filter((message) => message.speaker === "Doctor").map((message) => message.text).filter((line) => looksLikeDoctorCarePlanInstruction(line)), fallbackText].map((line) => cleanTranscriptInput(line).replace(WAKE_WORD_PATTERN, " ").trim()).filter(Boolean).slice(-8).join(" ")).replace(/\s+/g, " ").trim();
}
function extractMedicationInstructionDetails(text) {
	const clean = cleanTranscriptInput(text).replace(WAKE_WORD_PATTERN, " ").replace(/\s+/g, " ");
	const afterAction = clean.toLowerCase().match(/\b(?:start|prescribe|prescribed|prescribing|give|take|continue|finish|stop)\s+(?:her|him|the patient|you|the)?\s*([a-z][a-z-]*(?:\s+[a-z][a-z-]*){0,2})/i)?.[1];
	const dose = clean.match(/\b\d+(?:\.\d+)?\s*(?:mg|milligrams?|mcg|micrograms?|g|grams?|ml|units?|tablets?|tabs?|capsules?|caps?|pills?|puffs?|drops?)\b/i)?.[0] || clean.match(/\b(?:one|two|three|four|five|[1-5])\s+(?:tablets?|tabs?|capsules?|caps?|pills?|doses?)\b/i)?.[0];
	const interval = clean.match(/\b(?:every|q)\s*\d+\s*(?:hours?|hrs?|h|days?|d)\b/i)?.[0];
	const frequency = clean.match(/\b(?:once|twice|three times|four times|[1-4] times)\s+(?:(?:a|per)\s+day|daily)\b|\b(?:daily|bid|tid|qid)\b/i)?.[0];
	const timing = clean.match(/\b(?:morning|afternoon|evening|night|bedtime|breakfast|lunch|dinner|with food|after food|before food|with meals?|after meals?|before meals?|empty stomach)\b/i)?.[0];
	const duration = clean.match(/\bfor\s+(?:one|two|three|four|five|seven|ten|fourteen|\d+)\s*(?:days?|weeks?|months?)\b|\b(?:one|two|three|four|five|seven|ten|fourteen|\d+)\s*(?:days?|weeks?|months?)\s*(?:course)?\b/i)?.[0];
	return {
		medication: afterAction || "",
		dose: dose || "",
		frequency: frequency || "",
		timing: timing || "",
		duration: duration || "",
		interval: interval || ""
	};
}
function formatMedicationName(name) {
	return name.replace(/\b(?:her|him|the patient|you|the)\b/gi, " ").replace(/\s+/g, " ").trim().replace(/\b\w/g, (letter) => letter.toUpperCase());
}
function normalizeMedicationFrequency(details) {
	return [details.frequency || details.interval || details.timing, details.duration].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}
function extractPrescribedMedicationFromCarePlan(text, messages) {
	const details = extractMedicationInstructionDetails(collectDoctorCarePlan(messages, mergeRecentDoctorCarePlan(messages, text)));
	if (isMissingMedicationName(details) || !hasMedicationDose(details) || !hasMedicationFrequency(details)) return null;
	const name = formatMedicationName(details.medication);
	const frequency = normalizeMedicationFrequency(details);
	if (!name || !details.dose || !frequency) return null;
	return {
		name,
		dosage: details.dose,
		frequency,
		times: []
	};
}
function getMissingMedicationInstructionFields(details) {
	return [
		isMissingMedicationName(details) && "medication name",
		!hasMedicationDose(details) && "dosage",
		!hasMedicationFrequency(details) && "frequency",
		!details.duration && "duration"
	].filter(Boolean);
}
function carePlanKey(text, details) {
	return normalizeTranscriptText([
		details.medication,
		details.dose,
		details.frequency || details.interval,
		details.timing,
		details.duration,
		text
	].filter(Boolean).join(" ")).slice(0, 180);
}
function isMissingMedicationName(details) {
	return !details.medication || /\b(medication|medicine|tablet|tablets|capsule|capsules|pill|pills|dose|doses|those|that|these|this)\b/i.test(details.medication);
}
function hasMedicationDose(details) {
	return Boolean(details.dose);
}
function hasMedicationFrequency(details) {
	return Boolean(details.frequency || details.interval || details.timing);
}
function getCarePlanCompletion(details, messages) {
	const medicationNameComplete = !isMissingMedicationName(details);
	const dosageComplete = hasMedicationDose(details);
	const frequencyComplete = hasMedicationFrequency(details);
	const durationComplete = Boolean(details.duration);
	return {
		medicationComplete: medicationNameComplete && dosageComplete && frequencyComplete && durationComplete,
		medicationNameComplete,
		dosageComplete,
		frequencyComplete,
		durationComplete,
		followUpComplete: hasCarePlanFollowUp(messages),
		warningSignsComplete: hasCarePlanWarningSigns(messages)
	};
}
function hasCarePlanFollowUp(messages) {
	return messages.some((message) => message.speaker === "Doctor" && /\b(follow up|follow-up|come back|return|see me|see us|appointment|schedule|check in|recheck|in (?:one|two|three|four|five|seven|ten|fourteen|\d+)\s*(days?|weeks?|months?)|next week|tomorrow)\b/i.test(message.text));
}
function hasCarePlanWarningSigns(messages) {
	return messages.some((message) => message.speaker === "Doctor" && /\b(warning signs?|urgent care|emergency|er|seek care|call|worse|worsening|severe)\b/i.test(message.text));
}
function normalizeCarePlanField(field) {
	const clean = String(field ?? "").toLowerCase().replace(/_/g, " ").trim();
	if (/medication.*name|medicine.*name|drug.*name/.test(clean)) return "medication name";
	if (/dosage|dose|amount/.test(clean)) return "dosage";
	if (/frequency|how often|timing|schedule/.test(clean)) return "frequency";
	if (/duration|how long|days|course/.test(clean)) return "duration";
	if (/follow/.test(clean)) return "follow-up";
	if (/warning|urgent|emergency|watch/.test(clean)) return "warning signs";
	return null;
}
function carePlanFieldIsComplete(field, completion) {
	switch (field) {
		case "medication name": return completion.medicationNameComplete;
		case "dosage": return completion.dosageComplete;
		case "frequency": return completion.frequencyComplete;
		case "duration": return completion.durationComplete;
		case "follow-up": return completion.followUpComplete;
		case "warning signs": return completion.warningSignsComplete;
	}
}
function carePlanFieldFromQuestion(question) {
	if (/medication name|medicine name|which medication|what medication/i.test(question)) return "medication name";
	if (/\bdose|dosage|mg|how much/i.test(question)) return "dosage";
	if (/how often|frequency|when should|what time|timing/i.test(question)) return "frequency";
	if (/how many days|how long|duration|course/i.test(question)) return "duration";
	if (/follow[-\s]?up|come back|return|appointment/i.test(question)) return "follow-up";
	if (/warning signs?|urgent|emergency|watch for|seek care/i.test(question)) return "warning signs";
	return null;
}
function getAskedCarePlanFields(handledCarePlanKeys) {
	if (!handledCarePlanKeys) return [];
	return Array.from(handledCarePlanKeys).map((key) => key.match(/^care-plan-ask:(.+)$/)?.[1]).map(normalizeCarePlanField).filter(Boolean);
}
function markCarePlanFieldAsked(field, handledCarePlanKeys) {
	handledCarePlanKeys?.add(`care-plan-ask:${field}`);
}
function getCarePlanClarificationQuestion(missingFields, instruction, messages, handledCarePlanKeys) {
	normalizeTranscriptText(instruction);
	const askOnce = (key, question) => {
		if (handledCarePlanKeys?.has(key)) return null;
		handledCarePlanKeys?.add(key);
		return question;
	};
	if (missingFields.includes("medication name")) return askOnce("care-plan-ask:medication-name", "Doctor, could you confirm the medication name?");
	if (missingFields.includes("dosage")) return askOnce("care-plan-ask:dosage", "Doctor, could you confirm the dose?");
	if (missingFields.includes("frequency")) return askOnce("care-plan-ask:frequency", "Doctor, could you confirm how often the patient should take it?");
	if (missingFields.includes("duration")) return askOnce("care-plan-ask:duration", "Doctor, could you confirm how many days the patient should take it?");
	if (!hasCarePlanFollowUp(messages) && !hasCarePlanWarningSigns(messages)) {
		const followUpKey = "care-plan-ask:follow-up";
		const warningSignsKey = "care-plan-ask:warning-signs";
		if (handledCarePlanKeys?.has(followUpKey) || handledCarePlanKeys?.has(warningSignsKey)) return null;
		handledCarePlanKeys?.add(followUpKey);
		handledCarePlanKeys?.add(warningSignsKey);
		return "Doctor, could you confirm when the patient should follow up and what warning signs should prompt urgent medical attention?";
	}
	if (!hasCarePlanFollowUp(messages)) return askOnce("care-plan-ask:follow-up", "Doctor, when would you like the patient to schedule a follow-up appointment?");
	if (!hasCarePlanWarningSigns(messages)) return askOnce("care-plan-ask:warning-signs", "Doctor, are there any warning signs the patient should watch for?");
	return null;
}
function buildCarePlanAcknowledgement(text, messages, handledCarePlanKeys) {
	const instruction = collectDoctorCarePlan(messages, mergeRecentDoctorCarePlan(messages, text));
	const details = extractMedicationInstructionDetails(instruction);
	const missingFields = getMissingMedicationInstructionFields(details);
	if (!(Boolean(details.medication) || Boolean(details.dose) || Boolean(details.frequency) || Boolean(details.interval) || Boolean(details.timing) || /\b(tablet|capsule|pill|dose|take|use|continue|finish|start|stop|prescribe)\b/i.test(instruction))) return null;
	const clarification = getCarePlanClarificationQuestion(missingFields, instruction, messages, handledCarePlanKeys);
	if (clarification) return clarification;
	const key = carePlanKey(instruction, details);
	if (handledCarePlanKeys?.has(key)) return null;
	handledCarePlanKeys?.add(key);
	return "Thank you, Doctor. I’ve updated the patient’s care plan.";
}
function buildValidatedCarePlanGapResponse(result, instruction, completion, handledCarePlanKeys) {
	if (!result) return null;
	if (result.allComplete) return completion.medicationComplete && completion.followUpComplete && completion.warningSignsComplete ? "Thank you, Doctor. I’ve updated the patient’s care plan." : null;
	const question = result.question?.trim();
	if (!question) return null;
	if (/\b(would you like|drug interactions?|no known|side effects?|rash|itching|diarrhea)\b/i.test(question)) return null;
	const requestedField = normalizeCarePlanField(result.nextField) || carePlanFieldFromQuestion(question);
	if (!requestedField) return null;
	if (carePlanFieldIsComplete(requestedField, completion)) return null;
	if (getAskedCarePlanFields(handledCarePlanKeys).includes(requestedField)) return null;
	markCarePlanFieldAsked(requestedField, handledCarePlanKeys);
	return question;
}
async function buildCarePlanResponseWithQwen({ text, messages, state, patientContext, handledCarePlanKeys }) {
	const instruction = collectDoctorCarePlan(messages, mergeRecentDoctorCarePlan(messages, text));
	const details = extractMedicationInstructionDetails(instruction);
	const completion = getCarePlanCompletion(details, messages);
	if (!(Boolean(details.medication) || Boolean(details.dose) || Boolean(details.frequency) || Boolean(details.interval) || Boolean(details.timing) || /\b(tablet|capsule|pill|dose|take|use|continue|finish|start|stop|prescribe|follow[-\s]?up|warning signs?|urgent care|emergency|watch for|seek care)\b/i.test(instruction))) return null;
	const askedFields = getAskedCarePlanFields(handledCarePlanKeys);
	if (completion.medicationComplete && !completion.followUpComplete && !completion.warningSignsComplete && !askedFields.includes("follow-up") && !askedFields.includes("warning signs")) {
		markCarePlanFieldAsked("follow-up", handledCarePlanKeys);
		markCarePlanFieldAsked("warning signs", handledCarePlanKeys);
		return "Doctor, could you confirm when the patient should follow up and what warning signs should prompt urgent medical attention?";
	}
	try {
		const qwenResponse = buildValidatedCarePlanGapResponse((await analyzeCarePlanGaps({
			patientId: getPatientId(state),
			carePlanText: instruction,
			transcript: conversationToTranscript(messages),
			patientContext,
			medicationHistory: buildMedicationHistory(state),
			alreadyAskedFields: getAskedCarePlanFields(handledCarePlanKeys),
			localMedicationComplete: completion.medicationComplete,
			localMedicationNameComplete: completion.medicationNameComplete,
			localDosageComplete: completion.dosageComplete,
			localFrequencyComplete: completion.frequencyComplete,
			localDurationComplete: completion.durationComplete,
			localFollowUpComplete: completion.followUpComplete,
			localWarningSignsComplete: completion.warningSignsComplete
		})).result, instruction, completion, handledCarePlanKeys);
		if (qwenResponse) return qwenResponse;
	} catch {}
	return buildCarePlanAcknowledgement(text, messages, handledCarePlanKeys);
}
async function detectSemanticIntentWithLLM({ latestTranscript, currentTranscript, patientContext, state }) {
	try {
		const result = await routeMedsBuddyAgent({
			patientId: getPatientId(state),
			message: latestTranscript,
			mode: "doctor_visit_live",
			conversation: currentTranscript.split("\n").filter(Boolean).slice(-12).map((line) => ({
				role: "user",
				content: line
			})),
			currentState: {
				approvedPreVisitSummary: patientContext,
				currentVisitTranscript: currentTranscript || "No transcript yet.",
				medicationHistory: buildMedicationHistory(state),
				patientContext: state.patientContext,
				profile: {
					name: state.profile.name,
					allergies: state.profile.allergies,
					conditions: state.profile.conditions
				}
			}
		});
		const decision = parseSemanticIntentDecision(JSON.stringify(result.result ?? {}));
		if (!decision) console.info("[MedsBuddy agent-router] No doctor-visit decision parsed", result.result);
		return decision;
	} catch (error) {
		console.warn("[MedsBuddy agent-router] Doctor visit routing failed", error);
		return null;
	}
}
function parseSemanticIntentDecision(reply) {
	const jsonText = reply.match(/\{[\s\S]*\}/)?.[0];
	if (!jsonText) return null;
	try {
		const parsed = JSON.parse(jsonText);
		const intent = normalizeAdvocateIntent(parsed.intent);
		if (!intent) return null;
		const speaker = parsed.speaker === "doctor" || parsed.speaker === "patient" || parsed.speaker === "medsbuddy" || parsed.speaker === "unknown" ? parsed.speaker : "unknown";
		const response = typeof parsed.response === "string" ? parsed.response.trim() : "";
		return {
			speaker,
			intent,
			shouldRespond: Boolean(parsed.shouldRespond),
			response: sanitizeDoctorVisitAgentResponse(response, intent),
			requestedFields: normalizePatientContextRequestFields(parsed.requestedFields),
			missingFields: normalizePatientContextRequestFields(parsed.missingFields),
			patientClarificationQuestion: typeof parsed.patientClarificationQuestion === "string" ? parsed.patientClarificationQuestion.trim() : "",
			includePreviousVisitHistory: Boolean(parsed.includePreviousVisitHistory)
		};
	} catch {
		return null;
	}
}
function sanitizeDoctorVisitAgentResponse(response, intent) {
	if (!response) return "";
	if (/\b(would you like(?: me)?|drug interactions?|no known|side effects?|contraindications?|rash|itching|diarrhea)\b/i.test(response)) return "";
	if (intent === "care_plan_instruction") return /^Doctor, could you confirm\b/i.test(response) || /^Thank you, Doctor\. I[’']ve updated the patient[’']s care plan\.?$/i.test(response) || /^No further questions, Doctor\./i.test(response) ? response : "";
	return response;
}
function normalizePatientContextRequestFields(fields) {
	if (!Array.isArray(fields)) return [];
	const allowedFields = new Set([
		"reason for visit",
		"symptoms",
		"medications",
		"allergies",
		"medical history",
		"duration",
		"concerns",
		"questions for doctor"
	]);
	const normalized = [];
	for (const field of fields) {
		const clean = String(field).toLowerCase().trim();
		if (!allowedFields.has(clean)) continue;
		const typedField = clean;
		if (!normalized.includes(typedField)) normalized.push(typedField);
	}
	return normalized;
}
function normalizeAdvocateIntent(intent) {
	const value = String(intent ?? "").trim();
	return new Set([
		"direct_call",
		"patient_history_request",
		"medication_history_request",
		"visit_summary_request",
		"warning_signs_request",
		"doctor_answers_request",
		"care_plan_instruction",
		"normal_conversation",
		"none"
	]).has(value) ? value : null;
}
function detectVisitStage(transcript) {
	const clean = normalizeTranscriptText(transcript.split("\n").filter((line) => /^Doctor:/i.test(line)).join(" "));
	if (/\b(any questions|do you have questions|before you go|before we finish|that is all|that's all|we are done|we're done|see you next|front desk|checkout|take care|summary)\b/i.test(clean)) return "visit_closing";
	if (/\b(take|start|continue|stop|finish|prescribe|prescribed|follow up|follow-up|come back|schedule|urgent care|emergency|warning signs?|monitor|care plan|plan is|instructions?)\b/i.test(clean)) return "treatment_plan";
	if (/\b(my diagnosis is|the diagnosis is|diagnosis|diagnosed|assessment|i think this is|i believe this is|this looks like|it looks like|this is likely|most likely)\b/i.test(clean)) return "diagnosis";
	if (/\b(exam|examine|assessment|look at|check|move your|range of motion)\b/i.test(clean)) return "physical_assessment";
	return "patient_history";
}
function canMedsBuddyRespondInStage(stage, intent) {
	if (intent === "patient_history_request" || intent === "medication_history_request" || intent === "visit_summary_request" || intent === "direct_call") return true;
	if (stage === "patient_history" || stage === "physical_assessment") return false;
	if (stage === "diagnosis") return intent === "doctor_answers_request" || intent === "warning_signs_request";
	if (stage === "treatment_plan") return intent === "care_plan_instruction" || intent === "warning_signs_request" || intent === "doctor_answers_request";
	return true;
}
function shouldUseLlmVisitReasoning({ latestText: _latestText, latestSpeaker: _latestSpeaker, latestSpeakerConfidence: _latestSpeakerConfidence, fastIntent: _fastIntent }) {
	return true;
}
function buildDoctorConsentMessage(_patientContext, _patientName) {
	return {
		speaker: "MedsBuddy",
		text: "Hello Doctor. I am MedsBuddy, the patient's AI advocate. With the patient's permission, I can listen during today's visit, answer questions from the approved patient context, and create a visit summary after the appointment. Do I have your consent to participate?"
	};
}
function buildVisitOpeningMessages() {
	return [{
		speaker: "MedsBuddy",
		text: "Thank you, Doctor. I’ll stay quiet unless you ask me a question or a care-plan detail needs clarification."
	}];
}
function cleanVisitLine(text) {
	return cleanSpeechToTextTranscript(text).replace(STOP_TALKING_PATTERN, " ").replace(START_TALKING_PATTERN, " ").replace(WAKE_WORD_PATTERN, " ").replace(/\bariana\s+grande\b/gi, " ").replace(/\bplease\s+be\s+quiet\b/gi, " ").replace(/\bstop\s+talking\b/gi, " ").replace(/\bdo\s+not\s+speak\b/gi, " ").replace(/\bdon't\s+speak\b/gi, " ").replace(/\s+/g, " ").trim();
}
function isConsentOrIntroMessage(message) {
	if (message.speaker !== "MedsBuddy") return false;
	return /\b(i am medsbuddy|ai advocate|permission|consent|participate|thank you, doctor|keep listening|speak when it helps|talking is on)\b/i.test(message.text);
}
function cleanVisitTranscript(messages) {
	return dedupeConversation(messages.filter((message) => !isConsentOrIntroMessage(message)).map((message) => ({
		...message,
		text: cleanVisitLine(message.text)
	})).filter((message) => message.text && !isLowValueTranscript(message.text)));
}
function getContextConcernText(patientContext) {
	const reason = patientContext.match(/Reason for Visit\s*-?\s*([^\n]+)/i)?.[1]?.trim();
	if (reason) return reason;
	return patientContext.split("\n").map((line) => line.trim()).find((line) => line && !/^before today's appointment/i.test(line)) ?? "";
}
function buildSummaryFromTranscript(messages, patientContext = "") {
	const cleanMessages = cleanVisitTranscript(messages);
	const patientLines = getSpeakerLines(cleanMessages, "Patient");
	const doctorLines = getSpeakerLines(cleanMessages, "Doctor");
	const medsBuddyLines = getSpeakerLines(cleanMessages, "MedsBuddy");
	const contextConcernText = getContextConcernText(patientContext);
	const patientConcernText = patientLines.length ? getPatientConcernText(cleanMessages) : contextConcernText || "No patient concerns were captured in the visit transcript.";
	const doctorAnswerText = getDoctorAnswerText(cleanMessages);
	const warningSignText = getWarningSignText(cleanMessages);
	const visitSummaryText = contextConcernText ? `The visit focused on ${contextConcernText}.` : patientLines.length ? `The visit focused on ${patientConcernText}.` : "MedsBuddy captured the doctor visit conversation and generated a structured summary.";
	const diagnosisText = doctorLines.length ? "See the doctor assessment and generated summary for diagnosis details." : "No confirmed diagnosis was documented during this demo visit.";
	const medicationChangesText = "Follow the doctor's medication instructions from the visit. Ask the doctor to clarify any medication name, dose, timing, or duration that is unclear.";
	const followUpText = "Follow the doctor's instructions. Ask the doctor when to follow up and what warning signs require urgent care.";
	const nextQuestions = [
		"What is the likely diagnosis or main concern?",
		"Are there any medication changes, side effects, or missed-dose instructions?",
		"When should the patient follow up?",
		warningSignText.includes("not been discussed") && "What warning signs should prompt urgent care?"
	].filter(Boolean);
	return {
		visitSummary: visitSummaryText,
		diagnosis: diagnosisText,
		medicationChanges: medicationChangesText,
		followUpInstructions: followUpText,
		nextAppointmentQuestions: nextQuestions.length ? nextQuestions.join(" ") : "No additional next-appointment questions were identified from this visit.",
		patientConcerns: patientLines.length ? patientConcernText : contextConcernText || "Patient concerns were discussed during the visit.",
		doctorAssessment: doctorLines.length ? doctorAnswerText : "No doctor assessment was captured yet.",
		medsBuddyQuestions: medsBuddyLines.length ? medsBuddyLines.join(" ") : "MedsBuddy did not need to ask an additional question.",
		doctorAnswers: doctorLines.length ? doctorAnswerText : "No doctor assessment was captured yet.",
		medicationGuidance: medicationChangesText,
		warningSigns: warningSignText,
		followUpPlan: followUpText,
		simpleExplanation: contextConcernText || patientLines.length ? `The visit focused on ${contextConcernText || patientConcernText}.` : "MedsBuddy summarized the visit conversation and doctor instructions.",
		caregiverSummary: contextConcernText || patientLines.length ? `Patient concerns: ${contextConcernText || patientConcernText}. Doctor guidance: ${medicationChangesText}` : "Share the visit summary with a caregiver so they can help monitor next steps."
	};
}
function mergeRemoteSummary(fallback, remote) {
	if (!remote) return fallback;
	return {
		...fallback,
		visitSummary: remote.visitSummary?.trim() || fallback.visitSummary,
		diagnosis: remote.diagnosis?.trim() || fallback.diagnosis,
		medicationChanges: remote.medicationChanges?.trim() || remote.medications?.trim() || fallback.medicationChanges,
		followUpInstructions: remote.followUpInstructions?.trim() || remote.followUp?.trim() || fallback.followUpInstructions,
		medicationGuidance: remote.medicationChanges?.trim() || remote.medications?.trim() || fallback.medicationGuidance,
		warningSigns: remote.warningSigns?.trim() || fallback.warningSigns,
		followUpPlan: remote.followUp?.trim() || remote.followUpInstructions?.trim() || fallback.followUpPlan,
		simpleExplanation: remote.simpleExplanation?.trim() || remote.patientFriendlyExplanation?.trim() || fallback.simpleExplanation,
		caregiverSummary: remote.caregiverSummary?.trim() || remote.caregiverShareSummary?.trim() || fallback.caregiverSummary
	};
}
function buildSpokenVisitSummary(summary) {
	return [
		"Here is your visit summary.",
		summary.visitSummary,
		summary.diagnosis && !summary.diagnosis.startsWith("No diagnosis") ? `Diagnosis discussed: ${summary.diagnosis}` : "",
		summary.medicationChanges && !summary.medicationChanges.startsWith("No clear") ? `Medication guidance: ${summary.medicationChanges}` : "",
		summary.warningSigns && !summary.warningSigns.includes("not been discussed") ? `Warning signs: ${summary.warningSigns}` : "",
		summary.followUpInstructions && !summary.followUpInstructions.startsWith("No specific") ? `Follow up: ${summary.followUpInstructions}` : "Please ask the doctor when to follow up and what warning signs should prompt urgent care.",
		"This is a summary to help you remember the visit. Follow your doctor's instructions."
	].filter(Boolean).join(" ");
}
function DoctorPage() {
	const state = useApp();
	const { profile, meds, doses, symptoms, appointments, addSummary, addVisit, addNote, upsertMed, updatePatientContext, resetCurrentPatientContext } = state;
	const [mounted, setMounted] = (0, import_react.useState)(false);
	const [stage, setStage] = (0, import_react.useState)("idle");
	const [patientSummaryApproved, setPatientSummaryApproved] = (0, import_react.useState)(false);
	const [patientContextDraft, setPatientContextDraft] = (0, import_react.useState)("");
	const [approvedPatientContext, setApprovedPatientContext] = (0, import_react.useState)("");
	const [preVisitSummaryPreparing, setPreVisitSummaryPreparing] = (0, import_react.useState)(false);
	const [doctorVisitConsent, setDoctorVisitConsent] = (0, import_react.useState)("pending");
	const [summarySaved, setSummarySaved] = (0, import_react.useState)(false);
	const [visitMessages, setVisitMessages] = (0, import_react.useState)([]);
	const [wakeStatus, setWakeStatus] = (0, import_react.useState)("MedsBuddy is listening");
	const [simulatedTranscript, setSimulatedTranscript] = (0, import_react.useState)("");
	const [lastProcessedTranscript, setLastProcessedTranscript] = (0, import_react.useState)("");
	const [voiceSupported, setVoiceSupported] = (0, import_react.useState)(false);
	const [voiceListening, setVoiceListening] = (0, import_react.useState)(false);
	const [voiceSpeaking, setVoiceSpeaking] = (0, import_react.useState)(false);
	const [medsBuddyTalking, setMedsBuddyTalking] = (0, import_react.useState)(true);
	const [summarySpeaking, setSummarySpeaking] = (0, import_react.useState)(false);
	const [advocateActive, setAdvocateActive] = (0, import_react.useState)(false);
	const [visitSummary, setVisitSummary] = (0, import_react.useState)(() => buildSummaryFromTranscript([], ""));
	const recognitionRef = (0, import_react.useRef)(null);
	const mediaRecorderRef = (0, import_react.useRef)(null);
	const mediaStreamRef = (0, import_react.useRef)(null);
	const elevenLabsSttUnavailableRef = (0, import_react.useRef)(false);
	const sttRequestChainRef = (0, import_react.useRef)(Promise.resolve());
	const visitMessagesRef = (0, import_react.useRef)([]);
	const voiceSpeakingRef = (0, import_react.useRef)(false);
	const medsBuddyTalkingRef = (0, import_react.useRef)(true);
	const advocateActiveRef = (0, import_react.useRef)(false);
	const spokenMedsBuddyKeysRef = (0, import_react.useRef)(/* @__PURE__ */ new Set());
	const handledCarePlanKeysRef = (0, import_react.useRef)(/* @__PURE__ */ new Set());
	const savedMedicationInstructionKeysRef = (0, import_react.useRef)(/* @__PURE__ */ new Set());
	const semanticRequestIdRef = (0, import_react.useRef)(0);
	const humanizedSummaryCacheRef = (0, import_react.useRef)(/* @__PURE__ */ new Map());
	const humanizeInFlightKeyRef = (0, import_react.useRef)(null);
	const transcriptBufferRef = (0, import_react.useRef)("");
	const transcriptBufferTimerRef = (0, import_react.useRef)(null);
	const transcriptBufferStartedAtRef = (0, import_react.useRef)(null);
	const structuredPatientContextForQwen = (0, import_react.useMemo)(() => buildPatientSummary(state), [state]);
	const readablePreVisitFallback = (0, import_react.useMemo)(() => buildReadablePreVisitFallback(state), [state]);
	const patientId = (0, import_react.useMemo)(() => getPatientId(state), [state]);
	const patientContextForVisit = approvedPatientContext || patientContextDraft || "Preparing your pre-visit summary...";
	(0, import_react.useEffect)(() => {
		setMounted(true);
	}, []);
	(0, import_react.useEffect)(() => {
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
			humanizePreVisitSummary({
				patientId,
				rawPatientContext: structuredPatientContextForQwen
			}).then((result) => {
				if (!active || humanizeInFlightKeyRef.current !== summaryKey) return;
				const summary = result.summary || readablePreVisitFallback;
				humanizedSummaryCacheRef.current.set(summaryKey, summary);
				setPatientContextDraft(summary);
			}).catch(() => {
				if (!active || humanizeInFlightKeyRef.current !== summaryKey) return;
				setPatientContextDraft(readablePreVisitFallback);
			}).finally(() => {
				if (humanizeInFlightKeyRef.current === summaryKey) humanizeInFlightKeyRef.current = null;
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
		patientSummaryApproved
	]);
	(0, import_react.useEffect)(() => {
		return () => stopSpeaking();
	}, []);
	(0, import_react.useEffect)(() => {
		visitMessagesRef.current = visitMessages;
	}, [visitMessages]);
	(0, import_react.useEffect)(() => {
		advocateActiveRef.current = advocateActive;
	}, [advocateActive]);
	(0, import_react.useEffect)(() => {
		medsBuddyTalkingRef.current = medsBuddyTalking;
		if (!medsBuddyTalking) {
			stopSpeaking();
			voiceSpeakingRef.current = false;
			setVoiceSpeaking(false);
		}
	}, [medsBuddyTalking]);
	adherence(doses, 7);
	const last7 = Date.now() - 7 * 864e5;
	symptoms.filter((s) => s.at >= last7);
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
		handledCarePlanKeysRef.current.clear();
		savedMedicationInstructionKeysRef.current.clear();
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
	(0, import_react.useEffect)(() => {
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
			if (stage === "active" && doctorVisitConsent === "granted") setWakeStatus("MedsBuddy is listening");
		};
		speak(textToSpeak, () => {
			returnToListening();
		}).catch((error) => {
			console.warn("[MedsBuddy voice] Could not speak visit message.", error);
			setWakeStatus("MedsBuddy could not play audio. Check browser audio permissions.");
			returnToListening();
		});
	}, [
		doctorVisitConsent,
		medsBuddyTalking,
		stage,
		visitMessages
	]);
	const handleDoctorConsents = () => {
		const openingMessages = buildVisitOpeningMessages();
		setDoctorVisitConsent("granted");
		setWakeStatus("MedsBuddy is listening");
		setAdvocateActive(true);
		advocateActiveRef.current = true;
		setVisitMessages((messages) => dedupeConversation([...messages, ...openingMessages]));
		setVisitSummary(buildSummaryFromTranscript(openingMessages, patientContextForVisit));
	};
	const handleDoctorDeclines = () => {
		setDoctorVisitConsent("declined");
		setWakeStatus("Doctor did not consent");
		setVisitMessages((messages) => dedupeConversation([...messages, {
			speaker: "MedsBuddy",
			text: "Understood. MedsBuddy will not participate in this visit or record the conversation."
		}]));
	};
	const addMedsBuddyVisitMessage = (0, import_react.useCallback)((text, status) => {
		if (!medsBuddyTalkingRef.current) {
			setWakeStatus("MedsBuddy Talking is OFF. Still listening and capturing the visit.");
			return false;
		}
		setWakeStatus(status);
		setVisitMessages((messages) => {
			const withResponse = dedupeConversation([...messages, {
				speaker: "MedsBuddy",
				text
			}]);
			visitMessagesRef.current = withResponse;
			return withResponse;
		});
		return true;
	}, []);
	const addTranscriptMessages = (0, import_react.useCallback)((transcript, speaker) => {
		if (!transcript.trim() || isLowValueTranscript(transcript)) return false;
		const cleanedTranscript = cleanSpeechToTextTranscript(transcript);
		const currentMessages = visitMessagesRef.current;
		const parsedMessages = mergeAdjacentConversationMessages(parseTranscriptMessages(cleanedTranscript, speaker, currentMessages).map((message) => ({
			...message,
			text: cleanTranscriptInput(message.text)
		})).filter((message) => !isLowValueTranscript(message.text)));
		if (!parsedMessages.length) return false;
		for (const message of parsedMessages) console.info("[MedsBuddy speaker detection]", {
			rawTranscript: transcript,
			cleanedTranscript,
			messageText: message.text,
			detectedSpeaker: message.speaker,
			confidence: message.speakerConfidence ?? null,
			source: message.speakerSource ?? "local_rules",
			reason: message.speakerReason ?? "No speaker reason recorded."
		});
		const nextMessages = dedupeConversation(mergeAdjacentConversationMessages([...currentMessages, ...parsedMessages]));
		visitMessagesRef.current = nextMessages;
		setVisitMessages(nextMessages);
		setWakeStatus("MedsBuddy is understanding the conversation");
		const latestMessage = nextMessages[nextMessages.length - 1];
		const latestText = latestMessage?.text ?? parsedMessages.map((message) => message.text).join(" ");
		const latestTurnText = latestText;
		const latestSpeaker = latestMessage?.speaker;
		const latestSpeakerConfidence = latestMessage?.speakerConfidence ?? .75;
		const requestId = semanticRequestIdRef.current + 1;
		semanticRequestIdRef.current = requestId;
		const currentTranscript = conversationToTranscript(nextMessages);
		const currentVisitStage = detectVisitStage(currentTranscript);
		console.info("[MedsBuddy visit stage]", {
			stage: currentVisitStage,
			latestSpeaker,
			latestText
		});
		const hasStopTalkingCommand = parsedMessages.some((message) => isStopTalkingCommand(message.text));
		const hasStartTalkingCommand = parsedMessages.some((message) => isStartTalkingCommand(message.text));
		if (hasStopTalkingCommand) {
			setMedsBuddyTalking(false);
			medsBuddyTalkingRef.current = false;
			setWakeStatus("MedsBuddy Talking is OFF. Still listening and capturing the visit.");
			return true;
		}
		if (hasStartTalkingCommand) {
			setMedsBuddyTalking(true);
			medsBuddyTalkingRef.current = true;
			addMedsBuddyVisitMessage("MedsBuddy Talking is on. I’ll speak when it helps the visit.", "MedsBuddy Talking is ON");
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
			addMedsBuddyVisitMessage("MedsBuddy Talking is on. I’ll speak when it helps the visit.", "MedsBuddy Talking is ON");
			return true;
		}
		const fastIntent = "none";
		if (!medsBuddyTalkingRef.current) {
			setWakeStatus("MedsBuddy Talking is OFF. Still listening and capturing the visit.");
			return true;
		}
		if (!shouldUseLlmVisitReasoning({
			latestText,
			latestSpeaker,
			latestSpeakerConfidence,
			fastIntent
		})) {
			setWakeStatus(advocateActiveRef.current ? "MedsBuddy is ready for follow-up questions" : "MedsBuddy is listening");
			return true;
		}
		(async () => {
			const latestTranscriptForQwen = latestSpeaker === "Unknown" ? latestText : `${latestSpeaker}: ${latestText}`;
			const semanticDecision = await detectSemanticIntentWithLLM({
				latestTranscript: latestTranscriptForQwen,
				currentTranscript,
				patientContext: patientContextForVisit,
				state
			});
			if (requestId !== semanticRequestIdRef.current) return;
			if (semanticDecision) console.info("[MedsBuddy LLM speaker/intent classification]", {
				rawTranscript: transcript,
				cleanedTranscript,
				messageText: latestTurnText,
				qwenTranscript: latestTranscriptForQwen,
				previousSpeaker: latestSpeaker,
				localConfidence: latestSpeakerConfidence,
				llmSpeaker: semanticDecision.speaker,
				intent: semanticDecision.intent,
				shouldRespond: semanticDecision.shouldRespond
			});
			if (!semanticDecision) {
				setWakeStatus("MedsBuddy could not reach AI reasoning. Continuing to capture the visit.");
				return;
			}
			const decision = semanticDecision;
			const asyncVisitStage = detectVisitStage(conversationToTranscript(visitMessagesRef.current));
			const correctedSpeaker = semanticSpeakerToConversationSpeaker(decision.speaker);
			const ignorePatientCorrectionAfterMedsBuddyQuestion = correctedSpeaker === "Patient" && latestSpeaker === "Doctor" && lastMedsBuddyQuestionWasForDoctor(visitMessagesRef.current) && looksLikeDoctorAnswerToMedsBuddy(latestTurnText);
			const ignoreDoctorCorrectionAfterMedsBuddyPatientQuestion = correctedSpeaker === "Doctor" && latestSpeaker === "Patient" && lastMedsBuddyQuestionWasForPatient(visitMessagesRef.current) && looksLikePatientFirstPersonStatement(latestTurnText);
			if (correctedSpeaker && correctedSpeaker !== "MedsBuddy" && latestSpeaker && correctedSpeaker !== latestSpeaker && !ignorePatientCorrectionAfterMedsBuddyQuestion && !ignoreDoctorCorrectionAfterMedsBuddyPatientQuestion) setVisitMessages((messages) => {
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
				corrected[lastIndex] = {
					...corrected[lastIndex],
					speaker: correctedSpeaker
				};
				visitMessagesRef.current = corrected;
				return corrected;
			});
			if (decision.intent === "direct_call") {
				setAdvocateActive(true);
				advocateActiveRef.current = true;
			}
			const stageAllowsResponse = decision.intent === "care_plan_instruction" || canMedsBuddyRespondInStage(asyncVisitStage, decision.intent);
			const carePlanResponse = stageAllowsResponse && decision.intent === "care_plan_instruction" && !decision.response ? await buildCarePlanResponseWithQwen({
				text: latestText,
				messages: visitMessagesRef.current,
				state,
				patientContext: patientContextForVisit,
				handledCarePlanKeys: handledCarePlanKeysRef.current
			}) : null;
			if (decision.intent === "care_plan_instruction") {
				const prescribedMedication = extractPrescribedMedicationFromCarePlan(latestText, visitMessagesRef.current);
				if (prescribedMedication) {
					const medicationKey = normalizeTranscriptText([
						prescribedMedication.name,
						prescribedMedication.dosage,
						prescribedMedication.frequency
					].join(" "));
					if (!savedMedicationInstructionKeysRef.current.has(medicationKey)) {
						savedMedicationInstructionKeysRef.current.add(medicationKey);
						const savedMedication = upsertMed(prescribedMedication);
						updatePatientContext({ medications: [`${savedMedication.name} ${savedMedication.dosage} ${savedMedication.frequency}`.replace(/\s+/g, " ").trim()] });
						toast.success(`Medication updated: ${savedMedication.name}`);
					}
				}
			}
			const intentResponse = decision.shouldRespond && stageAllowsResponse && (decision.response || carePlanResponse);
			if (intentResponse) addMedsBuddyVisitMessage(intentResponse, decision.intent === "direct_call" ? "MedsBuddy was called" : "MedsBuddy is answering the doctor");
			else setWakeStatus(advocateActiveRef.current ? "MedsBuddy is ready for follow-up questions" : "MedsBuddy is listening");
		})();
		return true;
	}, [
		addMedsBuddyVisitMessage,
		patientContextForVisit,
		state,
		updatePatientContext,
		upsertMed
	]);
	const handleSimulatedTranscript = () => {
		if (!addTranscriptMessages(getTranscriptDelta(simulatedTranscript, lastProcessedTranscript), "Auto")) return;
		setLastProcessedTranscript(simulatedTranscript.trim());
		setSimulatedTranscript("");
	};
	const flushBufferedTranscript = (0, import_react.useCallback)(() => {
		if (transcriptBufferTimerRef.current) {
			clearTimeout(transcriptBufferTimerRef.current);
			transcriptBufferTimerRef.current = null;
		}
		const mergedTranscript = transcriptBufferRef.current.replace(/\s+/g, " ").trim();
		const waitMs = transcriptBufferStartedAtRef.current ? Date.now() - transcriptBufferStartedAtRef.current : 0;
		transcriptBufferRef.current = "";
		transcriptBufferStartedAtRef.current = null;
		if (!mergedTranscript) return false;
		console.info("[MedsBuddy transcript pipeline]", {
			finalMergedTranscript: mergedTranscript,
			timeWaitingBeforeReasoningMs: waitMs
		});
		return addTranscriptMessages(mergedTranscript, "Auto");
	}, [addTranscriptMessages]);
	const queueTranscriptChunk = (0, import_react.useCallback)((transcript) => {
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
		if (!transcriptBufferRef.current) transcriptBufferStartedAtRef.current = Date.now();
		transcriptBufferRef.current = [transcriptBufferRef.current, cleanedChunk].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
		console.info("[MedsBuddy transcript pipeline]", {
			rawSttTranscript: transcript,
			bufferedTranscript: transcriptBufferRef.current,
			timeWaitingBeforeReasoningMs: transcriptBufferStartedAtRef.current ? Date.now() - transcriptBufferStartedAtRef.current : 0
		});
		setWakeStatus("MedsBuddy is listening and combining the full thought");
		if (transcriptBufferTimerRef.current) clearTimeout(transcriptBufferTimerRef.current);
		transcriptBufferTimerRef.current = setTimeout(() => {
			flushBufferedTranscript();
		}, TRANSCRIPT_MERGE_DELAY_MS);
	}, [flushBufferedTranscript]);
	(0, import_react.useEffect)(() => {
		if (!mounted) return;
		const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
		const canRecordForElevenLabs = Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== "undefined" && !elevenLabsSttUnavailableRef.current;
		setVoiceSupported(canRecordForElevenLabs || Boolean(Recognition));
		const stopElevenLabsRecorder = () => {
			const recorder = mediaRecorderRef.current;
			if (recorder && recorder.state !== "inactive") recorder.stop();
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
				const finalText = [];
				for (let index = event.resultIndex; index < event.results.length; index += 1) {
					const result = event.results[index];
					if (result?.isFinal) finalText.push(result[0].transcript);
				}
				const transcript = finalText.join(" ").trim();
				if (transcript) queueTranscriptChunk(transcript);
			};
			recognition.onerror = (event) => {
				setVoiceListening(false);
				if (event.error === "not-allowed" || event.error === "service-not-allowed") {
					setWakeStatus("Microphone permission is blocked");
					toast.error("Microphone permission is blocked. Use the transcript box instead.");
				}
			};
			recognition.onend = () => {
				if (stage === "active" && doctorVisitConsent === "granted" && !voiceSpeakingRef.current) try {
					recognition.start();
					setVoiceListening(true);
				} catch {
					setVoiceListening(false);
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
			if (!startBrowserRecognition()) setWakeStatus("Microphone is unavailable. Use the transcript box instead.");
			return () => {
				stopBrowserRecognition();
			};
		}
		navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
			if (cancelled) {
				stream.getTracks().forEach((track) => track.stop());
				return;
			}
			const mimeType = getSupportedRecordingMimeType();
			const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : void 0);
			let recordingParts = [];
			let stopTimer = null;
			mediaStreamRef.current = stream;
			mediaRecorderRef.current = recorder;
			recorder.ondataavailable = (event) => {
				if (cancelled || !event.data || event.data.size === 0) return;
				recordingParts.push(event.data);
			};
			const startSegment = () => {
				if (cancelled || recorder.state !== "inactive") return;
				recordingParts = [];
				try {
					recorder.start();
					stopTimer = setTimeout(() => {
						if (!cancelled && recorder.state === "recording") recorder.stop();
					}, 4500);
				} catch (error) {
					console.warn("[MedsBuddy STT] Could not start recorder.", error);
					elevenLabsSttUnavailableRef.current = true;
					setWakeStatus("ElevenLabs STT recorder failed. Falling back to browser speech.");
					stopElevenLabsRecorder();
					startBrowserRecognition();
				}
			};
			recorder.onstop = () => {
				if (stopTimer) {
					clearTimeout(stopTimer);
					stopTimer = null;
				}
				const audioSize = recordingParts.reduce((total, part) => total + part.size, 0);
				if (cancelled) return;
				if (audioSize < 1200) {
					startSegment();
					return;
				}
				const audioChunk = new Blob(recordingParts, { type: recorder.mimeType || mimeType || "audio/webm" });
				recordingParts = [];
				sttRequestChainRef.current = sttRequestChainRef.current.catch(() => void 0).then(async () => {
					try {
						const transcript = (await transcribeAudio(audioChunk)).text?.trim();
						if (transcript && !cancelled) queueTranscriptChunk(transcript);
					} catch (error) {
						console.warn("[MedsBuddy STT] ElevenLabs STT failed. Falling back.", error);
						cancelled = true;
						elevenLabsSttUnavailableRef.current = true;
						setWakeStatus("ElevenLabs STT unavailable. Falling back to browser speech.");
						stopElevenLabsRecorder();
						startBrowserRecognition();
					}
				});
				startSegment();
			};
			recorder.onerror = () => {
				cancelled = true;
				if (stopTimer) {
					clearTimeout(stopTimer);
					stopTimer = null;
				}
				elevenLabsSttUnavailableRef.current = true;
				setWakeStatus("ElevenLabs STT recorder failed. Falling back to browser speech.");
				stopElevenLabsRecorder();
				startBrowserRecognition();
			};
			startSegment();
			setVoiceListening(true);
			setWakeStatus("ElevenLabs STT is listening");
		}).catch(() => {
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
	}, [
		doctorVisitConsent,
		mounted,
		queueTranscriptChunk,
		stage
	]);
	const endVisit = async () => {
		flushBufferedTranscript();
		const cleanedMessages = cleanVisitTranscript(visitMessagesRef.current);
		const closingMessage = "Thank you, Doctor. I've updated the patient's care plan.";
		const summaryMessages = dedupeConversation([...cleanedMessages, {
			speaker: "MedsBuddy",
			text: closingMessage
		}]);
		const localSummary = buildSummaryFromTranscript(cleanedMessages, patientContextForVisit);
		const transcript = conversationToTranscript(summaryMessages);
		setVisitSummary(localSummary);
		setStage("summary");
		toast.success("Care plan updated. AI Patient Advocate summary ready");
		setSummarySpeaking(true);
		speak(closingMessage, () => setSummarySpeaking(false)).catch(() => {
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
				notes: transcript
			});
			addNote(`AI Patient Advocate follow-up: ${localSummary.followUpInstructions}`);
			if (localSummary.medicationGuidance) addNote(`Medication schedule: ${localSummary.medicationGuidance}`);
			if (localSummary.warningSigns && !localSummary.warningSigns.includes("not been discussed")) addNote(`Warning signs: ${localSummary.warningSigns}`);
			saveVisitMemory({
				patientId: getPatientId(state),
				visitSummary: localSummary.visitSummary,
				diagnosis: localSummary.diagnosis,
				medications: localSummary.medicationChanges,
				allergies: state.profile.allergies || "No allergies recorded.",
				followUp: localSummary.followUpInstructions,
				warningSigns: localSummary.warningSigns,
				approvedByPatient: true
			}).catch(() => {
				toast.error("Could not save visit memory to Alibaba ECS.");
			});
			resetCurrentPatientContext();
			setSummarySaved(true);
		}
		generateVisitSummary({
			patientId: getPatientId(state),
			patientContext: patientContextForVisit,
			medicationHistory: buildMedicationHistory(state),
			transcript
		}).then((remoteSummary) => {
			setVisitSummary(mergeRemoteSummary(localSummary, remoteSummary.summary));
		}).catch(() => {
			toast.info("Alibaba ECS summary unavailable. Showing local visit summary.");
		});
	};
	const speakVisitSummary = () => {
		stopSpeaking();
		const spokenSummary = buildSpokenVisitSummary(visitSummary);
		setSummarySpeaking(true);
		speak(spokenSummary, () => setSummarySpeaking(false)).catch(() => {
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
	if (!mounted) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "rounded-[28px] gradient-hero text-primary-foreground p-6 shadow-elegant mb-5 min-h-[180px]" });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
		initial: {
			opacity: 0,
			y: 10
		},
		animate: {
			opacity: 1,
			y: 0
		},
		className: "rounded-[28px] gradient-hero text-primary-foreground p-6 shadow-elegant mb-5 relative overflow-hidden",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute -top-16 -right-16 size-48 rounded-full bg-white/10 blur-3xl" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "size-12 rounded-2xl bg-white/20 backdrop-blur grid place-items-center",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stethoscope, { className: "size-6" })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-[12px] opacity-80 font-medium",
					children: "AI Patient Advocate"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-primary-foreground text-2xl",
					children: "AI Patient Advocate"
				})] })]
			}),
			stage !== "idle" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm opacity-90 mt-3",
				children: "MedsBuddy listens after consent, speaks directly to the doctor on behalf of the patient when clinically useful, lets the doctor respond, and summarizes the whole visit."
			})
		]
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AIAdvocateDemo, {
		stage,
		patientSummary: patientContextForVisit,
		patientContextDraft,
		patientSummaryApproved,
		preVisitSummaryPreparing,
		onPatientContextDraftChange: (value) => {
			setPatientContextDraft(value);
			setPatientSummaryApproved(false);
			setApprovedPatientContext("");
		},
		onApprovePatientContext: approvePatientContext,
		onEditPatientContext: editPatientContext,
		messages: visitMessages,
		wakeStatus,
		simulatedTranscript,
		onSimulatedTranscriptChange: setSimulatedTranscript,
		onSubmitTranscript: handleSimulatedTranscript,
		onStartVisit: startVisit,
		onEndVisit: endVisit,
		doctorVisitConsent,
		onDoctorConsents: handleDoctorConsents,
		onDoctorDeclines: handleDoctorDeclines,
		voiceSupported,
		voiceListening,
		voiceSpeaking,
		medsBuddyTalking,
		onMedsBuddyTalkingChange: setMedsBuddyTalking
	}), stage === "summary" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VisitSummary, {
		summary: visitSummary,
		onSpeakSummary: speakVisitSummary,
		summarySpeaking
	})] })] });
}
function AIAdvocateDemo({ stage, patientSummary, patientContextDraft, patientSummaryApproved, preVisitSummaryPreparing, onPatientContextDraftChange, onApprovePatientContext, onEditPatientContext, messages, wakeStatus, simulatedTranscript, onSimulatedTranscriptChange, onSubmitTranscript, onStartVisit, onEndVisit, doctorVisitConsent, onDoctorConsents, onDoctorDeclines, voiceSupported, voiceListening, voiceSpeaking, medsBuddyTalking, onMedsBuddyTalkingChange }) {
	const active = stage === "active";
	const visitCanListen = doctorVisitConsent === "granted";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
		initial: {
			opacity: 0,
			y: 8
		},
		animate: {
			opacity: 1,
			y: 0
		},
		className: "rounded-2xl bg-card border shadow-card p-4 mb-3",
		children: [
			stage === "idle" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-xl border bg-background p-3 mb-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-[12px] font-semibold text-primary mb-1",
						children: "Review Before Your Appointment"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						value: patientContextDraft,
						onChange: (event) => onPatientContextDraftChange(event.target.value),
						className: "min-h-[260px] w-full resize-none rounded-xl border bg-card px-3 py-3 text-[13px] leading-relaxed text-foreground",
						"aria-label": "Pre-visit summary for doctor visit"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-3 grid gap-2 sm:grid-cols-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: onApprovePatientContext,
							disabled: !patientContextDraft.trim(),
							className: "rounded-xl bg-primary text-primary-foreground px-4 py-3 text-sm font-semibold disabled:opacity-50",
							children: patientSummaryApproved ? "Approved" : "Approve Summary"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: onEditPatientContext,
							className: "rounded-xl bg-secondary text-secondary-foreground px-4 py-3 text-sm font-semibold",
							children: "Edit"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-[11px] text-muted-foreground",
						children: preVisitSummaryPreparing ? "MedsBuddy is refining this summary in the background. You can approve and start now." : "Patient reviews and approves this summary before MedsBuddy uses it in the visit."
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				onClick: onStartVisit,
				disabled: !patientSummaryApproved,
				className: "w-full rounded-2xl gradient-hero text-primary-foreground py-5 px-4 text-lg font-semibold inline-flex items-center justify-center gap-3 shadow-elegant disabled:opacity-50",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "size-6" }), " Start Live Visit"]
			})] }),
			active && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-2xl bg-primary/10 border border-primary/25 p-4 mb-3 flex items-center gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "relative grid place-items-center size-10 rounded-full bg-primary/20",
						children: [visitCanListen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute inset-0 rounded-full bg-primary/30 animate-ping" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mic, { className: "size-5 text-primary relative" })]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "font-semibold text-primary",
						children: wakeStatus
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-[12px] text-muted-foreground",
						children: !visitCanListen ? voiceSpeaking ? "MedsBuddy is speaking out loud." : doctorVisitConsent === "declined" ? "MedsBuddy is not participating because the doctor did not consent." : "MedsBuddy is waiting for the doctor's consent before listening." : voiceSpeaking ? "MedsBuddy is speaking out loud." : voiceSupported ? voiceListening ? "Microphone is listening. MedsBuddy will speak to the doctor for the patient when needed." : "Microphone is not active yet. Use the transcript box if permission is blocked." : "This browser does not support speech recognition. Use the transcript box below."
					})] })]
				}),
				visitCanListen && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mb-3 grid gap-2 sm:grid-cols-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => onMedsBuddyTalkingChange(true),
						className: `rounded-xl px-4 py-3 text-sm font-semibold ${medsBuddyTalking ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`,
						children: "MedsBuddy Talking: ON"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => onMedsBuddyTalkingChange(false),
						className: `rounded-xl px-4 py-3 text-sm font-semibold ${!medsBuddyTalking ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`,
						children: "MedsBuddy Talking: OFF"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-xl border bg-background p-3 mb-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-[12px] font-semibold text-primary mb-1",
						children: "Pre-Visit Summary"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "whitespace-pre-line text-[13px] text-muted-foreground leading-relaxed",
						children: patientSummary
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "space-y-2",
					children: messages.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "rounded-xl border border-dashed bg-background p-4 text-sm text-muted-foreground",
						children: "Start speaking. MedsBuddy will label the speaker automatically."
					}) : messages.map((row, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ConversationRow, {
						speaker: row.speaker,
						text: row.text
					}, `${row.speaker}-${index}`))
				}),
				doctorVisitConsent === "pending" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-4 grid gap-2 sm:grid-cols-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: onDoctorConsents,
						className: "rounded-2xl bg-primary text-primary-foreground py-4 px-4 text-sm font-semibold",
						children: "Doctor consents"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: onDoctorDeclines,
						className: "rounded-2xl bg-secondary text-secondary-foreground py-4 px-4 text-sm font-semibold",
						children: "Doctor does not consent"
					})]
				}),
				visitCanListen && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-4 rounded-2xl border bg-background p-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
							htmlFor: "wake-transcript",
							className: "text-[12px] font-semibold text-primary",
							children: "Simulate live transcript"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-2 flex flex-col gap-2 sm:flex-row",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								id: "wake-transcript",
								value: simulatedTranscript,
								onChange: (e) => onSimulatedTranscriptChange(e.target.value),
								onKeyDown: (e) => {
									if (e.key === "Enter") onSubmitTranscript();
								},
								placeholder: "Try: \"Doctor, can you summarize the approved patient context?\"",
								className: "min-w-0 flex-1 rounded-xl border bg-background px-3 py-2 text-sm"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: onSubmitTranscript,
								disabled: !simulatedTranscript.trim(),
								className: "rounded-xl bg-secondary text-secondary-foreground px-4 py-2 text-sm font-semibold disabled:opacity-50",
								children: "Add to visit"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-[11px] text-muted-foreground",
							children: "MedsBuddy listens for clinical context and speaks to the doctor on the patient's behalf when an important clarification is missing."
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: onEndVisit,
					className: "mt-4 w-full rounded-2xl bg-primary text-primary-foreground py-4 text-lg font-semibold inline-flex items-center justify-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ClipboardList, { className: "size-5" }), " End Visit"]
				})
			] }),
			stage === "summary" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-2xl bg-success/10 border border-success/30 p-4 flex items-start gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "size-10 rounded-xl bg-success/20 text-success grid place-items-center shrink-0",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "size-5" })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "font-semibold text-success",
					children: "AI Patient Advocate visit completed"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-[13px] text-muted-foreground mt-1",
					children: "The structured visit summary is ready below and saved to patient history."
				})] })]
			})
		]
	});
}
function ConversationRow({ speaker, text }) {
	const isAdvocate = speaker === "MedsBuddy";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `rounded-xl border p-3 ${isAdvocate ? "bg-primary/5 border-primary/20" : "bg-background"}`,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: `text-[12px] font-semibold ${isAdvocate ? "text-primary" : "text-muted-foreground"}`,
			children: speaker
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "text-[14px] leading-relaxed mt-1",
			children: text
		})]
	});
}
function VisitSummary({ summary, onSpeakSummary, summarySpeaking }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
		icon: ClipboardList,
		title: "Visit Summary",
		tint: "success",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "space-y-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: onSpeakSummary,
					className: "w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-semibold inline-flex items-center justify-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Volume2, { className: "size-4" }), summarySpeaking ? "Speaking visit summary..." : "Speak Brief Summary"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SummaryBlock, {
					title: "Reason for Visit",
					body: summary.visitSummary
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SummaryBlock, {
					title: "Patient Symptoms",
					body: summary.patientConcerns
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SummaryBlock, {
					title: "Doctor Assessment",
					body: summary.doctorAssessment
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SummaryBlock, {
					title: "Diagnosis",
					body: summary.diagnosis
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SummaryBlock, {
					title: "Medication Instructions",
					body: summary.medicationGuidance
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SummaryBlock, {
					title: "Follow-up Plan",
					body: summary.followUpPlan
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SummaryBlock, {
					title: "Warning Signs",
					body: summary.warningSigns
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SummaryBlock, {
					title: "Questions Asked by MedsBuddy",
					body: summary.medsBuddyQuestions
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SummaryBlock, {
					title: "Doctor Responses (Summarized)",
					body: summary.doctorAnswers
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SummaryBlock, {
					title: "Plain-language Explanation",
					body: summary.simpleExplanation
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SummaryBlock, {
					title: "Caregiver Summary",
					body: summary.caregiverSummary
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SummaryBlock, {
					title: "Next Appointment Checklist",
					body: summary.nextAppointmentQuestions
				})
			]
		})
	});
}
function SummaryBlock({ title, body }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-xl border bg-background p-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "text-[12px] font-semibold text-primary mb-1",
			children: title
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "text-[14px] leading-relaxed",
			children: body
		})]
	});
}
function Section({ icon: Icon, title, tint, children }) {
	const tintClass = {
		primary: "bg-primary/10 text-primary",
		success: "bg-success/15 text-success",
		warning: "bg-warning/15 text-warning"
	}[tint];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
		initial: {
			opacity: 0,
			y: 8
		},
		animate: {
			opacity: 1,
			y: 0
		},
		className: "rounded-2xl bg-card border shadow-card p-4 mb-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-2 mb-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: `size-8 rounded-lg grid place-items-center ${tintClass}`,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "size-4" })
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "text-[15px] font-semibold",
				children: title
			})]
		}), children]
	});
}
var SplitComponent = DoctorPage;
//#endregion
export { SplitComponent as component };
