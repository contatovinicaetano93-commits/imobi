import { z } from "zod";
export declare const assistenteMensagemSchema: z.ZodObject<{
    role: z.ZodEnum<["user", "assistant"]>;
    content: z.ZodString;
}, "strip", z.ZodTypeAny, {
    role: "user" | "assistant";
    content: string;
}, {
    role: "user" | "assistant";
    content: string;
}>;
export declare const assistenteChatRequestSchema: z.ZodObject<{
    message: z.ZodString;
    history: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
        role: z.ZodEnum<["user", "assistant"]>;
        content: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        role: "user" | "assistant";
        content: string;
    }, {
        role: "user" | "assistant";
        content: string;
    }>, "many">>>;
}, "strip", z.ZodTypeAny, {
    message: string;
    history: {
        role: "user" | "assistant";
        content: string;
    }[];
}, {
    message: string;
    history?: {
        role: "user" | "assistant";
        content: string;
    }[] | undefined;
}>;
export declare const assistenteChatResponseSchema: z.ZodObject<{
    reply: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reply: string;
}, {
    reply: string;
}>;
export type AssistenteMensagem = z.infer<typeof assistenteMensagemSchema>;
export type AssistenteChatRequest = z.infer<typeof assistenteChatRequestSchema>;
export type AssistenteChatResponse = z.infer<typeof assistenteChatResponseSchema>;
