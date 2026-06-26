import { z } from "zod";

export const assistenteMensagemSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

export const assistenteChatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  history: z.array(assistenteMensagemSchema).max(16).optional().default([]),
});

export const assistenteChatResponseSchema = z.object({
  reply: z.string(),
});

export type AssistenteMensagem = z.infer<typeof assistenteMensagemSchema>;
export type AssistenteChatRequest = z.infer<typeof assistenteChatRequestSchema>;
export type AssistenteChatResponse = z.infer<typeof assistenteChatResponseSchema>;
