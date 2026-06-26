import {
  Injectable,
  ServiceUnavailableException,
  BadGatewayException,
} from "@nestjs/common";
import type { AssistenteChatRequest, AssistenteMensagem } from "@imbobi/schemas";

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4o-mini";
const TIMEOUT_MS = 25_000;

const SYSTEM_PROMPT = `Você é o assistente da plataforma IMOBI (crédito para obras).
Ajude o usuário a navegar o produto: KYC, viabilidade, obras, etapas, crédito, vistorias e perfis (construtor, gestor, admin).
Responda em português do Brasil, de forma clara e objetiva (máx. 6 frases quando possível).
Não aprove crédito, não libere etapas e não invente dados de conta — oriente a usar as telas oficiais.
Se pedirem relatório financeiro completo, indique o menu Relatórios ou Carteira do Fundo, sem gerar números fictícios.
Se não souber, sugira falar com o suporte humano pelo WhatsApp.`;

type OpenAiChoice = { message?: { content?: string } };

@Injectable()
export class AssistenteService {
  async chat(
    body: AssistenteChatRequest,
    contexto: { role?: string },
  ): Promise<{ reply: string }> {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      throw new ServiceUnavailableException(
        "Assistente indisponível — configure OPENAI_API_KEY no servidor.",
      );
    }

    const historico: AssistenteMensagem[] = body.history ?? [];
    const messages = [
      {
        role: "system" as const,
        content: `${SYSTEM_PROMPT}\n\nPerfil do usuário: ${contexto.role ?? "—"}`,
      },
      ...historico.map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: body.message },
    ];

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(OPENAI_CHAT_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          temperature: 0.4,
          max_tokens: 600,
          messages,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new BadGatewayException(
          `Falha ao consultar assistente (${res.status})${errText ? `: ${errText.slice(0, 120)}` : ""}`,
        );
      }

      const data = (await res.json()) as { choices?: OpenAiChoice[] };
      const reply = data.choices?.[0]?.message?.content?.trim();
      if (!reply) {
        throw new BadGatewayException("Resposta vazia do assistente.");
      }

      return { reply };
    } catch (err: unknown) {
      if (err instanceof ServiceUnavailableException || err instanceof BadGatewayException) {
        throw err;
      }
      if (err instanceof Error && err.name === "AbortError") {
        throw new BadGatewayException("Assistente demorou demais. Tente uma pergunta mais curta.");
      }
      throw new BadGatewayException("Não foi possível falar com o assistente agora.");
    } finally {
      clearTimeout(timer);
    }
  }
}
