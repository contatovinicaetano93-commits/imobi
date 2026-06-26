"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assistenteChatResponseSchema = exports.assistenteChatRequestSchema = exports.assistenteMensagemSchema = void 0;
const zod_1 = require("zod");
exports.assistenteMensagemSchema = zod_1.z.object({
    role: zod_1.z.enum(["user", "assistant"]),
    content: zod_1.z.string().min(1).max(4000),
});
exports.assistenteChatRequestSchema = zod_1.z.object({
    message: zod_1.z.string().min(1).max(2000),
    history: zod_1.z.array(exports.assistenteMensagemSchema).max(16).optional().default([]),
});
exports.assistenteChatResponseSchema = zod_1.z.object({
    reply: zod_1.z.string(),
});
