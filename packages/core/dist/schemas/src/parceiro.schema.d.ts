import { z } from "zod";
export declare const TipoParceiroEnum: z.ZodEnum<["CORRESPONDENTE", "IMOBILIARIA", "CONSTRUTORA", "INDEPENDENTE"]>;
export declare const CadastroParceiroSchema: z.ZodObject<{
    nome: z.ZodString;
    cpf: z.ZodString;
    email: z.ZodString;
    telefone: z.ZodString;
    tipo: z.ZodEnum<["CORRESPONDENTE", "IMOBILIARIA", "CONSTRUTORA", "INDEPENDENTE"]>;
    cnpj: z.ZodOptional<z.ZodString>;
    nomeEmpresa: z.ZodOptional<z.ZodString>;
    creciNumero: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    nome: string;
    cpf: string;
    email: string;
    telefone: string;
    tipo: "CORRESPONDENTE" | "IMOBILIARIA" | "CONSTRUTORA" | "INDEPENDENTE";
    cnpj?: string | undefined;
    nomeEmpresa?: string | undefined;
    creciNumero?: string | undefined;
}, {
    nome: string;
    cpf: string;
    email: string;
    telefone: string;
    tipo: "CORRESPONDENTE" | "IMOBILIARIA" | "CONSTRUTORA" | "INDEPENDENTE";
    cnpj?: string | undefined;
    nomeEmpresa?: string | undefined;
    creciNumero?: string | undefined;
}>;
export declare const UpdateParceiroSchema: z.ZodObject<{
    nome: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    telefone: z.ZodOptional<z.ZodString>;
    tipo: z.ZodOptional<z.ZodEnum<["CORRESPONDENTE", "IMOBILIARIA", "CONSTRUTORA", "INDEPENDENTE"]>>;
    cnpj: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    nomeEmpresa: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    creciNumero: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    nome?: string | undefined;
    email?: string | undefined;
    telefone?: string | undefined;
    tipo?: "CORRESPONDENTE" | "IMOBILIARIA" | "CONSTRUTORA" | "INDEPENDENTE" | undefined;
    cnpj?: string | undefined;
    nomeEmpresa?: string | undefined;
    creciNumero?: string | undefined;
}, {
    nome?: string | undefined;
    email?: string | undefined;
    telefone?: string | undefined;
    tipo?: "CORRESPONDENTE" | "IMOBILIARIA" | "CONSTRUTORA" | "INDEPENDENTE" | undefined;
    cnpj?: string | undefined;
    nomeEmpresa?: string | undefined;
    creciNumero?: string | undefined;
}>;
export declare const FiltroParceiroSchema: z.ZodObject<{
    tipo: z.ZodOptional<z.ZodEnum<["CORRESPONDENTE", "IMOBILIARIA", "CONSTRUTORA", "INDEPENDENTE"]>>;
    ativo: z.ZodOptional<z.ZodBoolean>;
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    tipo?: "CORRESPONDENTE" | "IMOBILIARIA" | "CONSTRUTORA" | "INDEPENDENTE" | undefined;
    ativo?: boolean | undefined;
}, {
    tipo?: "CORRESPONDENTE" | "IMOBILIARIA" | "CONSTRUTORA" | "INDEPENDENTE" | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    ativo?: boolean | undefined;
}>;
export type TipoParceiro = z.infer<typeof TipoParceiroEnum>;
export type CadastroParceiroInput = z.infer<typeof CadastroParceiroSchema>;
export type UpdateParceiroInput = z.infer<typeof UpdateParceiroSchema>;
export type FiltroParceiroInput = z.infer<typeof FiltroParceiroSchema>;
