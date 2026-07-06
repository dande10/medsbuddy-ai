import { n as useApp } from "./store-xEuxQ6YF.js";
import { useEffect, useState } from "react";
//#region src/lib/voice.ts
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
		const res = await fetch("/api/tts", {
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
	} catch {}
	if (typeof window !== "undefined" && "speechSynthesis" in window) {
		const u = new SpeechSynthesisUtterance(text);
		u.rate = 1;
		u.pitch = 1;
		u.onend = () => onEnd?.();
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
//#region src/lib/connectivity.ts
/**
* Single source of truth for "are we online?".
* Combines the browser's navigator.onLine signal with the in-app
* "Simulate Offline Mode" toggle for demos.
*/
function useConnectivity() {
	const simulateOffline = useApp((s) => s.simulateOffline);
	const [networkOnline, setNetworkOnline] = useState(true);
	const [hydrated, setHydrated] = useState(false);
	useEffect(() => {
		setHydrated(true);
		const update = () => setNetworkOnline(navigator.onLine);
		update();
		window.addEventListener("online", update);
		window.addEventListener("offline", update);
		return () => {
			window.removeEventListener("online", update);
			window.removeEventListener("offline", update);
		};
	}, []);
	const online = hydrated ? networkOnline && !simulateOffline : true;
	return {
		online,
		offline: !online,
		simulated: simulateOffline,
		networkOnline,
		hydrated
	};
}
//#endregion
export { stopSpeaking as i, getRecognition as n, speak as r, useConnectivity as t };
