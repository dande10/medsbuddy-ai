import { i as createServerFn, p as TSS_SERVER_FUNCTION } from "./esm-Dova13aH.js";
import { n as qwenChatCompletion } from "./qwen-cloud-Dm01KWUZ.js";
//#region node_modules/@tanstack/start-server-core/dist/esm/createServerRpc.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
//#endregion
//#region src/lib/ai-chat.functions.ts?tss-serverfn-split
function validate(input) {
	if (!input || typeof input !== "object") throw new Error("Invalid input");
	const i = input;
	if (!Array.isArray(i.messages)) throw new Error("messages required");
	return i;
}
async function tavilySearch(query) {
	const key = process.env.TAVILY_API_KEY;
	if (!key) return "";
	try {
		const r = await fetch("https://api.tavily.com/search", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				api_key: key,
				query,
				search_depth: "basic",
				max_results: 4,
				include_answer: true
			})
		});
		if (!r.ok) return "";
		const data = await r.json();
		const bits = [];
		if (data.answer) bits.push(`Summary: ${data.answer}`);
		for (const res of data.results ?? []) bits.push(`- ${res.title}: ${res.content}`);
		return bits.join("\n");
	} catch {
		return "";
	}
}
var aiChat_createServerFn_handler = createServerRpc({
	id: "752f65877434fcdd6e45f891c73843f5fd88857a1a68bc0b33a7fec45033e747",
	name: "aiChat",
	filename: "src/lib/ai-chat.functions.ts"
}, (opts) => aiChat.__executeServer(opts));
var aiChat = createServerFn({ method: "POST" }).inputValidator(validate).handler(aiChat_createServerFn_handler, async ({ data }) => {
	const messages = [...data.messages];
	if (data.useWebSearch && data.searchQuery) {
		const ctx = await tavilySearch(data.searchQuery);
		if (ctx) messages.splice(messages.length - 1, 0, {
			role: "system",
			content: `Relevant medical info from web search (cite if used):\n${ctx}`
		});
	}
	return { reply: await qwenChatCompletion({
		messages,
		temperature: .4,
		maxTokens: 600
	}) };
});
//#endregion
export { aiChat_createServerFn_handler };
