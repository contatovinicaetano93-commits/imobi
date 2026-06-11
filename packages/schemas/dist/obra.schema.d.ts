import { z } from "zod";
export declare const StatusObraEnum: z.ZodEnum<["PLANEJAMENTO", "EM_EXECUCAO", "PAUSADA", "CONCLUIDA", "CANCELADA"]>;
export declare const StatusEtapaEnum: z.ZodEnum<["PLANEJADA", "EM_EXECUCAO", "AGUARDANDO_VISTORIA", "REPROVADA", "CONCLUIDA"]>;
export declare const EnderecoSchema: z.ZodObject<{
    logradouro: z.ZodString;
    numero: z.ZodString;
    complemento: z.ZodOptional<z.ZodString>;
    bairro: z.ZodString;
    cidade: z.ZodString;
    uf: z.ZodString;
    cep: z.ZodString;
}, "strip", z.ZodTypeAny, {
    cidade: string;
    uf: string;
    logradouro: string;
    numero: string;
    bairro: string;
    cep: string;
    complemento?: string | undefined;
}, {
    cidade: string;
    uf: string;
    logradouro: string;
    numero: string;
    bairro: string;
    cep: string;
    complemento?: string | undefined;
}>;
export declare const GeolocalizacaoSchema: z.ZodObject<{
    latitude: z.ZodNumber;
    longitude: z.ZodNumber;
    raioValidacaoMetros: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    latitude: number;
    longitude: number;
    raioValidacaoMetros: number;
}, {
    latitude: number;
    longitude: number;
    raioValidacaoMetros?: number | undefined;
}>;
export declare const CriarObraSchema: z.ZodObject<{
    nome: z.ZodString;
    endereco: z.ZodObject<{
        logradouro: z.ZodString;
        numero: z.ZodString;
        complemento: z.ZodOptional<z.ZodString>;
        bairro: z.ZodString;
        cidade: z.ZodString;
        uf: z.ZodString;
        cep: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        cidade: string;
        uf: string;
        logradouro: string;
        numero: string;
        bairro: string;
        cep: string;
        complemento?: string | undefined;
    }, {
        cidade: string;
        uf: string;
        logradouro: string;
        numero: string;
        bairro: string;
        cep: string;
        complemento?: string | undefined;
    }>;
    geo: z.ZodObject<{
        latitude: z.ZodNumber;
        longitude: z.ZodNumber;
        raioValidacaoMetros: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        latitude: number;
        longitude: number;
        raioValidacaoMetros: number;
    }, {
        latitude: number;
        longitude: number;
        raioValidacaoMetros?: number | undefined;
    }>;
    areaM2: z.ZodNumber;
    datainicioISO: z.ZodOptional<z.ZodString>;
    dataConclusaoPrevistaISO: z.ZodString;
    creditoId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    nome: string;
    endereco: {
        cidade: string;
        uf: string;
        logradouro: string;
        numero: string;
        bairro: string;
        cep: string;
        complemento?: string | undefined;
    };
    geo: {
        latitude: number;
        longitude: number;
        raioValidacaoMetros: number;
    };
    areaM2: number;
    dataConclusaoPrevistaISO: string;
    creditoId?: string | undefined;
    datainicioISO?: string | undefined;
}, {
    nome: string;
    endereco: {
        cidade: string;
        uf: string;
        logradouro: string;
        numero: string;
        bairro: string;
        cep: string;
        complemento?: string | undefined;
    };
    geo: {
        latitude: number;
        longitude: number;
        raioValidacaoMetros?: number | undefined;
    };
    areaM2: number;
    dataConclusaoPrevistaISO: string;
    creditoId?: string | undefined;
    datainicioISO?: string | undefined;
}>;
export declare const CriarEtapaSchema: z.ZodObject<{
    obraId: z.ZodString;
    nome: z.ZodString;
    descricao: z.ZodOptional<z.ZodString>;
    ordem: z.ZodNumber;
    percentualObra: z.ZodNumber;
    dataInicio: z.ZodOptional<z.ZodString>;
    dataConclusaoPrevista: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    nome: string;
    obraId: string;
    ordem: number;
    percentualObra: number;
    descricao?: string | undefined;
    dataInicio?: string | undefined;
    dataConclusaoPrevista?: string | undefined;
}, {
    nome: string;
    obraId: string;
    ordem: number;
    percentualObra: number;
    descricao?: string | undefined;
    dataInicio?: string | undefined;
    dataConclusaoPrevista?: string | undefined;
}>;
export declare const EtapasPadraoEnum: z.ZodEnum<["FUNDACAO", "ESTRUTURA", "ALVENARIA", "COBERTURA", "INSTALACOES_ELETRICAS", "INSTALACOES_HIDRAULICAS", "REVESTIMENTO", "ACABAMENTO", "ENTREGA"]>;
export type StatusObra = z.infer<typeof StatusObraEnum>;
export type StatusEtapa = z.infer<typeof StatusEtapaEnum>;
export type EnderecoInput = z.infer<typeof EnderecoSchema>;
export type GeolocalizacaoInput = z.infer<typeof GeolocalizacaoSchema>;
export type CriarObraInput = z.infer<typeof CriarObraSchema>;
export type CriarEtapaInput = z.infer<typeof CriarEtapaSchema>;
export type EtapaPadrao = z.infer<typeof EtapasPadraoEnum>;
