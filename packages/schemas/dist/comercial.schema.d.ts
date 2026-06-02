import { z } from "zod";
export declare const FonteEnum: z.ZodEnum<["PARCEIRO", "INDICACAO", "WEBSITE", "OFFLINE"]>;
export declare const SegmentoClienteEnum: z.ZodEnum<["NOVO", "RETORNO", "CONCORRENTE"]>;
export declare const TipoObraEnum: z.ZodEnum<["residencial", "comercial", "industrial", "reforma"]>;
export declare const LeadActivityTypeEnum: z.ZodEnum<["CALL", "EMAIL", "MEETING", "PROPOSAL", "VISIT", "FOLLOW_UP", "NOTE"]>;
export declare const CreateLeadSchema: z.ZodObject<{
    clienteNome: z.ZodString;
    clienteEmail: z.ZodString;
    clienteTelefone: z.ZodString;
    clienteCpf: z.ZodOptional<z.ZodString>;
    fonte: z.ZodEnum<["PARCEIRO", "INDICACAO", "WEBSITE", "OFFLINE"]>;
    tipoObra: z.ZodEnum<["residencial", "comercial", "industrial", "reforma"]>;
    segmentoCliente: z.ZodEnum<["NOVO", "RETORNO", "CONCORRENTE"]>;
}, "strip", z.ZodTypeAny, {
    clienteNome: string;
    clienteEmail: string;
    clienteTelefone: string;
    fonte: "PARCEIRO" | "INDICACAO" | "WEBSITE" | "OFFLINE";
    tipoObra: "residencial" | "comercial" | "industrial" | "reforma";
    segmentoCliente: "NOVO" | "RETORNO" | "CONCORRENTE";
    clienteCpf?: string | undefined;
}, {
    clienteNome: string;
    clienteEmail: string;
    clienteTelefone: string;
    fonte: "PARCEIRO" | "INDICACAO" | "WEBSITE" | "OFFLINE";
    tipoObra: "residencial" | "comercial" | "industrial" | "reforma";
    segmentoCliente: "NOVO" | "RETORNO" | "CONCORRENTE";
    clienteCpf?: string | undefined;
}>;
export declare const LeadActivitySchema: z.ZodObject<{
    leadActivityId: z.ZodString;
    leadId: z.ZodString;
    usuarioId: z.ZodString;
    tipo: z.ZodEnum<["CALL", "EMAIL", "MEETING", "PROPOSAL", "VISIT", "FOLLOW_UP", "NOTE"]>;
    descricao: z.ZodString;
    criadoEm: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    leadActivityId: string;
    leadId: string;
    usuarioId: string;
    tipo: "CALL" | "EMAIL" | "MEETING" | "PROPOSAL" | "VISIT" | "FOLLOW_UP" | "NOTE";
    descricao: string;
    criadoEm: Date;
}, {
    leadActivityId: string;
    leadId: string;
    usuarioId: string;
    tipo: "CALL" | "EMAIL" | "MEETING" | "PROPOSAL" | "VISIT" | "FOLLOW_UP" | "NOTE";
    descricao: string;
    criadoEm: Date;
}>;
export declare const ConversionScoreSchema: z.ZodObject<{
    scoreId: z.ZodString;
    leadId: z.ZodString;
    scoreFinal: z.ZodNumber;
    probabilidadeClosing: z.ZodNumber;
    dataEstimadaClosing: z.ZodDate;
    fonteScore: z.ZodNumber;
    tipoObraScore: z.ZodNumber;
    segmentoScore: z.ZodNumber;
    engajamentoScore: z.ZodNumber;
    historicoScore: z.ZodNumber;
    criadoEm: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    leadId: string;
    criadoEm: Date;
    scoreId: string;
    scoreFinal: number;
    probabilidadeClosing: number;
    dataEstimadaClosing: Date;
    fonteScore: number;
    tipoObraScore: number;
    segmentoScore: number;
    engajamentoScore: number;
    historicoScore: number;
}, {
    leadId: string;
    criadoEm: Date;
    scoreId: string;
    scoreFinal: number;
    probabilidadeClosing: number;
    dataEstimadaClosing: Date;
    fonteScore: number;
    tipoObraScore: number;
    segmentoScore: number;
    engajamentoScore: number;
    historicoScore: number;
}>;
export declare const LeadSchema: z.ZodObject<{
    leadId: z.ZodString;
    clienteNome: z.ZodString;
    clienteEmail: z.ZodString;
    clienteTelefone: z.ZodString;
    clienteCpf: z.ZodOptional<z.ZodString>;
    fonte: z.ZodEnum<["PARCEIRO", "INDICACAO", "WEBSITE", "OFFLINE"]>;
    tipoObra: z.ZodEnum<["residencial", "comercial", "industrial", "reforma"]>;
    segmentoCliente: z.ZodEnum<["NOVO", "RETORNO", "CONCORRENTE"]>;
    stageId: z.ZodString;
    criadoEm: z.ZodDate;
    atualizadoEm: z.ZodDate;
    scoreHistorico: z.ZodOptional<z.ZodArray<z.ZodObject<{
        scoreId: z.ZodString;
        leadId: z.ZodString;
        scoreFinal: z.ZodNumber;
        probabilidadeClosing: z.ZodNumber;
        dataEstimadaClosing: z.ZodDate;
        fonteScore: z.ZodNumber;
        tipoObraScore: z.ZodNumber;
        segmentoScore: z.ZodNumber;
        engajamentoScore: z.ZodNumber;
        historicoScore: z.ZodNumber;
        criadoEm: z.ZodDate;
    }, "strip", z.ZodTypeAny, {
        leadId: string;
        criadoEm: Date;
        scoreId: string;
        scoreFinal: number;
        probabilidadeClosing: number;
        dataEstimadaClosing: Date;
        fonteScore: number;
        tipoObraScore: number;
        segmentoScore: number;
        engajamentoScore: number;
        historicoScore: number;
    }, {
        leadId: string;
        criadoEm: Date;
        scoreId: string;
        scoreFinal: number;
        probabilidadeClosing: number;
        dataEstimadaClosing: Date;
        fonteScore: number;
        tipoObraScore: number;
        segmentoScore: number;
        engajamentoScore: number;
        historicoScore: number;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    clienteNome: string;
    clienteEmail: string;
    clienteTelefone: string;
    fonte: "PARCEIRO" | "INDICACAO" | "WEBSITE" | "OFFLINE";
    tipoObra: "residencial" | "comercial" | "industrial" | "reforma";
    segmentoCliente: "NOVO" | "RETORNO" | "CONCORRENTE";
    leadId: string;
    criadoEm: Date;
    stageId: string;
    atualizadoEm: Date;
    clienteCpf?: string | undefined;
    scoreHistorico?: {
        leadId: string;
        criadoEm: Date;
        scoreId: string;
        scoreFinal: number;
        probabilidadeClosing: number;
        dataEstimadaClosing: Date;
        fonteScore: number;
        tipoObraScore: number;
        segmentoScore: number;
        engajamentoScore: number;
        historicoScore: number;
    }[] | undefined;
}, {
    clienteNome: string;
    clienteEmail: string;
    clienteTelefone: string;
    fonte: "PARCEIRO" | "INDICACAO" | "WEBSITE" | "OFFLINE";
    tipoObra: "residencial" | "comercial" | "industrial" | "reforma";
    segmentoCliente: "NOVO" | "RETORNO" | "CONCORRENTE";
    leadId: string;
    criadoEm: Date;
    stageId: string;
    atualizadoEm: Date;
    clienteCpf?: string | undefined;
    scoreHistorico?: {
        leadId: string;
        criadoEm: Date;
        scoreId: string;
        scoreFinal: number;
        probabilidadeClosing: number;
        dataEstimadaClosing: Date;
        fonteScore: number;
        tipoObraScore: number;
        segmentoScore: number;
        engajamentoScore: number;
        historicoScore: number;
    }[] | undefined;
}>;
export declare const LeadDetailSchema: z.ZodObject<{
    leadId: z.ZodString;
    clienteNome: z.ZodString;
    clienteEmail: z.ZodString;
    clienteTelefone: z.ZodString;
    clienteCpf: z.ZodOptional<z.ZodString>;
    fonte: z.ZodEnum<["PARCEIRO", "INDICACAO", "WEBSITE", "OFFLINE"]>;
    tipoObra: z.ZodEnum<["residencial", "comercial", "industrial", "reforma"]>;
    segmentoCliente: z.ZodEnum<["NOVO", "RETORNO", "CONCORRENTE"]>;
    stageId: z.ZodString;
    criadoEm: z.ZodDate;
    atualizadoEm: z.ZodDate;
    scoreHistorico: z.ZodOptional<z.ZodArray<z.ZodObject<{
        scoreId: z.ZodString;
        leadId: z.ZodString;
        scoreFinal: z.ZodNumber;
        probabilidadeClosing: z.ZodNumber;
        dataEstimadaClosing: z.ZodDate;
        fonteScore: z.ZodNumber;
        tipoObraScore: z.ZodNumber;
        segmentoScore: z.ZodNumber;
        engajamentoScore: z.ZodNumber;
        historicoScore: z.ZodNumber;
        criadoEm: z.ZodDate;
    }, "strip", z.ZodTypeAny, {
        leadId: string;
        criadoEm: Date;
        scoreId: string;
        scoreFinal: number;
        probabilidadeClosing: number;
        dataEstimadaClosing: Date;
        fonteScore: number;
        tipoObraScore: number;
        segmentoScore: number;
        engajamentoScore: number;
        historicoScore: number;
    }, {
        leadId: string;
        criadoEm: Date;
        scoreId: string;
        scoreFinal: number;
        probabilidadeClosing: number;
        dataEstimadaClosing: Date;
        fonteScore: number;
        tipoObraScore: number;
        segmentoScore: number;
        engajamentoScore: number;
        historicoScore: number;
    }>, "many">>;
} & {
    stage: z.ZodOptional<z.ZodObject<{
        stageId: z.ZodString;
        nome: z.ZodString;
        pipelineId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        stageId: string;
        nome: string;
        pipelineId: string;
    }, {
        stageId: string;
        nome: string;
        pipelineId: string;
    }>>;
    atividades: z.ZodOptional<z.ZodArray<z.ZodObject<{
        leadActivityId: z.ZodString;
        leadId: z.ZodString;
        usuarioId: z.ZodString;
        tipo: z.ZodEnum<["CALL", "EMAIL", "MEETING", "PROPOSAL", "VISIT", "FOLLOW_UP", "NOTE"]>;
        descricao: z.ZodString;
        criadoEm: z.ZodDate;
    }, "strip", z.ZodTypeAny, {
        leadActivityId: string;
        leadId: string;
        usuarioId: string;
        tipo: "CALL" | "EMAIL" | "MEETING" | "PROPOSAL" | "VISIT" | "FOLLOW_UP" | "NOTE";
        descricao: string;
        criadoEm: Date;
    }, {
        leadActivityId: string;
        leadId: string;
        usuarioId: string;
        tipo: "CALL" | "EMAIL" | "MEETING" | "PROPOSAL" | "VISIT" | "FOLLOW_UP" | "NOTE";
        descricao: string;
        criadoEm: Date;
    }>, "many">>;
    scoreBreakdown: z.ZodOptional<z.ZodObject<{
        scoreId: z.ZodString;
        leadId: z.ZodString;
        scoreFinal: z.ZodNumber;
        probabilidadeClosing: z.ZodNumber;
        dataEstimadaClosing: z.ZodDate;
        fonteScore: z.ZodNumber;
        tipoObraScore: z.ZodNumber;
        segmentoScore: z.ZodNumber;
        engajamentoScore: z.ZodNumber;
        historicoScore: z.ZodNumber;
        criadoEm: z.ZodDate;
    }, "strip", z.ZodTypeAny, {
        leadId: string;
        criadoEm: Date;
        scoreId: string;
        scoreFinal: number;
        probabilidadeClosing: number;
        dataEstimadaClosing: Date;
        fonteScore: number;
        tipoObraScore: number;
        segmentoScore: number;
        engajamentoScore: number;
        historicoScore: number;
    }, {
        leadId: string;
        criadoEm: Date;
        scoreId: string;
        scoreFinal: number;
        probabilidadeClosing: number;
        dataEstimadaClosing: Date;
        fonteScore: number;
        tipoObraScore: number;
        segmentoScore: number;
        engajamentoScore: number;
        historicoScore: number;
    }>>;
    obra: z.ZodOptional<z.ZodObject<{
        obraId: z.ZodString;
        nome: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        nome: string;
        obraId: string;
    }, {
        nome: string;
        obraId: string;
    }>>;
    usuario: z.ZodOptional<z.ZodObject<{
        usuarioId: z.ZodString;
        nome: z.ZodString;
        email: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        usuarioId: string;
        nome: string;
        email: string;
    }, {
        usuarioId: string;
        nome: string;
        email: string;
    }>>;
    proximoAcompanhamento: z.ZodOptional<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    clienteNome: string;
    clienteEmail: string;
    clienteTelefone: string;
    fonte: "PARCEIRO" | "INDICACAO" | "WEBSITE" | "OFFLINE";
    tipoObra: "residencial" | "comercial" | "industrial" | "reforma";
    segmentoCliente: "NOVO" | "RETORNO" | "CONCORRENTE";
    leadId: string;
    criadoEm: Date;
    stageId: string;
    atualizadoEm: Date;
    clienteCpf?: string | undefined;
    scoreHistorico?: {
        leadId: string;
        criadoEm: Date;
        scoreId: string;
        scoreFinal: number;
        probabilidadeClosing: number;
        dataEstimadaClosing: Date;
        fonteScore: number;
        tipoObraScore: number;
        segmentoScore: number;
        engajamentoScore: number;
        historicoScore: number;
    }[] | undefined;
    stage?: {
        stageId: string;
        nome: string;
        pipelineId: string;
    } | undefined;
    atividades?: {
        leadActivityId: string;
        leadId: string;
        usuarioId: string;
        tipo: "CALL" | "EMAIL" | "MEETING" | "PROPOSAL" | "VISIT" | "FOLLOW_UP" | "NOTE";
        descricao: string;
        criadoEm: Date;
    }[] | undefined;
    scoreBreakdown?: {
        leadId: string;
        criadoEm: Date;
        scoreId: string;
        scoreFinal: number;
        probabilidadeClosing: number;
        dataEstimadaClosing: Date;
        fonteScore: number;
        tipoObraScore: number;
        segmentoScore: number;
        engajamentoScore: number;
        historicoScore: number;
    } | undefined;
    obra?: {
        nome: string;
        obraId: string;
    } | undefined;
    usuario?: {
        usuarioId: string;
        nome: string;
        email: string;
    } | undefined;
    proximoAcompanhamento?: Date | undefined;
}, {
    clienteNome: string;
    clienteEmail: string;
    clienteTelefone: string;
    fonte: "PARCEIRO" | "INDICACAO" | "WEBSITE" | "OFFLINE";
    tipoObra: "residencial" | "comercial" | "industrial" | "reforma";
    segmentoCliente: "NOVO" | "RETORNO" | "CONCORRENTE";
    leadId: string;
    criadoEm: Date;
    stageId: string;
    atualizadoEm: Date;
    clienteCpf?: string | undefined;
    scoreHistorico?: {
        leadId: string;
        criadoEm: Date;
        scoreId: string;
        scoreFinal: number;
        probabilidadeClosing: number;
        dataEstimadaClosing: Date;
        fonteScore: number;
        tipoObraScore: number;
        segmentoScore: number;
        engajamentoScore: number;
        historicoScore: number;
    }[] | undefined;
    stage?: {
        stageId: string;
        nome: string;
        pipelineId: string;
    } | undefined;
    atividades?: {
        leadActivityId: string;
        leadId: string;
        usuarioId: string;
        tipo: "CALL" | "EMAIL" | "MEETING" | "PROPOSAL" | "VISIT" | "FOLLOW_UP" | "NOTE";
        descricao: string;
        criadoEm: Date;
    }[] | undefined;
    scoreBreakdown?: {
        leadId: string;
        criadoEm: Date;
        scoreId: string;
        scoreFinal: number;
        probabilidadeClosing: number;
        dataEstimadaClosing: Date;
        fonteScore: number;
        tipoObraScore: number;
        segmentoScore: number;
        engajamentoScore: number;
        historicoScore: number;
    } | undefined;
    obra?: {
        nome: string;
        obraId: string;
    } | undefined;
    usuario?: {
        usuarioId: string;
        nome: string;
        email: string;
    } | undefined;
    proximoAcompanhamento?: Date | undefined;
}>;
export declare const AddLeadActivitySchema: z.ZodObject<{
    tipo: z.ZodEnum<["CALL", "EMAIL", "MEETING", "PROPOSAL", "VISIT", "FOLLOW_UP", "NOTE"]>;
    descricao: z.ZodString;
}, "strip", z.ZodTypeAny, {
    tipo: "CALL" | "EMAIL" | "MEETING" | "PROPOSAL" | "VISIT" | "FOLLOW_UP" | "NOTE";
    descricao: string;
}, {
    tipo: "CALL" | "EMAIL" | "MEETING" | "PROPOSAL" | "VISIT" | "FOLLOW_UP" | "NOTE";
    descricao: string;
}>;
export declare const DashboardStatsSchema: z.ZodObject<{
    totalLeads: z.ZodNumber;
    leadsThisWeek: z.ZodNumber;
    avgScore: z.ZodNumber;
    conversionRate: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    totalLeads: number;
    leadsThisWeek: number;
    avgScore: number;
    conversionRate: number;
}, {
    totalLeads: number;
    leadsThisWeek: number;
    avgScore: number;
    conversionRate: number;
}>;
export declare const LeadsListResponseSchema: z.ZodObject<{
    leads: z.ZodArray<z.ZodObject<{
        leadId: z.ZodString;
        clienteNome: z.ZodString;
        clienteEmail: z.ZodString;
        clienteTelefone: z.ZodString;
        clienteCpf: z.ZodOptional<z.ZodString>;
        fonte: z.ZodEnum<["PARCEIRO", "INDICACAO", "WEBSITE", "OFFLINE"]>;
        tipoObra: z.ZodEnum<["residencial", "comercial", "industrial", "reforma"]>;
        segmentoCliente: z.ZodEnum<["NOVO", "RETORNO", "CONCORRENTE"]>;
        stageId: z.ZodString;
        criadoEm: z.ZodDate;
        atualizadoEm: z.ZodDate;
        scoreHistorico: z.ZodOptional<z.ZodArray<z.ZodObject<{
            scoreId: z.ZodString;
            leadId: z.ZodString;
            scoreFinal: z.ZodNumber;
            probabilidadeClosing: z.ZodNumber;
            dataEstimadaClosing: z.ZodDate;
            fonteScore: z.ZodNumber;
            tipoObraScore: z.ZodNumber;
            segmentoScore: z.ZodNumber;
            engajamentoScore: z.ZodNumber;
            historicoScore: z.ZodNumber;
            criadoEm: z.ZodDate;
        }, "strip", z.ZodTypeAny, {
            leadId: string;
            criadoEm: Date;
            scoreId: string;
            scoreFinal: number;
            probabilidadeClosing: number;
            dataEstimadaClosing: Date;
            fonteScore: number;
            tipoObraScore: number;
            segmentoScore: number;
            engajamentoScore: number;
            historicoScore: number;
        }, {
            leadId: string;
            criadoEm: Date;
            scoreId: string;
            scoreFinal: number;
            probabilidadeClosing: number;
            dataEstimadaClosing: Date;
            fonteScore: number;
            tipoObraScore: number;
            segmentoScore: number;
            engajamentoScore: number;
            historicoScore: number;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        clienteNome: string;
        clienteEmail: string;
        clienteTelefone: string;
        fonte: "PARCEIRO" | "INDICACAO" | "WEBSITE" | "OFFLINE";
        tipoObra: "residencial" | "comercial" | "industrial" | "reforma";
        segmentoCliente: "NOVO" | "RETORNO" | "CONCORRENTE";
        leadId: string;
        criadoEm: Date;
        stageId: string;
        atualizadoEm: Date;
        clienteCpf?: string | undefined;
        scoreHistorico?: {
            leadId: string;
            criadoEm: Date;
            scoreId: string;
            scoreFinal: number;
            probabilidadeClosing: number;
            dataEstimadaClosing: Date;
            fonteScore: number;
            tipoObraScore: number;
            segmentoScore: number;
            engajamentoScore: number;
            historicoScore: number;
        }[] | undefined;
    }, {
        clienteNome: string;
        clienteEmail: string;
        clienteTelefone: string;
        fonte: "PARCEIRO" | "INDICACAO" | "WEBSITE" | "OFFLINE";
        tipoObra: "residencial" | "comercial" | "industrial" | "reforma";
        segmentoCliente: "NOVO" | "RETORNO" | "CONCORRENTE";
        leadId: string;
        criadoEm: Date;
        stageId: string;
        atualizadoEm: Date;
        clienteCpf?: string | undefined;
        scoreHistorico?: {
            leadId: string;
            criadoEm: Date;
            scoreId: string;
            scoreFinal: number;
            probabilidadeClosing: number;
            dataEstimadaClosing: Date;
            fonteScore: number;
            tipoObraScore: number;
            segmentoScore: number;
            engajamentoScore: number;
            historicoScore: number;
        }[] | undefined;
    }>, "many">;
    total: z.ZodNumber;
    page: z.ZodNumber;
    pageSize: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    leads: {
        clienteNome: string;
        clienteEmail: string;
        clienteTelefone: string;
        fonte: "PARCEIRO" | "INDICACAO" | "WEBSITE" | "OFFLINE";
        tipoObra: "residencial" | "comercial" | "industrial" | "reforma";
        segmentoCliente: "NOVO" | "RETORNO" | "CONCORRENTE";
        leadId: string;
        criadoEm: Date;
        stageId: string;
        atualizadoEm: Date;
        clienteCpf?: string | undefined;
        scoreHistorico?: {
            leadId: string;
            criadoEm: Date;
            scoreId: string;
            scoreFinal: number;
            probabilidadeClosing: number;
            dataEstimadaClosing: Date;
            fonteScore: number;
            tipoObraScore: number;
            segmentoScore: number;
            engajamentoScore: number;
            historicoScore: number;
        }[] | undefined;
    }[];
    total: number;
    page: number;
    pageSize: number;
}, {
    leads: {
        clienteNome: string;
        clienteEmail: string;
        clienteTelefone: string;
        fonte: "PARCEIRO" | "INDICACAO" | "WEBSITE" | "OFFLINE";
        tipoObra: "residencial" | "comercial" | "industrial" | "reforma";
        segmentoCliente: "NOVO" | "RETORNO" | "CONCORRENTE";
        leadId: string;
        criadoEm: Date;
        stageId: string;
        atualizadoEm: Date;
        clienteCpf?: string | undefined;
        scoreHistorico?: {
            leadId: string;
            criadoEm: Date;
            scoreId: string;
            scoreFinal: number;
            probabilidadeClosing: number;
            dataEstimadaClosing: Date;
            fonteScore: number;
            tipoObraScore: number;
            segmentoScore: number;
            engajamentoScore: number;
            historicoScore: number;
        }[] | undefined;
    }[];
    total: number;
    page: number;
    pageSize: number;
}>;
export type FonteType = z.infer<typeof FonteEnum>;
export type SegmentoClienteType = z.infer<typeof SegmentoClienteEnum>;
export type TipoObraType = z.infer<typeof TipoObraEnum>;
export type LeadActivityType = z.infer<typeof LeadActivityTypeEnum>;
export type CreateLeadInput = z.infer<typeof CreateLeadSchema>;
export type LeadActivity = z.infer<typeof LeadActivitySchema>;
export type ConversionScore = z.infer<typeof ConversionScoreSchema>;
export type Lead = z.infer<typeof LeadSchema>;
export type LeadDetail = z.infer<typeof LeadDetailSchema>;
export type AddLeadActivityInput = z.infer<typeof AddLeadActivitySchema>;
export type DashboardStats = z.infer<typeof DashboardStatsSchema>;
export type LeadsListResponse = z.infer<typeof LeadsListResponseSchema>;
