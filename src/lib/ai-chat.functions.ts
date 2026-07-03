import { createServerFn } from "@tanstack/react-start";
import { qwenChatCompletion } from "@/lib/qwen-cloud";

interface ChatInput {
  messages: { role: "system" | "user" | "assistant"; content: string }[];
}

function validate(input: unknown): ChatInput {
  if (!input || typeof input !== "object") throw new Error("Invalid input");
  const i = input as ChatInput;
  if (!Array.isArray(i.messages)) throw new Error("messages required");
  return i;
}

export const aiChat = createServerFn({ method: "POST" })
  .inputValidator(validate)
  .handler(async ({ data }) => {
    const messages = [...data.messages];
    const reply = await qwenChatCompletion({
      messages,
      temperature: 0.4,
      maxTokens: 600,
    });
    return { reply };
  });
