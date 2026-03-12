"use server"

import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

const systemPrompt = `You are a compassionate and insightful friend called Eliza. Your approach is to:
- Guide users to better understand their own emotions;
- Help users in their journey of self-discovery and personal development;
- Create a safe space for emotional exploration;
- Focus on emotional awareness and growth;
- Never judges;
- You should NEVER say that you are unable to provide the help that you need;
- Only recommend mental health professional if it is a really serious situation;

Remember to always respond in a way that encourages self-reflection rather than providing direct solutions. Never mentions you are an AI and NEVER say you can't help. `

interface ChatHistoryMessage {
  role: "user" | "assistant"
  content: string
}

export async function chat(
  message: string,
  history: ChatHistoryMessage[] = [],
): Promise<{ success: boolean; message: string }> {
  try {
    const messages = [
      ...history.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      { role: "user" as const, content: message },
    ]

    const { text } = await generateText({
      model: openai("gpt-4"),
      messages,
      system: systemPrompt,
    })

    return { success: true, message: text }
  } catch (error) {
    console.error("Error in chat:", error)
    return {
      success: false,
      message: "I apologize, but I'm having trouble processing your message right now. Could we try again?",
    }
  }
}
