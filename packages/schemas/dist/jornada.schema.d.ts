import { z } from "zod";
export declare const JornadaPassoIdEnum: z.ZodEnum<["kyc", "viabilidade", "obra", "credito", "aguardando", "acompanhar", "concluido", "gestor_kyc", "gestor_etapas", "gestor_ok"]>;
export declare const JornadaPerfilEnum: z.ZodEnum<["tomador", "gestor", "outro"]>;
export declare const JornadaResponseSchema: z.ZodObject<{
    perfil: z.ZodEnum<["tomador", "gestor", "outro"]>;
    passoAtual: z.ZodEnum<["kyc", "viabilidade", "obra", "credito", "aguardando", "acompanhar", "concluido", "gestor_kyc", "gestor_etapas", "gestor_ok"]>;
    titulo: z.ZodString;
    descricao: z.ZodString;
    href: z.ZodString;
    concluido: z.ZodBoolean;
    passosConcluidos: z.ZodNumber;
    totalPassos: z.ZodNumber;
    progressoPct: z.ZodNumber;
    bloqueado: z.ZodOptional<z.ZodString>;
    fila: z.ZodOptional<z.ZodObject<{
        kyc: z.ZodNumber;
        etapas: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        kyc: number;
        etapas: number;
    }, {
        kyc: number;
        etapas: number;
    }>>;
}, "strip", z.ZodTypeAny, {
    descricao: string;
    concluido: boolean;
    perfil: "gestor" | "tomador" | "outro";
    passoAtual: "obra" | "credito" | "kyc" | "viabilidade" | "aguardando" | "acompanhar" | "concluido" | "gestor_kyc" | "gestor_etapas" | "gestor_ok";
    titulo: string;
    href: string;
    passosConcluidos: number;
    totalPassos: number;
    progressoPct: number;
    bloqueado?: string | undefined;
    fila?: {
        kyc: number;
        etapas: number;
    } | undefined;
}, {
    descricao: string;
    concluido: boolean;
    perfil: "gestor" | "tomador" | "outro";
    passoAtual: "obra" | "credito" | "kyc" | "viabilidade" | "aguardando" | "acompanhar" | "concluido" | "gestor_kyc" | "gestor_etapas" | "gestor_ok";
    titulo: string;
    href: string;
    passosConcluidos: number;
    totalPassos: number;
    progressoPct: number;
    bloqueado?: string | undefined;
    fila?: {
        kyc: number;
        etapas: number;
    } | undefined;
}>;
export type JornadaPassoId = z.infer<typeof JornadaPassoIdEnum>;
export type JornadaPerfil = z.infer<typeof JornadaPerfilEnum>;
export type JornadaResponse = z.infer<typeof JornadaResponseSchema>;
