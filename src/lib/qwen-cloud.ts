export type QwenRole = "system" | "user" | "assistant";

export interface QwenMessage {
  role: QwenRole;
  content: string;
}

interface QwenChatOptions {
  messages: QwenMessage[];
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

interface QwenChatResponse {
  choices?: {
    message?: {
      content?: string;
    };
  }[];
}

const DEFAULT_QWEN_BASE_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
const DEFAULT_QWEN_MODEL = "qwen-plus";

function getRequiredQwenApiKey(): string {
  const key = (process.env.QWEN_API_KEY ?? process.env.DASHSCOPE_API_KEY)?.trim();
  if (!key) throw new Error("Missing QWEN_API_KEY or DASHSCOPE_API_KEY");
  return key;
}

export function getQwenConfig() {
  const baseUrl = (process.env.QWEN_API_BASE_URL ?? DEFAULT_QWEN_BASE_URL).trim();
  const model = (process.env.QWEN_MODEL ?? DEFAULT_QWEN_MODEL).trim() || DEFAULT_QWEN_MODEL;
  return {
    baseUrl: baseUrl.replace(/\/$/, ""),
    model,
    fallbackModel: DEFAULT_QWEN_MODEL,
    hasApiKey: Boolean((process.env.QWEN_API_KEY ?? process.env.DASHSCOPE_API_KEY)?.trim()),
  };
}

async function requestQwenChatCompletion({
  key,
  baseUrl,
  model,
  messages,
  temperature,
  maxTokens,
}: QwenChatOptions & { key: string; baseUrl: string; model: string }) {
  return fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });
}

export async function qwenChatCompletion({
  messages,
  temperature = 0.4,
  maxTokens = 600,
  model,
}: QwenChatOptions): Promise<string> {
  const key = getRequiredQwenApiKey();
  const config = getQwenConfig();
  const requestedModel = (model ?? config.model).trim() || DEFAULT_QWEN_MODEL;

  let response = await requestQwenChatCompletion({
    key,
    baseUrl: config.baseUrl,
    model: requestedModel,
    messages,
    temperature,
    maxTokens,
  });

  if (
    !model &&
    requestedModel !== DEFAULT_QWEN_MODEL &&
    (response.status === 400 || response.status === 404)
  ) {
    response = await requestQwenChatCompletion({
      key,
      baseUrl: config.baseUrl,
      model: DEFAULT_QWEN_MODEL,
      messages,
      temperature,
      maxTokens,
    });
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Qwen Cloud ${response.status}: ${text.slice(0, 200)}`);
  }

  const json = (await response.json()) as QwenChatResponse;
  return json.choices?.[0]?.message?.content ?? "";
}
