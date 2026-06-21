import { z } from "zod";
export declare const VistoriaAprovarSchema: z.ZodObject<{
    obraId: z.ZodOptional<z.ZodString>;
    observacoes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    obraId?: string | undefined;
    observacoes?: string | undefined;
}, {
    obraId?: string | undefined;
    observacoes?: string | undefined;
}>;
export declare const VistoriaRejeitarSchema: z.ZodObject<{
    motivo: z.ZodString;
}, "strip", z.ZodTypeAny, {
    motivo: string;
}, {
    motivo: string;
}>;
export type VistoriaAprovarInput = z.infer<typeof VistoriaAprovarSchema>;
export type VistoriaRejeitarInput = z.infer<typeof VistoriaRejeitarSchema>;
export declare const ComiteSolicitarSchema: z.ZodObject<{
    valorSolicitado: z.ZodNumber;
    prazoMeses: z.ZodNumber;
    taxaMensal: z.ZodNumber;
    finalidade: z.ZodString;
    garantias: z.ZodOptional<z.ZodString>;
    observacoes: z.ZodOptional<z.ZodString>;
    obraId: z.ZodOptional<z.ZodString>;
    vgv: z.ZodOptional<z.ZodNumber>;
    custoObra: z.ZodOptional<z.ZodNumber>;
    ltv: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    valorSolicitado: number;
    prazoMeses: number;
    taxaMensal: number;
    finalidade: string;
    obraId?: string | undefined;
    observacoes?: string | undefined;
    garantias?: string | undefined;
    vgv?: number | undefined;
    custoObra?: number | undefined;
    ltv?: number | undefined;
}, {
    valorSolicitado: number;
    prazoMeses: number;
    taxaMensal: number;
    finalidade: string;
    obraId?: string | undefined;
    observacoes?: string | undefined;
    garantias?: string | undefined;
    vgv?: number | undefined;
    custoObra?: number | undefined;
    ltv?: number | undefined;
}>;
export declare const ComiteParecerSchema: z.ZodObject<{
    parecerTecnico: z.ZodString;
}, "strip", z.ZodTypeAny, {
    parecerTecnico: string;
}, {
    parecerTecnico: string;
}>;
export declare const VotoDecisaoEnum: z.ZodEnum<["APROVAR", "AJUSTAR", "REPROVAR"]>;
export declare const ComiteVotarSchema: z.ZodObject<{
    voto: z.ZodEnum<["APROVAR", "AJUSTAR", "REPROVAR"]>;
    justificativa: z.ZodOptional<z.ZodString>;
    condicoes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    voto: "APROVAR" | "AJUSTAR" | "REPROVAR";
    justificativa?: string | undefined;
    condicoes?: string | undefined;
}, {
    voto: "APROVAR" | "AJUSTAR" | "REPROVAR";
    justificativa?: string | undefined;
    condicoes?: string | undefined;
}>;
export declare const ComiteDecisaoEnum: z.ZodEnum<["APROVADO", "AJUSTADO", "REPROVADO"]>;
export declare const ComiteEncerrarSchema: z.ZodObject<{
    decisao: z.ZodEnum<["APROVADO", "AJUSTADO", "REPROVADO"]>;
    motivo: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    decisao: "APROVADO" | "AJUSTADO" | "REPROVADO";
    motivo?: string | undefined;
}, {
    decisao: "APROVADO" | "AJUSTADO" | "REPROVADO";
    motivo?: string | undefined;
}>;
export type ComiteSolicitarInput = z.infer<typeof ComiteSolicitarSchema>;
export type ComiteParecerInput = z.infer<typeof ComiteParecerSchema>;
export type ComiteVotarInput = z.infer<typeof ComiteVotarSchema>;
export type ComiteEncerrarInput = z.infer<typeof ComiteEncerrarSchema>;
export declare const MarketplaceAvaliarSchema: z.ZodObject<{
    nota: z.ZodNumber;
    comentario: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    nota: number;
    comentario?: string | undefined;
}, {
    nota: number;
    comentario?: string | undefined;
}>;
export declare const FornecedorTipoEnum: z.ZodEnum<["MATERIAL_CONSTRUCAO", "MAO_DE_OBRA", "EQUIPAMENTO", "PROJETO_ARQUITETURA", "ENGENHARIA", "OUTROS"]>;
export declare const MarketplaceCriarFornecedorSchema: z.ZodObject<{
    nome: z.ZodString;
    tipo: z.ZodEnum<["MATERIAL_CONSTRUCAO", "MAO_DE_OBRA", "EQUIPAMENTO", "PROJETO_ARQUITETURA", "ENGENHARIA", "OUTROS"]>;
    descricao: z.ZodOptional<z.ZodString>;
    website: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    telefone: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    endereco: z.ZodOptional<z.ZodString>;
    uf: z.ZodOptional<z.ZodString>;
    cidade: z.ZodOptional<z.ZodString>;
    geoLatitude: z.ZodOptional<z.ZodNumber>;
    geoLongitude: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    nome: string;
    tipo: "MATERIAL_CONSTRUCAO" | "MAO_DE_OBRA" | "EQUIPAMENTO" | "PROJETO_ARQUITETURA" | "ENGENHARIA" | "OUTROS";
    descricao?: string | undefined;
    website?: string | undefined;
    telefone?: string | undefined;
    email?: string | undefined;
    endereco?: string | undefined;
    uf?: string | undefined;
    cidade?: string | undefined;
    geoLatitude?: number | undefined;
    geoLongitude?: number | undefined;
}, {
    nome: string;
    tipo: "MATERIAL_CONSTRUCAO" | "MAO_DE_OBRA" | "EQUIPAMENTO" | "PROJETO_ARQUITETURA" | "ENGENHARIA" | "OUTROS";
    descricao?: string | undefined;
    website?: string | undefined;
    telefone?: string | undefined;
    email?: string | undefined;
    endereco?: string | undefined;
    uf?: string | undefined;
    cidade?: string | undefined;
    geoLatitude?: number | undefined;
    geoLongitude?: number | undefined;
}>;
export type MarketplaceAvaliarInput = z.infer<typeof MarketplaceAvaliarSchema>;
export type MarketplaceCriarFornecedorInput = z.infer<typeof MarketplaceCriarFornecedorSchema>;
export declare const AdicionarMailingSchema: z.ZodObject<{
    nome: z.ZodString;
    email: z.ZodString;
    telefone: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    nome: string;
    email: string;
    telefone?: string | undefined;
}, {
    nome: string;
    email: string;
    telefone?: string | undefined;
}>;
export type AdicionarMailingInput = z.infer<typeof AdicionarMailingSchema>;
export declare const KycDocumentoTipoEnum: z.ZodEnum<["RG", "CPF", "CNH", "PASSAPORTE", "COMPROVANTE_RESIDENCIA", "CNPJ", "CONTRATO_SOCIAL", "OUTROS"]>;
export declare const KycUploadSchema: z.ZodObject<{
    tipo: z.ZodEnum<["RG", "CPF", "CNH", "PASSAPORTE", "COMPROVANTE_RESIDENCIA", "CNPJ", "CONTRATO_SOCIAL", "OUTROS"]>;
    url: z.ZodString;
}, "strip", z.ZodTypeAny, {
    tipo: "OUTROS" | "RG" | "CPF" | "CNH" | "PASSAPORTE" | "COMPROVANTE_RESIDENCIA" | "CNPJ" | "CONTRATO_SOCIAL";
    url: string;
}, {
    tipo: "OUTROS" | "RG" | "CPF" | "CNH" | "PASSAPORTE" | "COMPROVANTE_RESIDENCIA" | "CNPJ" | "CONTRATO_SOCIAL";
    url: string;
}>;
export declare const KycRejeitarSchema: z.ZodObject<{
    motivo: z.ZodString;
}, "strip", z.ZodTypeAny, {
    motivo: string;
}, {
    motivo: string;
}>;
export type KycUploadInput = z.infer<typeof KycUploadSchema>;
export type KycRejeitarInput = z.infer<typeof KycRejeitarSchema>;
export declare const PushTokenSchema: z.ZodObject<{
    token: z.ZodString;
}, "strip", z.ZodTypeAny, {
    token: string;
}, {
    token: string;
}>;
export type PushTokenInput = z.infer<typeof PushTokenSchema>;
export declare const RevogarConsentimentoSchema: z.ZodObject<{
    tipo: z.ZodEnum<["MARKETING", "NOTIFICACOES", "TUDO"]>;
}, "strip", z.ZodTypeAny, {
    tipo: "MARKETING" | "NOTIFICACOES" | "TUDO";
}, {
    tipo: "MARKETING" | "NOTIFICACOES" | "TUDO";
}>;
export type RevogarConsentimentoInput = z.infer<typeof RevogarConsentimentoSchema>;
export declare const EtapaStatusEnum: z.ZodEnum<["PLANEJADA", "EM_ANDAMENTO", "AGUARDANDO_VISTORIA", "CONCLUIDA", "REPROVADA"]>;
export declare const EtapaAtualizarStatusSchema: z.ZodObject<{
    status: z.ZodEnum<["PLANEJADA", "EM_ANDAMENTO", "AGUARDANDO_VISTORIA", "CONCLUIDA", "REPROVADA"]>;
}, "strip", z.ZodTypeAny, {
    status: "PLANEJADA" | "EM_ANDAMENTO" | "AGUARDANDO_VISTORIA" | "CONCLUIDA" | "REPROVADA";
}, {
    status: "PLANEJADA" | "EM_ANDAMENTO" | "AGUARDANDO_VISTORIA" | "CONCLUIDA" | "REPROVADA";
}>;
export type EtapaAtualizarStatusInput = z.infer<typeof EtapaAtualizarStatusSchema>;
export declare const UsuarioTipoEnum: z.ZodEnum<["ADMIN", "GESTOR", "GESTOR_FUNDO", "ENGENHEIRO", "GESTOR_OBRA", "COMERCIAL", "PARCEIRO", "CONSTRUTOR", "TOMADOR"]>;
export declare const CriarUsuarioAdminSchema: z.ZodObject<{
    nome: z.ZodString;
    email: z.ZodString;
    senha: z.ZodString;
    tipo: z.ZodEnum<["ADMIN", "GESTOR", "GESTOR_FUNDO", "ENGENHEIRO", "GESTOR_OBRA", "COMERCIAL", "PARCEIRO", "CONSTRUTOR", "TOMADOR"]>;
}, "strip", z.ZodTypeAny, {
    nome: string;
    tipo: "ADMIN" | "GESTOR" | "GESTOR_FUNDO" | "ENGENHEIRO" | "GESTOR_OBRA" | "COMERCIAL" | "PARCEIRO" | "CONSTRUTOR" | "TOMADOR";
    email: string;
    senha: string;
}, {
    nome: string;
    tipo: "ADMIN" | "GESTOR" | "GESTOR_FUNDO" | "ENGENHEIRO" | "GESTOR_OBRA" | "COMERCIAL" | "PARCEIRO" | "CONSTRUTOR" | "TOMADOR";
    email: string;
    senha: string;
}>;
export declare const ReprovarHomologacaoSchema: z.ZodObject<{
    motivo: z.ZodString;
}, "strip", z.ZodTypeAny, {
    motivo: string;
}, {
    motivo: string;
}>;
export declare const ConfirmarPagamentoSchema: z.ZodObject<{
    referenciaPagamento: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    referenciaPagamento?: string | undefined;
}, {
    referenciaPagamento?: string | undefined;
}>;
export type CriarUsuarioAdminInput = z.infer<typeof CriarUsuarioAdminSchema>;
export type ReprovarHomologacaoInput = z.infer<typeof ReprovarHomologacaoSchema>;
export type ConfirmarPagamentoInput = z.infer<typeof ConfirmarPagamentoSchema>;
export declare const CriarDueDiligenceSchema: z.ZodObject<{
    nomeEmpreendimento: z.ZodString;
    tipologia: z.ZodOptional<z.ZodString>;
    endereco: z.ZodOptional<z.ZodString>;
    cidade: z.ZodOptional<z.ZodString>;
    uf: z.ZodOptional<z.ZodString>;
    totalUnidades: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    nomeIncorporadora: z.ZodOptional<z.ZodString>;
    cnpjIncorporadora: z.ZodOptional<z.ZodString>;
    modeloAmortizacao: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    totalCarteira: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    totalAReceber: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    estruturaSocietaria: z.ZodOptional<z.ZodString>;
    payload: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    nomeEmpreendimento: string;
    payload: Record<string, unknown>;
    endereco?: string | undefined;
    uf?: string | undefined;
    cidade?: string | undefined;
    tipologia?: string | undefined;
    totalUnidades?: number | null | undefined;
    nomeIncorporadora?: string | undefined;
    cnpjIncorporadora?: string | undefined;
    modeloAmortizacao?: string | null | undefined;
    totalCarteira?: number | null | undefined;
    totalAReceber?: number | null | undefined;
    estruturaSocietaria?: string | undefined;
}, {
    nomeEmpreendimento: string;
    payload: Record<string, unknown>;
    endereco?: string | undefined;
    uf?: string | undefined;
    cidade?: string | undefined;
    tipologia?: string | undefined;
    totalUnidades?: number | null | undefined;
    nomeIncorporadora?: string | undefined;
    cnpjIncorporadora?: string | undefined;
    modeloAmortizacao?: string | null | undefined;
    totalCarteira?: number | null | undefined;
    totalAReceber?: number | null | undefined;
    estruturaSocietaria?: string | undefined;
}>;
export declare const AtualizarDueDiligenceStatusEnum: z.ZodEnum<["ENVIADO", "EM_ANALISE", "APROVADO", "REPROVADO", "PENDENTE_DOCUMENTOS"]>;
export declare const AtualizarDueDiligenceStatusSchema: z.ZodObject<{
    status: z.ZodEnum<["ENVIADO", "EM_ANALISE", "APROVADO", "REPROVADO", "PENDENTE_DOCUMENTOS"]>;
}, "strip", z.ZodTypeAny, {
    status: "APROVADO" | "REPROVADO" | "ENVIADO" | "EM_ANALISE" | "PENDENTE_DOCUMENTOS";
}, {
    status: "APROVADO" | "REPROVADO" | "ENVIADO" | "EM_ANALISE" | "PENDENTE_DOCUMENTOS";
}>;
export type CriarDueDiligenceInput = z.infer<typeof CriarDueDiligenceSchema>;
export type AtualizarDueDiligenceStatusInput = z.infer<typeof AtualizarDueDiligenceStatusSchema>;
export declare const VisitaStatusEnum: z.ZodEnum<["AGENDADA", "REALIZADA", "CANCELADA"]>;
export declare const AtualizarVisitaSchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<["AGENDADA", "REALIZADA", "CANCELADA"]>>;
    dataAgendada: z.ZodOptional<z.ZodString>;
    observacoes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    observacoes?: string | undefined;
    status?: "AGENDADA" | "REALIZADA" | "CANCELADA" | undefined;
    dataAgendada?: string | undefined;
}, {
    observacoes?: string | undefined;
    status?: "AGENDADA" | "REALIZADA" | "CANCELADA" | undefined;
    dataAgendada?: string | undefined;
}>;
export type AtualizarVisitaInput = z.infer<typeof AtualizarVisitaSchema>;
