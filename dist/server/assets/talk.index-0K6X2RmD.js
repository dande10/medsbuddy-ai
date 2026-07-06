import { n as useApp } from "./store-xEuxQ6YF.js";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { jsx } from "react/jsx-runtime";
//#region src/routes/talk.index.tsx?tsr-split=component
function TalkRedirect() {
	const [hydrated, setHydrated] = useState(false);
	const navigate = useNavigate();
	const { threads, activeThreadId, createThread } = useApp();
	useEffect(() => {
		const unsub = useApp.persist.onFinishHydration(() => setHydrated(true));
		if (useApp.persist.hasHydrated()) setHydrated(true);
		return () => unsub();
	}, []);
	useEffect(() => {
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
	return /* @__PURE__ */ jsx("div", {
		className: "py-20 text-center text-sm text-muted-foreground",
		children: "Opening MedsBuddy…"
	});
}
//#endregion
export { TalkRedirect as component };
