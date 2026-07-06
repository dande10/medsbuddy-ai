//#region src/lib/qwen-cloud.ts
var DEFAULT_QWEN_BASE_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
var DEFAULT_QWEN_MODEL = "qwen-plus";
function getRequiredQwenApiKey() {
	const key = process.env.QWEN_API_KEY ?? process.env.DASHSCOPE_API_KEY;
	if (!key) throw new Error("Missing QWEN_API_KEY or DASHSCOPE_API_KEY");
	return key;
}
function getQwenConfig() {
	const baseUrl = process.env.QWEN_API_BASE_URL ?? DEFAULT_QWEN_BASE_URL;
	const model = process.env.QWEN_MODEL ?? DEFAULT_QWEN_MODEL;
	return {
		baseUrl: baseUrl.replace(/\/$/, ""),
		model,
		hasApiKey: Boolean(process.env.QWEN_API_KEY ?? process.env.DASHSCOPE_API_KEY)
	};
}
async function qwenChatCompletion({ messages, temperature = .4, maxTokens = 600, model }) {
	const key = getRequiredQwenApiKey();
	const config = getQwenConfig();
	const response = await fetch(`${config.baseUrl}/chat/completions`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${key}`,
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			model: model ?? config.model,
			messages,
			temperature,
			max_tokens: maxTokens
		})
	});
	if (!response.ok) {
		const text = await response.text().catch(() => "");
		throw new Error(`Qwen Cloud ${response.status}: ${text.slice(0, 200)}`);
	}
	return (await response.json()).choices?.[0]?.message?.content ?? "";
}
//#endregion
export { qwenChatCompletion as n, getQwenConfig as t };
