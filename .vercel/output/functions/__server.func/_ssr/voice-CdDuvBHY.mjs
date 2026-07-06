//#region node_modules/.nitro/vite/services/ssr/assets/voice-CdDuvBHY.js
function getMedsBuddyApiBaseUrl() {
	return "http://47.88.54.108".trim().replace(/\/$/, "");
}
function medsBuddyApiUrl(path) {
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;
	return `${getMedsBuddyApiBaseUrl()}${normalizedPath}`;
}
async function postJson(path, body) {
	const url = medsBuddyApiUrl(path);
	const controller = new AbortController();
	const timeout = globalThis.setTimeout(() => controller.abort(), 15e3);
	let response;
	try {
		response = await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
			signal: controller.signal
		});
	} finally {
		globalThis.clearTimeout(timeout);
	}
	if (!response.ok) {
		const error = await response.text().catch(() => "");
		if (/^\s*<!doctype html/i.test(error) || /<html/i.test(error)) throw new Error(`MedsBuddy backend endpoint was not found at ${url}. Check VITE_MEDSBUDDY_API_BASE_URL and restart the app.`);
		throw new Error(error || `MedsBuddy API failed: ${response.status}`);
	}
	return await response.json();
}
async function transcribeAudio(audio) {
	const url = medsBuddyApiUrl("/api/stt");
	const formData = new FormData();
	const extension = audio.type.includes("mp4") ? "m4a" : "webm";
	formData.append("audio", audio, `doctor-visit.${extension}`);
	const controller = new AbortController();
	const timeout = globalThis.setTimeout(() => controller.abort(), 45e3);
	let response;
	try {
		response = await fetch(url, {
			method: "POST",
			body: formData,
			signal: controller.signal
		});
	} finally {
		globalThis.clearTimeout(timeout);
	}
	if (!response.ok) {
		const error = await response.text().catch(() => "");
		throw new Error(error || `ElevenLabs STT failed: ${response.status}`);
	}
	return await response.json();
}
function analyzeCarePlanGaps(payload) {
	return postJson("/api/medsbuddy/care-plan-gap", payload);
}
function generateVisitSummary(payload) {
	return postJson("/api/medsbuddy/generate-summary", payload);
}
function humanizePreVisitSummary(payload) {
	return postJson("/api/medsbuddy/humanize-previsit-summary", payload);
}
function extractPatientContext(payload) {
	return postJson("/api/medsbuddy/extract-patient-context", payload);
}
function saveVisitMemory(payload) {
	return postJson("/api/medsbuddy/save-memory", payload);
}
function routeMedsBuddyAgent(payload) {
	return postJson("/api/medsbuddy/agent-router", payload);
}
var currentAudio = null;
var currentUrl = null;
function stopSpeaking() {
	if (currentAudio) {
		try {
			currentAudio.pause();
			currentAudio.src = "";
		} catch {}
		currentAudio = null;
	}
	if (currentUrl) {
		URL.revokeObjectURL(currentUrl);
		currentUrl = null;
	}
	if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}
/** Speak via ElevenLabs; fallback to browser SpeechSynthesis if offline/fails. */
async function speak(text, onEnd) {
	stopSpeaking();
	if (!text.trim()) return;
	if (typeof navigator !== "undefined" && navigator.onLine) try {
		const res = await fetch(medsBuddyApiUrl("/api/tts"), {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ text })
		});
		if (res.ok) {
			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const audio = new Audio(url);
			currentAudio = audio;
			currentUrl = url;
			audio.onended = () => {
				if (currentUrl === url) {
					URL.revokeObjectURL(url);
					currentUrl = null;
					currentAudio = null;
				}
				onEnd?.();
			};
			await audio.play();
			return;
		}
		const errorText = await res.text().catch(() => "");
		console.warn("[MedsBuddy voice] ElevenLabs TTS failed", {
			status: res.status,
			body: errorText
		});
	} catch (error) {
		console.warn("[MedsBuddy voice] ElevenLabs TTS playback failed", error);
	}
	if (typeof window !== "undefined" && "speechSynthesis" in window) {
		const u = new SpeechSynthesisUtterance(text);
		u.rate = 1;
		u.pitch = 1;
		u.onend = () => onEnd?.();
		u.onerror = (event) => {
			console.warn("[MedsBuddy voice] Browser speech synthesis failed", event.error);
			onEnd?.();
		};
		window.speechSynthesis.speak(u);
	} else onEnd?.();
}
function getRecognition() {
	if (typeof window === "undefined") return null;
	const w = window;
	const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
	if (!Ctor) return null;
	const rec = new Ctor();
	rec.lang = "en-US";
	rec.continuous = false;
	rec.interimResults = false;
	return rec;
}
//#endregion
export { humanizePreVisitSummary as a, speak as c, getRecognition as i, stopSpeaking as l, extractPatientContext as n, routeMedsBuddyAgent as o, generateVisitSummary as r, saveVisitMemory as s, analyzeCarePlanGaps as t, transcribeAudio as u };
