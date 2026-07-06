import { o as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as useApp } from "./store-CNkGaKo_.mjs";
import { _ as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/talk.index-BeMCTjL9.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function TalkRedirect() {
	const [hydrated, setHydrated] = (0, import_react.useState)(false);
	const navigate = useNavigate();
	const { threads, activeThreadId, createThread } = useApp();
	(0, import_react.useEffect)(() => {
		const unsub = useApp.persist.onFinishHydration(() => setHydrated(true));
		if (useApp.persist.hasHydrated()) setHydrated(true);
		return () => unsub();
	}, []);
	(0, import_react.useEffect)(() => {
		if (!hydrated) return;
		navigate({
			to: "/talk/$threadId",
			params: { threadId: activeThreadId && threads.find((t) => t.id === activeThreadId)?.id || threads[0]?.id || createThread() },
			replace: true
		});
	}, [
		hydrated,
		activeThreadId,
		threads,
		createThread,
		navigate
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "py-20 text-center text-sm text-muted-foreground",
		children: "Opening MedsBuddy…"
	});
}
//#endregion
export { TalkRedirect as component };
