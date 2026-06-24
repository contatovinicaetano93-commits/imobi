import { z } from "zod";
export declare const EstagioObraDossieEnum: z.ZodEnum<["NOVO", "EM_ANDAMENTO", "ENTRADA_TARDIA"]>;
export declare const DossieStatusEnum: z.ZodEnum<["RASCUNHO", "ENVIADO", "EM_ANALISE", "APROVADO", "REPROVADO"]>;
export declare const DossieChecklistItemStatusEnum: z.ZodEnum<["PENDENTE", "ENVIADO", "APROVADO", "REPROVADO", "NA"]>;
export declare const CriarDossieSchema: z.ZodObject<{
    estagioObra: z.ZodEnum<["NOVO", "EM_ANDAMENTO", "ENTRADA_TARDIA"]>;
    nomeEmpreendimento: z.ZodString;
    percentualFisico: z.ZodOptional<z.ZodNumber>;
    dataBase: z.ZodOptional<z.ZodDate>;
    obraId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    estagioObra: "NOVO" | "EM_ANDAMENTO" | "ENTRADA_TARDIA";
    nomeEmpreendimento: string;
    obraId?: string | undefined;
    percentualFisico?: number | undefined;
    dataBase?: Date | undefined;
}, {
    estagioObra: "NOVO" | "EM_ANDAMENTO" | "ENTRADA_TARDIA";
    nomeEmpreendimento: string;
    obraId?: string | undefined;
    percentualFisico?: number | undefined;
    dataBase?: Date | undefined;
}>;
export declare const AtualizarDossieChecklistItemSchema: z.ZodObject<{
    itemId: z.ZodString;
    status: z.ZodOptional<z.ZodEnum<["PENDENTE", "ENVIADO", "APROVADO", "REPROVADO", "NA"]>>;
    documentoId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    observacao: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    itemId: string;
    status?: "ENVIADO" | "APROVADO" | "REPROVADO" | "PENDENTE" | "NA" | undefined;
    documentoId?: string | null | undefined;
    observacao?: string | null | undefined;
}, {
    itemId: string;
    status?: "ENVIADO" | "APROVADO" | "REPROVADO" | "PENDENTE" | "NA" | undefined;
    documentoId?: string | null | undefined;
    observacao?: string | null | undefined;
}>;
export declare const AtualizarDossieSchema: z.ZodEffects<z.ZodObject<{
    nomeEmpreendimento: z.ZodOptional<z.ZodString>;
    tipologia: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    endereco: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    cidade: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    uf: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    totalUnidades: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    areaTotal: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    dataEntregaPrevista: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
    nomeIncorporadora: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    cnpjIncorporadora: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    modeloAmortizacao: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    totalCarteira: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    totalAReceber: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    estruturaSocietaria: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    percentualFisico: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    dataBase: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
    obraId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    ficha: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    checklistItens: z.ZodOptional<z.ZodArray<z.ZodObject<{
        itemId: z.ZodString;
        status: z.ZodOptional<z.ZodEnum<["PENDENTE", "ENVIADO", "APROVADO", "REPROVADO", "NA"]>>;
        documentoId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        observacao: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        itemId: string;
        status?: "ENVIADO" | "APROVADO" | "REPROVADO" | "PENDENTE" | "NA" | undefined;
        documentoId?: string | null | undefined;
        observacao?: string | null | undefined;
    }, {
        itemId: string;
        status?: "ENVIADO" | "APROVADO" | "REPROVADO" | "PENDENTE" | "NA" | undefined;
        documentoId?: string | null | undefined;
        observacao?: string | null | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    obraId?: string | null | undefined;
    nomeEmpreendimento?: string | undefined;
    percentualFisico?: number | null | undefined;
    dataBase?: Date | null | undefined;
    tipologia?: string | null | undefined;
    endereco?: string | null | undefined;
    cidade?: string | null | undefined;
    uf?: string | null | undefined;
    totalUnidades?: number | null | undefined;
    areaTotal?: number | null | undefined;
    dataEntregaPrevista?: Date | null | undefined;
    nomeIncorporadora?: string | null | undefined;
    cnpjIncorporadora?: string | null | undefined;
    modeloAmortizacao?: string | null | undefined;
    totalCarteira?: number | null | undefined;
    totalAReceber?: number | null | undefined;
    estruturaSocietaria?: string | null | undefined;
    ficha?: Record<string, unknown> | undefined;
    checklistItens?: {
        itemId: string;
        status?: "ENVIADO" | "APROVADO" | "REPROVADO" | "PENDENTE" | "NA" | undefined;
        documentoId?: string | null | undefined;
        observacao?: string | null | undefined;
    }[] | undefined;
}, {
    obraId?: string | null | undefined;
    nomeEmpreendimento?: string | undefined;
    percentualFisico?: number | null | undefined;
    dataBase?: Date | null | undefined;
    tipologia?: string | null | undefined;
    endereco?: string | null | undefined;
    cidade?: string | null | undefined;
    uf?: string | null | undefined;
    totalUnidades?: number | null | undefined;
    areaTotal?: number | null | undefined;
    dataEntregaPrevista?: Date | null | undefined;
    nomeIncorporadora?: string | null | undefined;
    cnpjIncorporadora?: string | null | undefined;
    modeloAmortizacao?: string | null | undefined;
    totalCarteira?: number | null | undefined;
    totalAReceber?: number | null | undefined;
    estruturaSocietaria?: string | null | undefined;
    ficha?: Record<string, unknown> | undefined;
    checklistItens?: {
        itemId: string;
        status?: "ENVIADO" | "APROVADO" | "REPROVADO" | "PENDENTE" | "NA" | undefined;
        documentoId?: string | null | undefined;
        observacao?: string | null | undefined;
    }[] | undefined;
}>, {
    obraId?: string | null | undefined;
    nomeEmpreendimento?: string | undefined;
    percentualFisico?: number | null | undefined;
    dataBase?: Date | null | undefined;
    tipologia?: string | null | undefined;
    endereco?: string | null | undefined;
    cidade?: string | null | undefined;
    uf?: string | null | undefined;
    totalUnidades?: number | null | undefined;
    areaTotal?: number | null | undefined;
    dataEntregaPrevista?: Date | null | undefined;
    nomeIncorporadora?: string | null | undefined;
    cnpjIncorporadora?: string | null | undefined;
    modeloAmortizacao?: string | null | undefined;
    totalCarteira?: number | null | undefined;
    totalAReceber?: number | null | undefined;
    estruturaSocietaria?: string | null | undefined;
    ficha?: Record<string, unknown> | undefined;
    checklistItens?: {
        itemId: string;
        status?: "ENVIADO" | "APROVADO" | "REPROVADO" | "PENDENTE" | "NA" | undefined;
        documentoId?: string | null | undefined;
        observacao?: string | null | undefined;
    }[] | undefined;
}, {
    obraId?: string | null | undefined;
    nomeEmpreendimento?: string | undefined;
    percentualFisico?: number | null | undefined;
    dataBase?: Date | null | undefined;
    tipologia?: string | null | undefined;
    endereco?: string | null | undefined;
    cidade?: string | null | undefined;
    uf?: string | null | undefined;
    totalUnidades?: number | null | undefined;
    areaTotal?: number | null | undefined;
    dataEntregaPrevista?: Date | null | undefined;
    nomeIncorporadora?: string | null | undefined;
    cnpjIncorporadora?: string | null | undefined;
    modeloAmortizacao?: string | null | undefined;
    totalCarteira?: number | null | undefined;
    totalAReceber?: number | null | undefined;
    estruturaSocietaria?: string | null | undefined;
    ficha?: Record<string, unknown> | undefined;
    checklistItens?: {
        itemId: string;
        status?: "ENVIADO" | "APROVADO" | "REPROVADO" | "PENDENTE" | "NA" | undefined;
        documentoId?: string | null | undefined;
        observacao?: string | null | undefined;
    }[] | undefined;
}>;
export declare const AtualizarDossieStatusSchema: z.ZodObject<{
    status: z.ZodEnum<["RASCUNHO", "ENVIADO", "EM_ANALISE", "APROVADO", "REPROVADO"]>;
    observacaoAdmin: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "RASCUNHO" | "ENVIADO" | "EM_ANALISE" | "APROVADO" | "REPROVADO";
    observacaoAdmin?: string | undefined;
}, {
    status: "RASCUNHO" | "ENVIADO" | "EM_ANALISE" | "APROVADO" | "REPROVADO";
    observacaoAdmin?: string | undefined;
}>;
export declare const ChecklistTemplateQuerySchema: z.ZodObject<{
    estagio: z.ZodEnum<["NOVO", "EM_ANDAMENTO", "ENTRADA_TARDIA"]>;
}, "strip", z.ZodTypeAny, {
    estagio: "NOVO" | "EM_ANDAMENTO" | "ENTRADA_TARDIA";
}, {
    estagio: "NOVO" | "EM_ANDAMENTO" | "ENTRADA_TARDIA";
}>;
export type EstagioObraDossie = z.infer<typeof EstagioObraDossieEnum>;
export type DossieStatus = z.infer<typeof DossieStatusEnum>;
export type DossieChecklistItemStatus = z.infer<typeof DossieChecklistItemStatusEnum>;
export type CriarDossieInput = z.infer<typeof CriarDossieSchema>;
export type AtualizarDossieInput = z.infer<typeof AtualizarDossieSchema>;
export type AtualizarDossieStatusInput = z.infer<typeof AtualizarDossieStatusSchema>;
export type ChecklistTemplateQuery = z.infer<typeof ChecklistTemplateQuerySchema>;
