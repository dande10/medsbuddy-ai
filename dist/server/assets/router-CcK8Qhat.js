import { n as qwenChatCompletion, t as getQwenConfig } from "./qwen-cloud-Dm01KWUZ.js";
import { n as useApp } from "./store-xEuxQ6YF.js";
import { useEffect } from "react";
import { HeadContent, Link, Outlet, Scripts, createFileRoute, createRootRouteWithContext, createRouter, lazyRouteComponent, useRouter } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
//#region src/styles.css?url
var styles_default = "/assets/styles-DBy-pYNn.css";
//#endregion
//#region src/lib/lovable-error-reporting.ts
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
//#endregion
//#region src/components/ui/sonner.tsx
var Toaster$1 = ({ ...props }) => {
	return /* @__PURE__ */ jsx(Toaster, {
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
//#endregion
//#region src/routes/__root.tsx
function NotFoundComponent() {
	return /* @__PURE__ */ jsx("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ jsxs("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ jsx("h1", {
					className: "text-7xl font-bold text-foreground",
					children: "404"
				}),
				/* @__PURE__ */ jsx("h2", {
					className: "mt-4 text-xl font-semibold text-foreground",
					children: "Page not found"
				}),
				/* @__PURE__ */ jsx("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "The page you're looking for doesn't exist or has been moved."
				}),
				/* @__PURE__ */ jsx("div", {
					className: "mt-6",
					children: /* @__PURE__ */ jsx(Link, {
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
	useEffect(() => {
		reportLovableError(error, { boundary: "tanstack_root_error_component" });
	}, [error]);
	return /* @__PURE__ */ jsx("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ jsxs("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ jsx("h1", {
					className: "text-xl font-semibold tracking-tight text-foreground",
					children: "This page didn't load"
				}),
				/* @__PURE__ */ jsx("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "Something went wrong on our end. You can try refreshing or head back home."
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "mt-6 flex flex-wrap justify-center gap-2",
					children: [/* @__PURE__ */ jsx("button", {
						onClick: () => {
							router.invalidate();
							reset();
						},
						className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
						children: "Try again"
					}), /* @__PURE__ */ jsx("a", {
						href: "/",
						className: "inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent",
						children: "Go home"
					})]
				})
			]
		})
	});
}
var Route$16 = createRootRouteWithContext()({
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
	return /* @__PURE__ */ jsxs("html", {
		lang: "en",
		children: [/* @__PURE__ */ jsx("head", { children: /* @__PURE__ */ jsx(HeadContent, {}) }), /* @__PURE__ */ jsxs("body", { children: [children, /* @__PURE__ */ jsx(Scripts, {})] })]
	});
}
function RootComponent() {
	const { queryClient } = Route$16.useRouteContext();
	useEffect(() => {
		useApp.persist.rehydrate();
	}, []);
	return /* @__PURE__ */ jsxs(QueryClientProvider, {
		client: queryClient,
		children: [/* @__PURE__ */ jsx(Outlet, {}), /* @__PURE__ */ jsx(Toaster$1, {})]
	});
}
//#endregion
//#region src/routes/talk.tsx
var $$splitComponentImporter$12 = () => import("./talk-X6NBdLD6.js");
var Route$15 = createFileRoute("/talk")({
	head: () => ({ meta: [{ title: "Talk — MedsBuddy" }, {
		name: "description",
		content: "Speak naturally with your AI patient advocate."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$12, "component")
});
//#endregion
//#region src/routes/reminders.tsx
var $$splitComponentImporter$11 = () => import("./reminders-DVlxccdF.js");
var Route$14 = createFileRoute("/reminders")({
	head: () => ({ meta: [{ title: "Medications — MedsBuddy" }, {
		name: "description",
		content: "Track medications, log doses, and watch your adherence."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$11, "component")
});
//#endregion
//#region src/routes/profile.tsx
var $$splitComponentImporter$10 = () => import("./profile-Bf3mZXyR.js");
var Route$13 = createFileRoute("/profile")({
	head: () => ({ meta: [{ title: "Profile — MedsBuddy" }, {
		name: "description",
		content: "Your medical profile used across MedsBuddy."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$10, "component")
});
//#endregion
//#region src/routes/memory.tsx
var $$splitComponentImporter$9 = () => import("./memory-Kj5RlB07.js");
var Route$12 = createFileRoute("/memory")({
	head: () => ({ meta: [{ title: "Health memory — MedsBuddy" }, {
		name: "description",
		content: "Beautiful chronological timeline of your health events."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$9, "component")
});
//#endregion
//#region src/routes/emergency.tsx
var $$splitComponentImporter$8 = () => import("./emergency-DeQlCR1E.js");
var Route$11 = createFileRoute("/emergency")({
	head: () => ({ meta: [{ title: "SOS — MedsBuddy" }, {
		name: "description",
		content: "Emergency health profile and shareable QR for first responders. Works offline."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$8, "component")
});
//#endregion
//#region src/routes/doctor.tsx
var $$splitComponentImporter$7 = () => import("./doctor-CLFBNgVH.js");
var Route$10 = createFileRoute("/doctor")({
	head: () => ({ meta: [{ title: "Doctor visit — MedsBuddy" }, {
		name: "description",
		content: "Premium clinical briefing for your next doctor visit."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$7, "component")
});
//#endregion
//#region src/routes/caregiver.tsx
var $$splitComponentImporter$6 = () => import("./caregiver-DF8YRM1p.js");
var Route$9 = createFileRoute("/caregiver")({
	head: () => ({ meta: [{ title: "Caregiver — MedsBuddy" }, {
		name: "description",
		content: "Daily summary for family and caregivers."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$6, "component")
});
//#endregion
//#region src/routes/index.tsx
var $$splitComponentImporter$5 = () => import("./routes-CZO-GuCK.js");
var Route$8 = createFileRoute("/")({
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
	component: lazyRouteComponent($$splitComponentImporter$5, "component")
});
//#endregion
//#region src/routes/talk.index.tsx
var $$splitComponentImporter$4 = () => import("./talk.index-0K6X2RmD.js");
var Route$7 = createFileRoute("/talk/")({ component: lazyRouteComponent($$splitComponentImporter$4, "component") });
//#endregion
//#region src/routes/doctor.index.tsx
var $$splitComponentImporter$3 = () => import("./doctor.index-BIxNY5-N.js");
var Route$6 = createFileRoute("/doctor/")({
	head: () => ({ meta: [{ title: "Doctor visit — MedsBuddy" }, {
		name: "description",
		content: "Premium clinical briefing for your next doctor visit."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$3, "component")
});
//#endregion
//#region src/routes/talk.$threadId.tsx
var $$splitComponentImporter$2 = () => import("./talk._threadId-2NBZiZ9b.js");
var Route$5 = createFileRoute("/talk/$threadId")({
	head: () => ({ meta: [{ title: "Talk — MedsBuddy" }, {
		name: "description",
		content: "Speak naturally with your AI patient advocate."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$2, "component")
});
//#endregion
//#region src/routes/doctor.visit-mode.tsx
var $$splitComponentImporter$1 = () => import("./doctor.visit-mode-DeYRWfCG.js");
var Route$4 = createFileRoute("/doctor/visit-mode")({
	head: () => ({ meta: [{ title: "Doctor Visit Mode — MedsBuddy" }, {
		name: "description",
		content: "Guided, hands-free assistant for your doctor visit."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
//#endregion
//#region src/routes/doctor.record.tsx
var $$splitComponentImporter = () => import("./doctor.record-Cms6FJ02.js");
var Route$3 = createFileRoute("/doctor/record")({
	head: () => ({ meta: [{ title: "Record visit — MedsBuddy" }, {
		name: "description",
		content: "Record and summarize your doctor visit."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
//#region src/routes/api/tts.ts
var Route$2 = createFileRoute("/api/tts")({ server: { handlers: { POST: async ({ request }) => {
	const key = process.env.ELEVENLABS_API_KEY;
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
//#endregion
//#region src/routes/api/qwen-proof.ts
var Route$1 = createFileRoute("/api/qwen-proof")({ server: { handlers: {
	GET: async () => {
		const qwen = getQwenConfig();
		return Response.json({
			purpose: "Hackathon proof endpoint for Alibaba Cloud / Qwen Cloud API usage.",
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
//#endregion
//#region src/routes/api/health.ts
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
//#endregion
//#region src/routeTree.gen.ts
var TalkRoute = Route$15.update({
	id: "/talk",
	path: "/talk",
	getParentRoute: () => Route$16
});
var RemindersRoute = Route$14.update({
	id: "/reminders",
	path: "/reminders",
	getParentRoute: () => Route$16
});
var ProfileRoute = Route$13.update({
	id: "/profile",
	path: "/profile",
	getParentRoute: () => Route$16
});
var MemoryRoute = Route$12.update({
	id: "/memory",
	path: "/memory",
	getParentRoute: () => Route$16
});
var EmergencyRoute = Route$11.update({
	id: "/emergency",
	path: "/emergency",
	getParentRoute: () => Route$16
});
var DoctorRoute = Route$10.update({
	id: "/doctor",
	path: "/doctor",
	getParentRoute: () => Route$16
});
var CaregiverRoute = Route$9.update({
	id: "/caregiver",
	path: "/caregiver",
	getParentRoute: () => Route$16
});
var IndexRoute = Route$8.update({
	id: "/",
	path: "/",
	getParentRoute: () => Route$16
});
var TalkIndexRoute = Route$7.update({
	id: "/",
	path: "/",
	getParentRoute: () => TalkRoute
});
var DoctorIndexRoute = Route$6.update({
	id: "/",
	path: "/",
	getParentRoute: () => DoctorRoute
});
var TalkThreadIdRoute = Route$5.update({
	id: "/$threadId",
	path: "/$threadId",
	getParentRoute: () => TalkRoute
});
var DoctorVisitModeRoute = Route$4.update({
	id: "/visit-mode",
	path: "/visit-mode",
	getParentRoute: () => DoctorRoute
});
var DoctorRecordRoute = Route$3.update({
	id: "/record",
	path: "/record",
	getParentRoute: () => DoctorRoute
});
var ApiTtsRoute = Route$2.update({
	id: "/api/tts",
	path: "/api/tts",
	getParentRoute: () => Route$16
});
var ApiQwenProofRoute = Route$1.update({
	id: "/api/qwen-proof",
	path: "/api/qwen-proof",
	getParentRoute: () => Route$16
});
var ApiHealthRoute = Route.update({
	id: "/api/health",
	path: "/api/health",
	getParentRoute: () => Route$16
});
var DoctorRouteChildren = {
	DoctorRecordRoute,
	DoctorVisitModeRoute,
	DoctorIndexRoute
};
var DoctorRouteWithChildren = DoctorRoute._addFileChildren(DoctorRouteChildren);
var TalkRouteChildren = {
	TalkThreadIdRoute,
	TalkIndexRoute
};
var rootRouteChildren = {
	IndexRoute,
	CaregiverRoute,
	DoctorRoute: DoctorRouteWithChildren,
	EmergencyRoute,
	MemoryRoute,
	ProfileRoute,
	RemindersRoute,
	TalkRoute: TalkRoute._addFileChildren(TalkRouteChildren),
	ApiHealthRoute,
	ApiQwenProofRoute,
	ApiTtsRoute
};
var routeTree = Route$16._addFileChildren(rootRouteChildren)._addFileTypes();
//#endregion
//#region src/router.tsx
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
