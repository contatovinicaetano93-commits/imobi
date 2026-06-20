import { z } from "zod";
export declare const FonteEnum: z.ZodEnum<["WEBSITE", "INDICACAO", "MARKETPLACE", "CAMPANHA_DIGITAL", "OFFLINE", "PARCEIRO"]>;
export declare const SegmentoClienteEnum: z.ZodEnum<["NOVO", "RETORNO", "CONCORRENTE"]>;
export declare const TipoObraEnum: z.ZodEnum<["residencial", "comercial", "industrial", "reforma"]>;
export declare const LeadActivityTypeEnum: z.ZodEnum<["CALL_OUTBOUND", "CALL_INBOUND", "EMAIL_SENT", "EMAIL_RECEIVED", "MEETING_SCHEDULED", "MEETING_COMPLETED", "PROPOSAL_SENT", "DOCUMENT_REQUESTED", "PAYMENT_RECEIVED", "STAGE_CHANGED", "NOTE_ADDED", "FOLLOW_UP_SET"]>;
export declare const CreateLeadSchema: z.ZodObject<{
    clienteNome: z.ZodString;
    clienteEmail: z.ZodString;
    clienteTelefone: z.ZodString;
    clienteCpf: z.ZodOptional<z.ZodString>;
    fonte: z.ZodEnum<["WEBSITE", "INDICACAO", "MARKETPLACE", "CAMPANHA_DIGITAL", "OFFLINE", "PARCEIRO"]>;
    tipoObra: z.ZodEnum<["residencial", "comercial", "industrial", "reforma"]>;
    segmentoCliente: z.ZodEnum<["NOVO", "RETORNO", "CONCORRENTE"]>;
}, "strip", z.ZodTypeAny, {
    clienteNome: string;
    clienteEmail: string;
    clienteTelefone: string;
    fonte: "WEBSITE" | "INDICACAO" | "MARKETPLACE" | "CAMPANHA_DIGITAL" | "OFFLINE" | "PARCEIRO";
    tipoObra: "residencial" | "comercial" | "industrial" | "reforma";
    segmentoCliente: "NOVO" | "RETORNO" | "CONCORRENTE";
    clienteCpf?: string | undefined;
}, {
    clienteNome: string;
    clienteEmail: string;
    clienteTelefone: string;
    fonte: "WEBSITE" | "INDICACAO" | "MARKETPLACE" | "CAMPANHA_DIGITAL" | "OFFLINE" | "PARCEIRO";
    tipoObra: "residencial" | "comercial" | "industrial" | "reforma";
    segmentoCliente: "NOVO" | "RETORNO" | "CONCORRENTE";
    clienteCpf?: string | undefined;
}>;
export declare const ApiCreateLeadSchema: z.ZodObject<{
    clienteNome: z.ZodString;
    clienteEmail: z.ZodString;
    clienteTelefone: z.ZodString;
    clienteCpf: z.ZodOptional<z.ZodString>;
    fonte: z.ZodDefault<z.ZodOptional<z.ZodEnum<["WEBSITE", "INDICACAO", "MARKETPLACE", "CAMPANHA_DIGITAL", "OFFLINE", "PARCEIRO"]>>>;
    tipoObra: z.ZodOptional<z.ZodEnum<["residencial", "comercial", "industrial", "reforma"]>>;
    segmentoCliente: z.ZodDefault<z.ZodOptional<z.ZodEnum<["NOVO", "RETORNO", "CONCORRENTE"]>>>;
    observacoes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    clienteNome: string;
    clienteEmail: string;
    clienteTelefone: string;
    fonte: "WEBSITE" | "INDICACAO" | "MARKETPLACE" | "CAMPANHA_DIGITAL" | "OFFLINE" | "PARCEIRO";
    segmentoCliente: "NOVO" | "RETORNO" | "CONCORRENTE";
    observacoes?: string | undefined;
    clienteCpf?: string | undefined;
    tipoObra?: "residencial" | "comercial" | "industrial" | "reforma" | undefined;
}, {
    clienteNome: string;
    clienteEmail: string;
    clienteTelefone: string;
    observacoes?: string | undefined;
    clienteCpf?: string | undefined;
    fonte?: "WEBSITE" | "INDICACAO" | "MARKETPLACE" | "CAMPANHA_DIGITAL" | "OFFLINE" | "PARCEIRO" | undefined;
    tipoObra?: "residencial" | "comercial" | "industrial" | "reforma" | undefined;
    segmentoCliente?: "NOVO" | "RETORNO" | "CONCORRENTE" | undefined;
}>;
export type ApiCreateLeadInput = z.infer<typeof ApiCreateLeadSchema>;
export declare const ApiAddLeadActivitySchema: z.ZodObject<{
    tipo: z.ZodEnum<["CALL_OUTBOUND", "CALL_INBOUND", "EMAIL_SENT", "EMAIL_RECEIVED", "MEETING_SCHEDULED", "MEETING_COMPLETED", "PROPOSAL_SENT", "DOCUMENT_REQUESTED", "PAYMENT_RECEIVED", "STAGE_CHANGED", "NOTE_ADDED", "FOLLOW_UP_SET"]>;
    descricao: z.ZodString;
}, "strip", z.ZodTypeAny, {
    tipo: "CALL_OUTBOUND" | "CALL_INBOUND" | "EMAIL_SENT" | "EMAIL_RECEIVED" | "MEETING_SCHEDULED" | "MEETING_COMPLETED" | "PROPOSAL_SENT" | "DOCUMENT_REQUESTED" | "PAYMENT_RECEIVED" | "STAGE_CHANGED" | "NOTE_ADDED" | "FOLLOW_UP_SET";
    descricao: string;
}, {
    tipo: "CALL_OUTBOUND" | "CALL_INBOUND" | "EMAIL_SENT" | "EMAIL_RECEIVED" | "MEETING_SCHEDULED" | "MEETING_COMPLETED" | "PROPOSAL_SENT" | "DOCUMENT_REQUESTED" | "PAYMENT_RECEIVED" | "STAGE_CHANGED" | "NOTE_ADDED" | "FOLLOW_UP_SET";
    descricao: string;
}>;
export type ApiAddLeadActivityInput = z.infer<typeof ApiAddLeadActivitySchema>;
export declare const LeadActivitySchema: z.ZodObject<{
    leadActivityId: z.ZodString;
    leadId: z.ZodString;
    usuarioId: z.ZodString;
    tipo: z.ZodEnum<["CALL_OUTBOUND", "CALL_INBOUND", "EMAIL_SENT", "EMAIL_RECEIVED", "MEETING_SCHEDULED", "MEETING_COMPLETED", "PROPOSAL_SENT", "DOCUMENT_REQUESTED", "PAYMENT_RECEIVED", "STAGE_CHANGED", "NOTE_ADDED", "FOLLOW_UP_SET"]>;
    descricao: z.ZodString;
    criadoEm: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    tipo: "CALL_OUTBOUND" | "CALL_INBOUND" | "EMAIL_SENT" | "EMAIL_RECEIVED" | "MEETING_SCHEDULED" | "MEETING_COMPLETED" | "PROPOSAL_SENT" | "DOCUMENT_REQUESTED" | "PAYMENT_RECEIVED" | "STAGE_CHANGED" | "NOTE_ADDED" | "FOLLOW_UP_SET";
    descricao: string;
    leadActivityId: string;
    leadId: string;
    usuarioId: string;
    criadoEm: Date;
}, {
    tipo: "CALL_OUTBOUND" | "CALL_INBOUND" | "EMAIL_SENT" | "EMAIL_RECEIVED" | "MEETING_SCHEDULED" | "MEETING_COMPLETED" | "PROPOSAL_SENT" | "DOCUMENT_REQUESTED" | "PAYMENT_RECEIVED" | "STAGE_CHANGED" | "NOTE_ADDED" | "FOLLOW_UP_SET";
    descricao: string;
    leadActivityId: string;
    leadId: string;
    usuarioId: string;
    criadoEm: Date;
}>;
export declare const ConversionScoreSchema: z.ZodObject<{
    scoreId: z.ZodString;
    leadId: z.ZodString;
    scoreFinal: z.ZodNumber;
    probabilidadeClosing: z.ZodNumber;
    dataEstimadaClosing: z.ZodString;
    fonteScore: z.ZodNumber;
    tipoObraScore: z.ZodNumber;
    segmentoScore: z.ZodNumber;
    engajamentoScore: z.ZodNumber;
    historicoScore: z.ZodNumber;
    criadoEm: z.ZodString;
}, "strip", z.ZodTypeAny, {
    leadId: string;
    criadoEm: string;
    scoreId: string;
    scoreFinal: number;
    probabilidadeClosing: number;
    dataEstimadaClosing: string;
    fonteScore: number;
    tipoObraScore: number;
    segmentoScore: number;
    engajamentoScore: number;
    historicoScore: number;
}, {
    leadId: string;
    criadoEm: string;
    scoreId: string;
    scoreFinal: number;
    probabilidadeClosing: number;
    dataEstimadaClosing: string;
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
    fonte: z.ZodEnum<["WEBSITE", "INDICACAO", "MARKETPLACE", "CAMPANHA_DIGITAL", "OFFLINE", "PARCEIRO"]>;
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
        dataEstimadaClosing: z.ZodString;
        fonteScore: z.ZodNumber;
        tipoObraScore: z.ZodNumber;
        segmentoScore: z.ZodNumber;
        engajamentoScore: z.ZodNumber;
        historicoScore: z.ZodNumber;
        criadoEm: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        leadId: string;
        criadoEm: string;
        scoreId: string;
        scoreFinal: number;
        probabilidadeClosing: number;
        dataEstimadaClosing: string;
        fonteScore: number;
        tipoObraScore: number;
        segmentoScore: number;
        engajamentoScore: number;
        historicoScore: number;
    }, {
        leadId: string;
        criadoEm: string;
        scoreId: string;
        scoreFinal: number;
        probabilidadeClosing: number;
        dataEstimadaClosing: string;
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
    fonte: "WEBSITE" | "INDICACAO" | "MARKETPLACE" | "CAMPANHA_DIGITAL" | "OFFLINE" | "PARCEIRO";
    tipoObra: "residencial" | "comercial" | "industrial" | "reforma";
    segmentoCliente: "NOVO" | "RETORNO" | "CONCORRENTE";
    leadId: string;
    criadoEm: Date;
    stageId: string;
    atualizadoEm: Date;
    clienteCpf?: string | undefined;
    scoreHistorico?: {
        leadId: string;
        criadoEm: string;
        scoreId: string;
        scoreFinal: number;
        probabilidadeClosing: number;
        dataEstimadaClosing: string;
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
    fonte: "WEBSITE" | "INDICACAO" | "MARKETPLACE" | "CAMPANHA_DIGITAL" | "OFFLINE" | "PARCEIRO";
    tipoObra: "residencial" | "comercial" | "industrial" | "reforma";
    segmentoCliente: "NOVO" | "RETORNO" | "CONCORRENTE";
    leadId: string;
    criadoEm: Date;
    stageId: string;
    atualizadoEm: Date;
    clienteCpf?: string | undefined;
    scoreHistorico?: {
        leadId: string;
        criadoEm: string;
        scoreId: string;
        scoreFinal: number;
        probabilidadeClosing: number;
        dataEstimadaClosing: string;
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
    fonte: z.ZodEnum<["WEBSITE", "INDICACAO", "MARKETPLACE", "CAMPANHA_DIGITAL", "OFFLINE", "PARCEIRO"]>;
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
        dataEstimadaClosing: z.ZodString;
        fonteScore: z.ZodNumber;
        tipoObraScore: z.ZodNumber;
        segmentoScore: z.ZodNumber;
        engajamentoScore: z.ZodNumber;
        historicoScore: z.ZodNumber;
        criadoEm: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        leadId: string;
        criadoEm: string;
        scoreId: string;
        scoreFinal: number;
        probabilidadeClosing: number;
        dataEstimadaClosing: string;
        fonteScore: number;
        tipoObraScore: number;
        segmentoScore: number;
        engajamentoScore: number;
        historicoScore: number;
    }, {
        leadId: string;
        criadoEm: string;
        scoreId: string;
        scoreFinal: number;
        probabilidadeClosing: number;
        dataEstimadaClosing: string;
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
        nome: string;
        stageId: string;
        pipelineId: string;
    }, {
        nome: string;
        stageId: string;
        pipelineId: string;
    }>>;
    atividades: z.ZodOptional<z.ZodArray<z.ZodObject<{
        leadActivityId: z.ZodString;
        leadId: z.ZodString;
        usuarioId: z.ZodString;
        tipo: z.ZodEnum<["CALL_OUTBOUND", "CALL_INBOUND", "EMAIL_SENT", "EMAIL_RECEIVED", "MEETING_SCHEDULED", "MEETING_COMPLETED", "PROPOSAL_SENT", "DOCUMENT_REQUESTED", "PAYMENT_RECEIVED", "STAGE_CHANGED", "NOTE_ADDED", "FOLLOW_UP_SET"]>;
        descricao: z.ZodString;
        criadoEm: z.ZodDate;
    }, "strip", z.ZodTypeAny, {
        tipo: "CALL_OUTBOUND" | "CALL_INBOUND" | "EMAIL_SENT" | "EMAIL_RECEIVED" | "MEETING_SCHEDULED" | "MEETING_COMPLETED" | "PROPOSAL_SENT" | "DOCUMENT_REQUESTED" | "PAYMENT_RECEIVED" | "STAGE_CHANGED" | "NOTE_ADDED" | "FOLLOW_UP_SET";
        descricao: string;
        leadActivityId: string;
        leadId: string;
        usuarioId: string;
        criadoEm: Date;
    }, {
        tipo: "CALL_OUTBOUND" | "CALL_INBOUND" | "EMAIL_SENT" | "EMAIL_RECEIVED" | "MEETING_SCHEDULED" | "MEETING_COMPLETED" | "PROPOSAL_SENT" | "DOCUMENT_REQUESTED" | "PAYMENT_RECEIVED" | "STAGE_CHANGED" | "NOTE_ADDED" | "FOLLOW_UP_SET";
        descricao: string;
        leadActivityId: string;
        leadId: string;
        usuarioId: string;
        criadoEm: Date;
    }>, "many">>;
    scoreBreakdown: z.ZodOptional<z.ZodObject<{
        scoreId: z.ZodString;
        leadId: z.ZodString;
        scoreFinal: z.ZodNumber;
        probabilidadeClosing: z.ZodNumber;
        dataEstimadaClosing: z.ZodString;
        fonteScore: z.ZodNumber;
        tipoObraScore: z.ZodNumber;
        segmentoScore: z.ZodNumber;
        engajamentoScore: z.ZodNumber;
        historicoScore: z.ZodNumber;
        criadoEm: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        leadId: string;
        criadoEm: string;
        scoreId: string;
        scoreFinal: number;
        probabilidadeClosing: number;
        dataEstimadaClosing: string;
        fonteScore: number;
        tipoObraScore: number;
        segmentoScore: number;
        engajamentoScore: number;
        historicoScore: number;
    }, {
        leadId: string;
        criadoEm: string;
        scoreId: string;
        scoreFinal: number;
        probabilidadeClosing: number;
        dataEstimadaClosing: string;
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
        obraId: string;
        nome: string;
    }, {
        obraId: string;
        nome: string;
    }>>;
    usuario: z.ZodOptional<z.ZodObject<{
        usuarioId: z.ZodString;
        nome: z.ZodString;
        email: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        nome: string;
        email: string;
        usuarioId: string;
    }, {
        nome: string;
        email: string;
        usuarioId: string;
    }>>;
    proximoAcompanhamento: z.ZodOptional<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    clienteNome: string;
    clienteEmail: string;
    clienteTelefone: string;
    fonte: "WEBSITE" | "INDICACAO" | "MARKETPLACE" | "CAMPANHA_DIGITAL" | "OFFLINE" | "PARCEIRO";
    tipoObra: "residencial" | "comercial" | "industrial" | "reforma";
    segmentoCliente: "NOVO" | "RETORNO" | "CONCORRENTE";
    leadId: string;
    criadoEm: Date;
    stageId: string;
    atualizadoEm: Date;
    clienteCpf?: string | undefined;
    scoreHistorico?: {
        leadId: string;
        criadoEm: string;
        scoreId: string;
        scoreFinal: number;
        probabilidadeClosing: number;
        dataEstimadaClosing: string;
        fonteScore: number;
        tipoObraScore: number;
        segmentoScore: number;
        engajamentoScore: number;
        historicoScore: number;
    }[] | undefined;
    stage?: {
        nome: string;
        stageId: string;
        pipelineId: string;
    } | undefined;
    atividades?: {
        tipo: "CALL_OUTBOUND" | "CALL_INBOUND" | "EMAIL_SENT" | "EMAIL_RECEIVED" | "MEETING_SCHEDULED" | "MEETING_COMPLETED" | "PROPOSAL_SENT" | "DOCUMENT_REQUESTED" | "PAYMENT_RECEIVED" | "STAGE_CHANGED" | "NOTE_ADDED" | "FOLLOW_UP_SET";
        descricao: string;
        leadActivityId: string;
        leadId: string;
        usuarioId: string;
        criadoEm: Date;
    }[] | undefined;
    scoreBreakdown?: {
        leadId: string;
        criadoEm: string;
        scoreId: string;
        scoreFinal: number;
        probabilidadeClosing: number;
        dataEstimadaClosing: string;
        fonteScore: number;
        tipoObraScore: number;
        segmentoScore: number;
        engajamentoScore: number;
        historicoScore: number;
    } | undefined;
    obra?: {
        obraId: string;
        nome: string;
    } | undefined;
    usuario?: {
        nome: string;
        email: string;
        usuarioId: string;
    } | undefined;
    proximoAcompanhamento?: Date | undefined;
}, {
    clienteNome: string;
    clienteEmail: string;
    clienteTelefone: string;
    fonte: "WEBSITE" | "INDICACAO" | "MARKETPLACE" | "CAMPANHA_DIGITAL" | "OFFLINE" | "PARCEIRO";
    tipoObra: "residencial" | "comercial" | "industrial" | "reforma";
    segmentoCliente: "NOVO" | "RETORNO" | "CONCORRENTE";
    leadId: string;
    criadoEm: Date;
    stageId: string;
    atualizadoEm: Date;
    clienteCpf?: string | undefined;
    scoreHistorico?: {
        leadId: string;
        criadoEm: string;
        scoreId: string;
        scoreFinal: number;
        probabilidadeClosing: number;
        dataEstimadaClosing: string;
        fonteScore: number;
        tipoObraScore: number;
        segmentoScore: number;
        engajamentoScore: number;
        historicoScore: number;
    }[] | undefined;
    stage?: {
        nome: string;
        stageId: string;
        pipelineId: string;
    } | undefined;
    atividades?: {
        tipo: "CALL_OUTBOUND" | "CALL_INBOUND" | "EMAIL_SENT" | "EMAIL_RECEIVED" | "MEETING_SCHEDULED" | "MEETING_COMPLETED" | "PROPOSAL_SENT" | "DOCUMENT_REQUESTED" | "PAYMENT_RECEIVED" | "STAGE_CHANGED" | "NOTE_ADDED" | "FOLLOW_UP_SET";
        descricao: string;
        leadActivityId: string;
        leadId: string;
        usuarioId: string;
        criadoEm: Date;
    }[] | undefined;
    scoreBreakdown?: {
        leadId: string;
        criadoEm: string;
        scoreId: string;
        scoreFinal: number;
        probabilidadeClosing: number;
        dataEstimadaClosing: string;
        fonteScore: number;
        tipoObraScore: number;
        segmentoScore: number;
        engajamentoScore: number;
        historicoScore: number;
    } | undefined;
    obra?: {
        obraId: string;
        nome: string;
    } | undefined;
    usuario?: {
        nome: string;
        email: string;
        usuarioId: string;
    } | undefined;
    proximoAcompanhamento?: Date | undefined;
}>;
export declare const AddLeadActivitySchema: z.ZodObject<{
    tipo: z.ZodEnum<["CALL_OUTBOUND", "CALL_INBOUND", "EMAIL_SENT", "EMAIL_RECEIVED", "MEETING_SCHEDULED", "MEETING_COMPLETED", "PROPOSAL_SENT", "DOCUMENT_REQUESTED", "PAYMENT_RECEIVED", "STAGE_CHANGED", "NOTE_ADDED", "FOLLOW_UP_SET"]>;
    descricao: z.ZodString;
}, "strip", z.ZodTypeAny, {
    tipo: "CALL_OUTBOUND" | "CALL_INBOUND" | "EMAIL_SENT" | "EMAIL_RECEIVED" | "MEETING_SCHEDULED" | "MEETING_COMPLETED" | "PROPOSAL_SENT" | "DOCUMENT_REQUESTED" | "PAYMENT_RECEIVED" | "STAGE_CHANGED" | "NOTE_ADDED" | "FOLLOW_UP_SET";
    descricao: string;
}, {
    tipo: "CALL_OUTBOUND" | "CALL_INBOUND" | "EMAIL_SENT" | "EMAIL_RECEIVED" | "MEETING_SCHEDULED" | "MEETING_COMPLETED" | "PROPOSAL_SENT" | "DOCUMENT_REQUESTED" | "PAYMENT_RECEIVED" | "STAGE_CHANGED" | "NOTE_ADDED" | "FOLLOW_UP_SET";
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
        fonte: z.ZodEnum<["WEBSITE", "INDICACAO", "MARKETPLACE", "CAMPANHA_DIGITAL", "OFFLINE", "PARCEIRO"]>;
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
            dataEstimadaClosing: z.ZodString;
            fonteScore: z.ZodNumber;
            tipoObraScore: z.ZodNumber;
            segmentoScore: z.ZodNumber;
            engajamentoScore: z.ZodNumber;
            historicoScore: z.ZodNumber;
            criadoEm: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            leadId: string;
            criadoEm: string;
            scoreId: string;
            scoreFinal: number;
            probabilidadeClosing: number;
            dataEstimadaClosing: string;
            fonteScore: number;
            tipoObraScore: number;
            segmentoScore: number;
            engajamentoScore: number;
            historicoScore: number;
        }, {
            leadId: string;
            criadoEm: string;
            scoreId: string;
            scoreFinal: number;
            probabilidadeClosing: number;
            dataEstimadaClosing: string;
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
        fonte: "WEBSITE" | "INDICACAO" | "MARKETPLACE" | "CAMPANHA_DIGITAL" | "OFFLINE" | "PARCEIRO";
        tipoObra: "residencial" | "comercial" | "industrial" | "reforma";
        segmentoCliente: "NOVO" | "RETORNO" | "CONCORRENTE";
        leadId: string;
        criadoEm: Date;
        stageId: string;
        atualizadoEm: Date;
        clienteCpf?: string | undefined;
        scoreHistorico?: {
            leadId: string;
            criadoEm: string;
            scoreId: string;
            scoreFinal: number;
            probabilidadeClosing: number;
            dataEstimadaClosing: string;
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
        fonte: "WEBSITE" | "INDICACAO" | "MARKETPLACE" | "CAMPANHA_DIGITAL" | "OFFLINE" | "PARCEIRO";
        tipoObra: "residencial" | "comercial" | "industrial" | "reforma";
        segmentoCliente: "NOVO" | "RETORNO" | "CONCORRENTE";
        leadId: string;
        criadoEm: Date;
        stageId: string;
        atualizadoEm: Date;
        clienteCpf?: string | undefined;
        scoreHistorico?: {
            leadId: string;
            criadoEm: string;
            scoreId: string;
            scoreFinal: number;
            probabilidadeClosing: number;
            dataEstimadaClosing: string;
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
        fonte: "WEBSITE" | "INDICACAO" | "MARKETPLACE" | "CAMPANHA_DIGITAL" | "OFFLINE" | "PARCEIRO";
        tipoObra: "residencial" | "comercial" | "industrial" | "reforma";
        segmentoCliente: "NOVO" | "RETORNO" | "CONCORRENTE";
        leadId: string;
        criadoEm: Date;
        stageId: string;
        atualizadoEm: Date;
        clienteCpf?: string | undefined;
        scoreHistorico?: {
            leadId: string;
            criadoEm: string;
            scoreId: string;
            scoreFinal: number;
            probabilidadeClosing: number;
            dataEstimadaClosing: string;
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
        fonte: "WEBSITE" | "INDICACAO" | "MARKETPLACE" | "CAMPANHA_DIGITAL" | "OFFLINE" | "PARCEIRO";
        tipoObra: "residencial" | "comercial" | "industrial" | "reforma";
        segmentoCliente: "NOVO" | "RETORNO" | "CONCORRENTE";
        leadId: string;
        criadoEm: Date;
        stageId: string;
        atualizadoEm: Date;
        clienteCpf?: string | undefined;
        scoreHistorico?: {
            leadId: string;
            criadoEm: string;
            scoreId: string;
            scoreFinal: number;
            probabilidadeClosing: number;
            dataEstimadaClosing: string;
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
