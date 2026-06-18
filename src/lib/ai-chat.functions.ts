import { createServerFn } from "@tanstack/react-start";

interface ChatInput {
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  useWebSearch?: boolean;
  searchQuery?: string;
}

function validate(input: unknown): ChatInput {
  if (!input || typeof input !== "object") throw new Error("Invalid input");
  const i = input as ChatInput;
  if (!Array.isArray(i.messages)) throw new Error("messages required");
  return i;
}

async function tavilySearch(query: string): Promise<string> {
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
        include_answer: true,
      }),
    });
    if (!r.ok) return "";
    const data = (await r.json()) as { answer?: string; results?: { title: string; content: string }[] };
    const bits: string[] = [];
    if (data.answer) bits.push(`Summary: ${data.answer}`);
    for (const res of data.results ?? []) bits.push(`- ${res.title}: ${res.content}`);
    return bits.join("\n");
  } catch {
    return "";
  }
}

export const aiChat = createServerFn({ method: "POST" })
  .inputValidator(validate)
  .handler(async ({ data }) => {
    const key = process.env.FEATHERLESS_API_KEY;
    if (!key) throw new Error("Missing FEATHERLESS_API_KEY");

    const messages = [...data.messages];
    if (data.useWebSearch && data.searchQuery) {
      const ctx = await tavilySearch(data.searchQuery);
      if (ctx) {
        messages.splice(messages.length - 1, 0, {
          role: "system",
          content: `Relevant medical info from web search (cite if used):\n${ctx}`,
        });
      }
    }

    const r = await fetch("https://api.featherless.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta-llama/Meta-Llama-3.1-8B-Instruct",
        messages,
        temperature: 0.4,
        max_tokens: 600,
      }),
    });
    if (!r.ok) {
      const text = await r.text().catch(() => "");
      throw new Error(`Featherless ${r.status}: ${text.slice(0, 200)}`);
    }
    const json = (await r.json()) as { choices: { message: { content: string } }[] };
    return { reply: json.choices?.[0]?.message?.content ?? "" };
  });