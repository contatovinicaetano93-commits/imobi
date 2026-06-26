import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Anthropic from "@anthropic-ai/sdk";
import { PrismaService } from "../prisma/prisma.service";

type ToolName = "listar_obras" | "buscar_credito" | "listar_notificacoes" | "resumo_usuario";

const TOOLS: Anthropic.Tool[] = [
  {
    name: "listar_obras",
    description: "Lista as obras do usuário com status, etapas e progresso",
    input_schema: {
      type: "object",
      properties: {
        usuarioId: { type: "string", description: "ID do usuário" },
      },
      required: ["usuarioId"],
    },
  },
  {
    name: "buscar_credito",
    description: "Busca créditos e liberações do usuário",
    input_schema: {
      type: "object",
      properties: {
        usuarioId: { type: "string", description: "ID do usuário" },
      },
      required: ["usuarioId"],
    },
  },
  {
    name: "listar_notificacoes",
    description: "Lista notificações recentes e não lidas do usuário",
    input_schema: {
      type: "object",
      properties: {
        usuarioId: { type: "string", description: "ID do usuário" },
        apenasNaoLidas: { type: "boolean", description: "Se verdadeiro, retorna apenas não lidas" },
      },
      required: ["usuarioId"],
    },
  },
  {
    name: "resumo_usuario",
    description: "Retorna resumo geral do usuário: nome, obras ativas, saldo de crédito",
    input_schema: {
      type: "object",
      properties: {
        usuarioId: { type: "string", description: "ID do usuário" },
      },
      required: ["usuarioId"],
    },
  },
];

@Injectable()
export class TelegramAiService {
  private readonly logger = new Logger(TelegramAiService.name);
  private readonly client: Anthropic;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.client = new Anthropic({
      apiKey: this.config.get<string>("ANTHROPIC_API_KEY"),
    });
  }

  async responder(usuarioId: string, nomeUsuario: string, mensagem: string): Promise<string> {
    const systemPrompt = `Você é a Secretária Virtual da plataforma iMobi, assistente inteligente de gestão de obras e crédito habitacional.

Usuário atual: ${nomeUsuario} (ID: ${usuarioId})

Suas responsabilidades:
- Informar o status das obras e etapas de construção
- Esclarecer situação de crédito, liberações e saldos
- Mostrar notificações pendentes
- Responder dúvidas sobre o processo de financiamento de obras
- Ser proativa, simpática e objetiva

Regras:
- Responda SEMPRE em português brasileiro
- Use formatação Markdown compatível com Telegram (negrito com *texto*, itálico com _texto_)
- Seja concisa mas completa
- Quando não souber algo, diga claramente
- Nunca invente dados — use sempre as ferramentas para buscar informações reais`;

    const messages: Anthropic.MessageParam[] = [
      { role: "user", content: mensagem },
    ];

    let response = await this.client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: systemPrompt,
      tools: TOOLS,
      messages,
    });

    while (response.stop_reason === "tool_use") {
      const toolUses = response.content.filter((b) => b.type === "tool_use") as Anthropic.ToolUseBlock[];
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const toolUse of toolUses) {
        const result = await this.executarFerramenta(toolUse.name as ToolName, toolUse.input as Record<string, unknown>);
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        });
      }

      messages.push({ role: "assistant", content: response.content });
      messages.push({ role: "user", content: toolResults });

      response = await this.client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: systemPrompt,
        tools: TOOLS,
        messages,
      });
    }

    const textBlock = response.content.find((b) => b.type === "text") as Anthropic.TextBlock | undefined;
    return textBlock?.text ?? "Desculpe, não consegui processar sua solicitação no momento.";
  }

  private async executarFerramenta(nome: ToolName, input: Record<string, unknown>): Promise<unknown> {
    const usuarioId = input.usuarioId as string;

    try {
      switch (nome) {
        case "listar_obras":
          return await this.listarObras(usuarioId);
        case "buscar_credito":
          return await this.buscarCredito(usuarioId);
        case "listar_notificacoes":
          return await this.listarNotificacoes(usuarioId, input.apenasNaoLidas as boolean);
        case "resumo_usuario":
          return await this.resumoUsuario(usuarioId);
        default:
          return { erro: "Ferramenta desconhecida" };
      }
    } catch (err) {
      this.logger.error(`Erro ao executar ferramenta ${nome}`, err);
      return { erro: "Não foi possível obter os dados no momento." };
    }
  }

  private async listarObras(usuarioId: string) {
    const obras = await this.prisma.obra.findMany({
      where: { usuarioId },
      include: {
        etapas: { orderBy: { ordem: "asc" } },
      },
      orderBy: { criadoEm: "desc" },
      take: 10,
    });

    return obras.map((o) => ({
      id: o.obraId,
      nome: o.nome,
      endereco: o.endereco,
      status: o.status,
      areaM2: o.areaM2,
      etapas: o.etapas.map((e) => ({
        nome: e.nome,
        status: e.status,
        ordem: e.ordem,
        percentual: e.percentualObra,
      })),
    }));
  }

  private async buscarCredito(usuarioId: string) {
    const creditos = await this.prisma.credito.findMany({
      where: { usuarioId },
      include: {
        liberacoes: {
          orderBy: { criadoEm: "desc" },
          take: 5,
        },
      },
      orderBy: { criadoEm: "desc" },
    });

    return creditos.map((c) => ({
      id: c.creditoId,
      valorAprovado: Number(c.valorAprovado),
      valorLiberado: Number(c.valorLiberado),
      saldoDisponivel: Number(c.valorAprovado) - Number(c.valorLiberado),
      taxaMensal: Number(c.taxaMensal),
      prazoMeses: c.prazoMeses,
      status: c.status,
      liberacoes: c.liberacoes.map((l) => ({
        valor: Number(l.valor),
        status: l.status,
        data: l.processadoEm?.toISOString() ?? l.criadoEm.toISOString(),
      })),
    }));
  }

  private async listarNotificacoes(usuarioId: string, apenasNaoLidas = false) {
    const notificacoes = await this.prisma.notificacao.findMany({
      where: {
        usuarioId,
        ...(apenasNaoLidas ? { lida: false } : {}),
      },
      orderBy: { criadoEm: "desc" },
      take: 10,
    });

    return notificacoes.map((n) => ({
      titulo: n.titulo,
      mensagem: n.mensagem,
      tipo: n.tipo,
      lida: n.lida,
      data: n.criadoEm.toISOString(),
    }));
  }

  private async resumoUsuario(usuarioId: string) {
    const [usuario, totalObras, obrasAtivas, creditoAtivo] = await Promise.all([
      this.prisma.usuario.findUnique({
        where: { usuarioId },
        select: { nome: true, email: true },
      }),
      this.prisma.obra.count({ where: { usuarioId } }),
      this.prisma.obra.count({ where: { usuarioId, status: "EM_ANDAMENTO" } }),
      this.prisma.credito.findFirst({
        where: { usuarioId, status: "APROVADO" },
        orderBy: { criadoEm: "desc" },
      }),
    ]);

    return {
      nome: usuario?.nome,
      email: usuario?.email,
      totalObras,
      obrasAtivas,
      credito: creditoAtivo
        ? {
            valorAprovado: Number(creditoAtivo.valorAprovado),
            valorLiberado: Number(creditoAtivo.valorLiberado),
            saldoDisponivel: Number(creditoAtivo.valorAprovado) - Number(creditoAtivo.valorLiberado),
          }
        : null,
    };
  }
}
