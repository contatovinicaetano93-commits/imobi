import { z } from "zod";
/** Passo guiado — 1 fonte de verdade pro que cada papel vê/faz agora. */
export declare const JornadaResponseSchema: z.ZodObject<{
    role: z.ZodEnum<["ADMIN", "CLIENTE", "FUNDO", "ENGENHEIRO"]>;
    etapaAtual: z.ZodOptional<z.ZodEnum<["KYC_PENDENTE", "DOSSIE_EM_ANALISE", "APROVADO", "OBRA_CADASTRADA", "HOMOLOGADA", "EM_ANDAMENTO", "QUITADO"]>>;
    titulo: z.ZodString;
    descricao: z.ZodString;
    href: z.ZodString;
    concluido: z.ZodBoolean;
    progressoPct: z.ZodNumber;
    bloqueado: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    role: "ADMIN" | "CLIENTE" | "FUNDO" | "ENGENHEIRO";
    descricao: string;
    titulo: string;
    href: string;
    concluido: boolean;
    progressoPct: number;
    etapaAtual?: "APROVADO" | "KYC_PENDENTE" | "DOSSIE_EM_ANALISE" | "OBRA_CADASTRADA" | "HOMOLOGADA" | "EM_ANDAMENTO" | "QUITADO" | undefined;
    bloqueado?: string | undefined;
}, {
    role: "ADMIN" | "CLIENTE" | "FUNDO" | "ENGENHEIRO";
    descricao: string;
    titulo: string;
    href: string;
    concluido: boolean;
    progressoPct: number;
    etapaAtual?: "APROVADO" | "KYC_PENDENTE" | "DOSSIE_EM_ANALISE" | "OBRA_CADASTRADA" | "HOMOLOGADA" | "EM_ANDAMENTO" | "QUITADO" | undefined;
    bloqueado?: string | undefined;
}>;
export type JornadaResponse = z.infer<typeof JornadaResponseSchema>;
