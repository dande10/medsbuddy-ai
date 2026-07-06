import { o as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as useApp } from "./store-CNkGaKo_.mjs";
import { c as HeadContent, d as createRouter, f as Outlet, g as Link, h as createRootRouteWithContext, m as createFileRoute, p as lazyRouteComponent, s as Scripts, y as useRouter } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { t as Toaster } from "../_libs/sonner.mjs";
import { t as QueryClient } from "../_libs/tanstack__query-core.mjs";
import { t as QueryClientProvider } from "../_libs/tanstack__react-query.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/router-DoFX-Rbn.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var styles_default = "/assets/styles-C_Nj9qrr.css";
function reportLovableError(error, context = {}) {
	if (typeof window === "undefined") return;
	window.__lovableEvents?.captureException?.(error, {
		source: "react_error_boundary",
		route: window.location.pathname,
		...context
	}, {
		mechanism: "react_error_boundary",
		handled: false,
		severity: "error"
	});
}
var Toaster$1 = ({ ...props }) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster, {
		className: "toaster group",
		toastOptions: { classNames: {
			toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
			description: "group-[.toast]:text-muted-foreground",
			actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
			cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground"
		} },
		...props
	});
};
function NotFoundComponent() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-7xl font-bold text-foreground",
					children: "404"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mt-4 text-xl font-semibold text-foreground",
					children: "Page not found"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "The page you're looking for doesn't exist or has been moved."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-6",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/",
						className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
						children: "Go home"
					})
				})
			]
		})
	});
}
function ErrorComponent({ error, reset }) {
	console.error(error);
	const router = useRouter();
	(0, import_react.useEffect)(() => {
		reportLovableError(error, { boundary: "tanstack_root_error_component" });
	}, [error]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-xl font-semibold tracking-tight text-foreground",
					children: "This page didn't load"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "Something went wrong on our end. You can try refreshing or head back home."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-6 flex flex-wrap justify-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => {
							router.invalidate();
							reset();
						},
						className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
						children: "Try again"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: "/",
						className: "inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent",
						children: "Go home"
					})]
				})
			]
		})
	});
}
var Route$17 = createRootRouteWithContext()({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1"
			},
			{ title: "Lovable App" },
			{
				name: "description",
				content: "Lovable Generated Project"
			},
			{
				name: "author",
				content: "Lovable"
			},
			{
				property: "og:title",
				content: "Lovable App"
			},
			{
				property: "og:description",
				content: "Lovable Generated Project"
			},
			{
				property: "og:type",
				content: "website"
			},
			{
				name: "twitter:card",
				content: "summary"
			},
			{
				name: "twitter:site",
				content: "@Lovable"
			}
		],
		links: [{
			rel: "stylesheet",
			href: styles_default
		}]
	}),
	shellComponent: RootShell,
	component: RootComponent,
	notFoundComponent: NotFoundComponent,
	errorComponent: ErrorComponent
});
function RootShell({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("html", {
		lang: "en",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("head", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeadContent, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("body", { children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scripts, {})] })]
	});
}
function RootComponent() {
	const { queryClient } = Route$17.useRouteContext();
	(0, import_react.useEffect)(() => {
		useApp.persist.rehydrate();
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(QueryClientProvider, {
		client: queryClient,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster$1, {})]
	});
}
var $$splitComponentImporter$12 = () => import("./talk-Cp8gNW49.mjs");
var Route$16 = createFileRoute("/talk")({
	head: () => ({ meta: [{ title: "Talk — MedsBuddy" }, {
		name: "description",
		content: "Speak naturally with your AI patient advocate."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$12, "component")
});
var $$splitComponentImporter$11 = () => import("./symptoms-e_ed7o2z.mjs");
var Route$15 = createFileRoute("/symptoms")({
	head: () => ({ meta: [{ title: "Symptoms — MedsBuddy" }, {
		name: "description",
		content: "Log symptoms for doctor visits and daily tracking."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$11, "component")
});
var $$splitComponentImporter$10 = () => import("./reminders-mAvuVKek.mjs");
var Route$14 = createFileRoute("/reminders")({
	head: () => ({ meta: [{ title: "Medications — MedsBuddy" }, {
		name: "description",
		content: "Track medications, log doses, and watch your adherence."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$10, "component")
});
var $$splitComponentImporter$9 = () => import("./profile-yZUm6UZG.mjs");
var Route$13 = createFileRoute("/profile")({
	head: () => ({ meta: [{ title: "Profile — MedsBuddy" }, {
		name: "description",
		content: "Your medical profile used across MedsBuddy."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$9, "component")
});
var $$splitComponentImporter$8 = () => import("./memory-wdaKQ3vn.mjs");
var Route$12 = createFileRoute("/memory")({
	head: () => ({ meta: [{ title: "Visit memory — MedsBuddy" }, {
		name: "description",
		content: "Saved doctor visit summaries."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$8, "component")
});
var $$splitComponentImporter$7 = () => import("./emergency-DiNurmVG.mjs");
var Route$11 = createFileRoute("/emergency")({
	head: () => ({ meta: [{ title: "SOS — MedsBuddy" }, {
		name: "description",
		content: "Emergency health profile and shareable QR for first responders. Works offline."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$7, "component")
});
var $$splitComponentImporter$6 = () => import("./doctor-BFsiEy58.mjs");
var Route$10 = createFileRoute("/doctor")({
	head: () => ({ meta: [{ title: "Doctor visit — MedsBuddy" }, {
		name: "description",
		content: "Premium clinical briefing for your next doctor visit."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$6, "component")
});
var $$splitComponentImporter$5 = () => import("./caregiver-Kt8I10rA.mjs");
var Route$9 = createFileRoute("/caregiver")({
	head: () => ({ meta: [{ title: "Caregiver — MedsBuddy" }, {
		name: "description",
		content: "Daily summary for family and caregivers."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$5, "component")
});
var $$splitComponentImporter$4 = () => import("./architecture-B2yB2nLi.mjs");
var Route$8 = createFileRoute("/architecture")({
	head: () => ({ meta: [{ title: "MedsBuddy Architecture — Judge View" }, {
		name: "description",
		content: "Judge-facing architecture view for MedsBuddy: Qwen Cloud, Alibaba ECS, ElevenLabs STT, and visit memory."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$4, "component")
});
var $$splitComponentImporter$3 = () => import("./routes-DF7nTJAI.mjs");
var Route$7 = createFileRoute("/")({
	head: () => ({ meta: [
		{ title: "MedsBuddy — Your AI Patient Advocate" },
		{
			name: "description",
			content: "Voice-first AI healthcare companion for medications, symptoms, doctor visits, and emergencies."
		},
		{
			property: "og:title",
			content: "MedsBuddy — Your AI Patient Advocate"
		},
		{
			property: "og:description",
			content: "Premium voice-first AI healthcare advocate that works offline."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$3, "component")
});
var $$splitComponentImporter$2 = () => import("./talk.index-BeMCTjL9.mjs");
var Route$6 = createFileRoute("/talk/")({ component: lazyRouteComponent($$splitComponentImporter$2, "component") });
var $$splitComponentImporter$1 = () => import("./doctor.index-DAVc1MLR.mjs");
var Route$5 = createFileRoute("/doctor/")({
	head: () => ({ meta: [{ title: "Doctor visit — MedsBuddy" }, {
		name: "description",
		content: "Premium clinical briefing for your next doctor visit."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
var $$splitComponentImporter = () => import("./talk._threadId-CtRQST8F.mjs");
var Route$4 = createFileRoute("/talk/$threadId")({
	head: () => ({ meta: [{ title: "Talk — MedsBuddy" }, {
		name: "description",
		content: "Speak naturally with your AI patient advocate."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
var Route$3 = createFileRoute("/api/tts")({ server: { handlers: { POST: async ({ request }) => {
	const key = process.env.ELEVENLABS_API_KEY?.trim();
	if (!key) return new Response("Missing ELEVENLABS_API_KEY", { status: 500 });
	const body = await request.json().catch(() => null);
	const text = body?.text?.trim();
	if (!text) return new Response("text required", { status: 400 });
	const voiceId = body?.voiceId ?? "EXAVITQu4vr4xnSDxMaL";
	const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=mp3_44100_128`, {
		method: "POST",
		headers: {
			"xi-api-key": key,
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			text,
			model_id: "eleven_turbo_v2_5",
			voice_settings: {
				stability: .55,
				similarity_boost: .8,
				style: .3,
				use_speaker_boost: true
			}
		})
	});
	if (!r.ok || !r.body) {
		const err = await r.text().catch(() => "");
		return new Response(err || "TTS failed", { status: r.status });
	}
	return new Response(r.body, { headers: {
		"Content-Type": "audio/mpeg",
		"Cache-Control": "no-store"
	} });
} } } });
function getUploadMetadata(upload, fieldName) {
	return {
		fieldName,
		filename: upload.name || "doctor-visit.webm",
		mimeType: upload.type || "application/octet-stream",
		size: upload.size
	};
}
function buildSpeakerTranscript(response) {
	const words = response.words?.filter((word) => word.type !== "spacing" && word.text?.trim());
	if (!words?.length) return response.text?.trim() ?? "";
	const speakerNames = /* @__PURE__ */ new Map();
	const lines = [];
	let currentSpeakerId = "";
	let currentWords = [];
	const getSpeakerName = (speakerId) => {
		const existing = speakerNames.get(speakerId);
		if (existing) return existing;
		const next = speakerNames.size === 0 ? "Doctor" : "Patient";
		speakerNames.set(speakerId, next);
		return next;
	};
	const flush = () => {
		const text = currentWords.join(" ").replace(/\s+([,.!?;:])/g, "$1").trim();
		if (!text || !currentSpeakerId) return;
		lines.push(`${getSpeakerName(currentSpeakerId)}: ${text}`);
		currentWords = [];
	};
	for (const word of words) {
		const speakerId = word.speaker_id ?? "speaker_1";
		if (speakerId !== currentSpeakerId) {
			flush();
			currentSpeakerId = speakerId;
		}
		currentWords.push(word.text ?? "");
	}
	flush();
	return lines.join("\n") || response.text?.trim() || "";
}
var Route$2 = createFileRoute("/api/stt")({ server: { handlers: { POST: async ({ request }) => {
	const key = process.env.ELEVENLABS_API_KEY?.trim();
	if (!key) return new Response("Missing ELEVENLABS_API_KEY", { status: 500 });
	const requestContentType = request.headers.get("content-type") ?? "";
	const incoming = await request.formData().catch(() => null);
	const audioValue = incoming?.get("audio");
	const fileValue = incoming?.get("file");
	const uploadValue = audioValue instanceof Blob ? audioValue : fileValue;
	const uploadFieldName = audioValue instanceof Blob ? "audio" : "file";
	if (!(uploadValue instanceof Blob)) {
		console.error("[ElevenLabs STT] Missing audio upload", {
			"request.content_type": requestContentType,
			acceptedFields: ["audio", "file"]
		});
		return Response.json({
			error: "audio file required",
			requestContentType,
			acceptedFields: ["audio", "file"]
		}, { status: 400 });
	}
	const metadata = getUploadMetadata(uploadValue, uploadFieldName);
	const audioBytes = await uploadValue.arrayBuffer();
	const first20Bytes = Array.from(new Uint8Array(audioBytes.slice(0, 20))).map((byte) => byte.toString(16).padStart(2, "0")).join("");
	console.info("[ElevenLabs STT] Incoming upload", {
		"request.content_type": requestContentType,
		uploaded_field_name: metadata.fieldName,
		uploaded_filename: metadata.filename,
		uploaded_mime_type: metadata.mimeType,
		uploaded_file_size: metadata.size,
		first_20_bytes: first20Bytes
	});
	if (metadata.size === 0) return Response.json({
		error: "uploaded audio file is empty",
		requestContentType,
		uploadedFieldName: metadata.fieldName,
		uploadedFilename: metadata.filename,
		uploadedMimeType: metadata.mimeType,
		uploadedFileSize: metadata.size,
		first20Bytes
	}, { status: 400 });
	const upload = new Blob([audioBytes], { type: metadata.mimeType });
	const form = new FormData();
	form.append("file", upload, metadata.filename);
	form.append("model_id", "scribe_v2");
	form.append("tag_audio_events", "false");
	form.append("diarize", "true");
	form.append("num_speakers", "2");
	console.info("[ElevenLabs STT] Request payload", {
		url: "https://api.elevenlabs.io/v1/speech-to-text",
		method: "POST",
		data: {
			model_id: "scribe_v2",
			tag_audio_events: "false",
			diarize: "true",
			num_speakers: "2"
		},
		files: { file: {
			filename: metadata.filename,
			incoming_field_name: metadata.fieldName,
			content_type: metadata.mimeType,
			size: metadata.size,
			first_20_bytes: first20Bytes
		} }
	});
	const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
		method: "POST",
		headers: { "xi-api-key": key },
		body: form
	});
	if (!response.ok) {
		const error = await response.text().catch(() => "");
		console.info("[ElevenLabs STT] Response", {
			status: response.status,
			body: error
		});
		return Response.json({
			error: "ElevenLabs STT failed",
			status: response.status,
			elevenLabsResponseBody: error,
			requestContentType,
			uploadedFieldName: metadata.fieldName,
			uploadedFilename: metadata.filename,
			uploadedMimeType: metadata.mimeType,
			uploadedFileSize: metadata.size,
			first20Bytes
		}, { status: response.status });
	}
	const json = await response.json();
	console.info("[ElevenLabs STT] Response", {
		status: response.status,
		body: json
	});
	return Response.json({
		text: buildSpeakerTranscript(json),
		rawText: json.text?.trim() ?? ""
	});
} } } });
var DEFAULT_QWEN_BASE_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
var DEFAULT_QWEN_MODEL = "qwen-plus";
function getRequiredQwenApiKey() {
	const key = (process.env.QWEN_API_KEY ?? process.env.DASHSCOPE_API_KEY)?.trim();
	if (!key) throw new Error("Missing QWEN_API_KEY or DASHSCOPE_API_KEY");
	return key;
}
function getQwenConfig() {
	const baseUrl = (process.env.QWEN_API_BASE_URL ?? DEFAULT_QWEN_BASE_URL).trim();
	const model = (process.env.QWEN_MODEL ?? DEFAULT_QWEN_MODEL).trim() || DEFAULT_QWEN_MODEL;
	return {
		baseUrl: baseUrl.replace(/\/$/, ""),
		model,
		fallbackModel: DEFAULT_QWEN_MODEL,
		hasApiKey: Boolean((process.env.QWEN_API_KEY ?? process.env.DASHSCOPE_API_KEY)?.trim())
	};
}
async function requestQwenChatCompletion({ key, baseUrl, model, messages, temperature, maxTokens }) {
	return fetch(`${baseUrl}/chat/completions`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${key}`,
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			model,
			messages,
			temperature,
			max_tokens: maxTokens
		})
	});
}
async function qwenChatCompletion({ messages, temperature = .4, maxTokens = 600, model }) {
	const key = getRequiredQwenApiKey();
	const config = getQwenConfig();
	const requestedModel = (model ?? config.model).trim() || DEFAULT_QWEN_MODEL;
	let response = await requestQwenChatCompletion({
		key,
		baseUrl: config.baseUrl,
		model: requestedModel,
		messages,
		temperature,
		maxTokens
	});
	if (!model && requestedModel !== DEFAULT_QWEN_MODEL && (response.status === 400 || response.status === 404)) response = await requestQwenChatCompletion({
		key,
		baseUrl: config.baseUrl,
		model: DEFAULT_QWEN_MODEL,
		messages,
		temperature,
		maxTokens
	});
	if (!response.ok) {
		const text = await response.text().catch(() => "");
		throw new Error(`Qwen Cloud ${response.status}: ${text.slice(0, 200)}`);
	}
	return (await response.json()).choices?.[0]?.message?.content ?? "";
}
var Route$1 = createFileRoute("/api/qwen-proof")({ server: { handlers: {
	GET: async () => {
		const qwen = getQwenConfig();
		return Response.json({
			purpose: "Proof endpoint for Alibaba Cloud / Qwen Cloud API usage.",
			provider: "Alibaba Cloud Model Studio / Qwen Cloud",
			endpoint: `${qwen.baseUrl}/chat/completions`,
			model: qwen.model,
			apiKeyEnv: "QWEN_API_KEY or DASHSCOPE_API_KEY",
			usage: {
				method: "POST",
				body: { prompt: "Explain MedsBuddy in one sentence." }
			}
		});
	},
	POST: async ({ request }) => {
		const prompt = (await request.json().catch(() => null))?.prompt?.trim() || "Explain MedsBuddy in one sentence.";
		const reply = await qwenChatCompletion({
			messages: [{
				role: "system",
				content: "You are MedsBuddy, a concise patient advocate. Mention that this response is powered by Qwen Cloud."
			}, {
				role: "user",
				content: prompt
			}],
			temperature: .2,
			maxTokens: 180
		});
		return Response.json({
			provider: "Alibaba Cloud Model Studio / Qwen Cloud",
			model: getQwenConfig().model,
			prompt,
			reply
		});
	}
} } });
var Route = createFileRoute("/api/health")({ server: { handlers: { GET: async () => {
	const qwen = getQwenConfig();
	return Response.json({
		ok: true,
		service: "medsbuddy-ai-backend",
		deploymentTarget: "Alibaba Cloud",
		qwen: {
			configured: qwen.hasApiKey,
			model: qwen.model,
			baseUrl: qwen.baseUrl
		},
		database: {
			configured: Boolean(process.env.DATABASE_URL),
			provider: process.env.DATABASE_PROVIDER ?? "local-browser-store"
		}
	});
} } } });
var TalkRoute = Route$16.update({
	id: "/talk",
	path: "/talk",
	getParentRoute: () => Route$17
});
var SymptomsRoute = Route$15.update({
	id: "/symptoms",
	path: "/symptoms",
	getParentRoute: () => Route$17
});
var RemindersRoute = Route$14.update({
	id: "/reminders",
	path: "/reminders",
	getParentRoute: () => Route$17
});
var ProfileRoute = Route$13.update({
	id: "/profile",
	path: "/profile",
	getParentRoute: () => Route$17
});
var MemoryRoute = Route$12.update({
	id: "/memory",
	path: "/memory",
	getParentRoute: () => Route$17
});
var EmergencyRoute = Route$11.update({
	id: "/emergency",
	path: "/emergency",
	getParentRoute: () => Route$17
});
var DoctorRoute = Route$10.update({
	id: "/doctor",
	path: "/doctor",
	getParentRoute: () => Route$17
});
var CaregiverRoute = Route$9.update({
	id: "/caregiver",
	path: "/caregiver",
	getParentRoute: () => Route$17
});
var ArchitectureRoute = Route$8.update({
	id: "/architecture",
	path: "/architecture",
	getParentRoute: () => Route$17
});
var IndexRoute = Route$7.update({
	id: "/",
	path: "/",
	getParentRoute: () => Route$17
});
var TalkIndexRoute = Route$6.update({
	id: "/",
	path: "/",
	getParentRoute: () => TalkRoute
});
var DoctorIndexRoute = Route$5.update({
	id: "/",
	path: "/",
	getParentRoute: () => DoctorRoute
});
var TalkThreadIdRoute = Route$4.update({
	id: "/$threadId",
	path: "/$threadId",
	getParentRoute: () => TalkRoute
});
var ApiTtsRoute = Route$3.update({
	id: "/api/tts",
	path: "/api/tts",
	getParentRoute: () => Route$17
});
var ApiSttRoute = Route$2.update({
	id: "/api/stt",
	path: "/api/stt",
	getParentRoute: () => Route$17
});
var ApiQwenProofRoute = Route$1.update({
	id: "/api/qwen-proof",
	path: "/api/qwen-proof",
	getParentRoute: () => Route$17
});
var ApiHealthRoute = Route.update({
	id: "/api/health",
	path: "/api/health",
	getParentRoute: () => Route$17
});
var DoctorRouteChildren = { DoctorIndexRoute };
var DoctorRouteWithChildren = DoctorRoute._addFileChildren(DoctorRouteChildren);
var TalkRouteChildren = {
	TalkThreadIdRoute,
	TalkIndexRoute
};
var rootRouteChildren = {
	IndexRoute,
	ArchitectureRoute,
	CaregiverRoute,
	DoctorRoute: DoctorRouteWithChildren,
	EmergencyRoute,
	MemoryRoute,
	ProfileRoute,
	RemindersRoute,
	SymptomsRoute,
	TalkRoute: TalkRoute._addFileChildren(TalkRouteChildren),
	ApiHealthRoute,
	ApiQwenProofRoute,
	ApiSttRoute,
	ApiTtsRoute
};
var routeTree = Route$17._addFileChildren(rootRouteChildren)._addFileTypes();
var getRouter = () => {
	return createRouter({
		routeTree,
		context: { queryClient: new QueryClient() },
		scrollRestoration: true,
		defaultPreloadStaleTime: 0
	});
};
//#endregion
export { getRouter };
