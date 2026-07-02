import { createServerFn } from "@tanstack/react-start";
import { qwenChatCompletion } from "@/lib/qwen-cloud";

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
    const data = (await r.json()) as {
      answer?: string;
      results?: { title: string; content: string }[];
    };
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

    const reply = await qwenChatCompletion({
      messages,
      temperature: 0.4,
      maxTokens: 600,
    });
    return { reply };
  });
