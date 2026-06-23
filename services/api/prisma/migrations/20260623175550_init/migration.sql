-- CreateEnum
CREATE TYPE "DocumentoTipo" AS ENUM ('CONTRATO', 'GARANTIA', 'MATRICULA', 'ART', 'ALVARA', 'SEGURO', 'PROCURACAO', 'ESCRITURA', 'HABITE_SE', 'OUTROS');

-- CreateEnum
CREATE TYPE "UsuarioTipo" AS ENUM ('TOMADOR', 'GESTOR_OBRA', 'ADMIN', 'PARCEIRO', 'GESTOR', 'GESTOR_FUNDO', 'ENGENHEIRO', 'COMERCIAL', 'CONSTRUTOR');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('PENDENTE', 'EM_VERIFICACAO', 'APROVADO', 'REJEITADO');

-- CreateEnum
CREATE TYPE "CreditoStatus" AS ENUM ('ATIVO', 'SUSPENSO', 'VENCIDO', 'QUITADO');

-- CreateEnum
CREATE TYPE "ObraStatus" AS ENUM ('PLANEJAMENTO', 'EM_EXECUCAO', 'PAUSADA', 'CONCLUIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "EtapaStatus" AS ENUM ('PLANEJADA', 'EM_EXECUCAO', 'AGUARDANDO_VISTORIA', 'REPROVADA', 'CONCLUIDA');

-- CreateEnum
CREATE TYPE "LiberacaoStatus" AS ENUM ('PENDENTE', 'PROCESSANDO', 'CONCLUIDA', 'FALHA');

-- CreateEnum
CREATE TYPE "KycDocumentoStatus" AS ENUM ('PENDENTE', 'APROVADO', 'REJEITADO');

-- CreateEnum
CREATE TYPE "TipoNotificacao" AS ENUM ('ETAPA_APROVADA', 'ETAPA_REPROVADA', 'PARCELA_LIBERADA', 'PARCELA_FALHA', 'CREDITO_APROVADO', 'KYC_APROVADO', 'KYC_REJEITADO', 'OBRA_CRIADA', 'OBRA_HOMOLOGADA', 'SCORE_ATUALIZADO', 'VISTORIA_PENDENTE', 'PARECER_SOLICITADO', 'COMITE_DECISAO');

-- CreateEnum
CREATE TYPE "LeadFonte" AS ENUM ('WEBSITE', 'INDICACAO', 'MARKETPLACE', 'CAMPANHA_DIGITAL', 'OFFLINE', 'PARCEIRO');

-- CreateEnum
CREATE TYPE "LeadSegmento" AS ENUM ('NOVO', 'RETORNO', 'CONCORRENTE');

-- CreateEnum
CREATE TYPE "LeadActivityTipo" AS ENUM ('CALL_OUTBOUND', 'CALL_INBOUND', 'EMAIL_SENT', 'EMAIL_RECEIVED', 'MEETING_SCHEDULED', 'MEETING_COMPLETED', 'PROPOSAL_SENT', 'DOCUMENT_REQUESTED', 'PAYMENT_RECEIVED', 'STAGE_CHANGED', 'NOTE_ADDED', 'FOLLOW_UP_SET');

-- CreateEnum
CREATE TYPE "ComercialRole" AS ENUM ('GERENTE_VENDAS', 'REPRESENTANTE');

-- CreateEnum
CREATE TYPE "MailingStatus" AS ENUM ('NOVO', 'CONTATADO', 'CONVERTIDO');

-- CreateEnum
CREATE TYPE "DueDiligenceStatus" AS ENUM ('RASCUNHO', 'ENVIADO', 'EM_ANALISE', 'APROVADO', 'REPROVADO');

-- CreateEnum
CREATE TYPE "SolicitacaoStatus" AS ENUM ('PENDENTE', 'EM_COMITE', 'APROVADA', 'AJUSTADA', 'REPROVADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "ComiteStatus" AS ENUM ('ABERTO', 'EM_VOTACAO', 'ENCERRADO');

-- CreateEnum
CREATE TYPE "ComiteDecisao" AS ENUM ('APROVADO', 'AJUSTADO', 'REPROVADO');

-- CreateEnum
CREATE TYPE "VotoDecisao" AS ENUM ('APROVAR', 'AJUSTAR', 'REPROVAR');

-- CreateTable
CREATE TABLE "Usuario" (
    "usuarioId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "tipo" "UsuarioTipo" NOT NULL DEFAULT 'TOMADOR',
    "comercialRole" "ComercialRole",
    "kycStatus" "KycStatus" NOT NULL DEFAULT 'PENDENTE',
    "consentidoTermos" BOOLEAN NOT NULL DEFAULT false,
    "consentidoPrivacy" BOOLEAN NOT NULL DEFAULT false,
    "consentidoKyc" BOOLEAN NOT NULL DEFAULT false,
    "consentidoMarketing" BOOLEAN NOT NULL DEFAULT false,
    "consentidoEm" TIMESTAMP(3),
    "passwordResetToken" TEXT,
    "passwordResetExpires" TIMESTAMP(3),
    "bloqueadoEm" TIMESTAMP(3),
    "mfaSecret" TEXT,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "funcoesBloqueadas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "deletadoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("usuarioId")
);

-- CreateTable
CREATE TABLE "SessaoToken" (
    "sessionId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revogadoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessaoToken_pkey" PRIMARY KEY ("sessionId")
);

-- CreateTable
CREATE TABLE "usuario_fcm_tokens" (
    "usuarioId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuario_fcm_tokens_pkey" PRIMARY KEY ("usuarioId","token")
);

-- CreateTable
CREATE TABLE "Credito" (
    "creditoId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "valorAprovado" DOUBLE PRECISION NOT NULL,
    "valorLiberado" DOUBLE PRECISION NOT NULL,
    "taxaMensal" DOUBLE PRECISION NOT NULL DEFAULT 0.0099,
    "prazoMeses" INTEGER NOT NULL,
    "status" "CreditoStatus" NOT NULL DEFAULT 'ATIVO',
    "dataAprovacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataVencimento" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Credito_pkey" PRIMARY KEY ("creditoId")
);

-- CreateTable
CREATE TABLE "Obra" (
    "obraId" TEXT NOT NULL,
    "creditoId" TEXT,
    "usuarioId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "endereco" TEXT NOT NULL,
    "geoLatitude" DOUBLE PRECISION NOT NULL,
    "geoLongitude" DOUBLE PRECISION NOT NULL,
    "raioValidacaoMetros" INTEGER NOT NULL DEFAULT 50,
    "areaM2" DOUBLE PRECISION,
    "tipo" TEXT,
    "status" "ObraStatus" NOT NULL DEFAULT 'PLANEJAMENTO',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Obra_pkey" PRIMARY KEY ("obraId")
);

-- CreateTable
CREATE TABLE "EtapaObra" (
    "etapaId" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "percentualObra" DOUBLE PRECISION NOT NULL,
    "valorLiberacao" DOUBLE PRECISION NOT NULL,
    "status" "EtapaStatus" NOT NULL DEFAULT 'PLANEJADA',
    "dataConclusaoPrevista" TIMESTAMP(3),
    "dataConclusaoReal" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EtapaObra_pkey" PRIMARY KEY ("etapaId")
);

-- CreateTable
CREATE TABLE "EvidenciaEtapa" (
    "evidenciaId" TEXT NOT NULL,
    "etapaId" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    "fotoUrl" TEXT NOT NULL,
    "latCaptura" DOUBLE PRECISION NOT NULL,
    "lngCaptura" DOUBLE PRECISION NOT NULL,
    "accuracyMetros" DOUBLE PRECISION,
    "distanciaObra" DOUBLE PRECISION,
    "validada" BOOLEAN NOT NULL DEFAULT false,
    "observacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvidenciaEtapa_pkey" PRIMARY KEY ("evidenciaId")
);

-- CreateTable
CREATE TABLE "LiberacaoParcela" (
    "liberacaoId" TEXT NOT NULL,
    "creditoId" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "status" "LiberacaoStatus" NOT NULL DEFAULT 'PENDENTE',
    "motivo" TEXT,
    "externalPaymentId" TEXT,
    "paymentProvider" TEXT,
    "failureReason" TEXT,
    "processadoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiberacaoParcela_pkey" PRIMARY KEY ("liberacaoId")
);

-- CreateTable
CREATE TABLE "ScoreHistorico" (
    "scoreId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "motivo" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoreHistorico_pkey" PRIMARY KEY ("scoreId")
);

-- CreateTable
CREATE TABLE "KycDocumento" (
    "kycDocumentoId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status" "KycDocumentoStatus" NOT NULL DEFAULT 'PENDENTE',
    "motivo_rejeicao" TEXT,
    "analisadoPor" TEXT,
    "analisadoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KycDocumento_pkey" PRIMARY KEY ("kycDocumentoId")
);

-- CreateTable
CREATE TABLE "Notificacao" (
    "notificacaoId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tipo" "TipoNotificacao" NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "link" TEXT,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "lidoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notificacao_pkey" PRIMARY KEY ("notificacaoId")
);

-- CreateTable
CREATE TABLE "EtapaAuditLog" (
    "auditId" TEXT NOT NULL,
    "etapaId" TEXT NOT NULL,
    "acaoTipo" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EtapaAuditLog_pkey" PRIMARY KEY ("auditId")
);

-- CreateTable
CREATE TABLE "KycAuditLog" (
    "auditId" TEXT NOT NULL,
    "kycDocumentoId" TEXT NOT NULL,
    "acaoTipo" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "motivo" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KycAuditLog_pkey" PRIMARY KEY ("auditId")
);

-- CreateTable
CREATE TABLE "PipelineStage" (
    "stageId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "descricao" TEXT,
    "corHex" TEXT NOT NULL DEFAULT '#999999',
    "taxaConversao" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "diasMedioStage" INTEGER NOT NULL DEFAULT 7,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PipelineStage_pkey" PRIMARY KEY ("stageId")
);

-- CreateTable
CREATE TABLE "Lead" (
    "leadId" TEXT NOT NULL,
    "obraId" TEXT,
    "usuarioId" TEXT,
    "atribuidoEm" TIMESTAMP(3),
    "clienteNome" TEXT NOT NULL,
    "clienteEmail" TEXT NOT NULL,
    "clienteTelefone" TEXT NOT NULL,
    "clienteCpf" TEXT,
    "stageId" TEXT NOT NULL,
    "fonte" "LeadFonte" NOT NULL DEFAULT 'WEBSITE',
    "tipoObra" TEXT,
    "segmentoCliente" "LeadSegmento" NOT NULL DEFAULT 'NOVO',
    "condicoes" TEXT,
    "proximoAcompanhamento" TIMESTAMP(3),
    "statusUltimo" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "convertidoEm" TIMESTAMP(3),

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("leadId")
);

-- CreateTable
CREATE TABLE "ConversionScore" (
    "scoreId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "scoreFinal" DOUBLE PRECISION NOT NULL,
    "probabilidadeClosing" DOUBLE PRECISION NOT NULL,
    "dataEstimadaClosing" TIMESTAMP(3),
    "fonteScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "tipoObraScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "segmentoScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "engajamentoScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "historicoScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "versaoAlgoritmo" TEXT NOT NULL DEFAULT 'v1',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversionScore_pkey" PRIMARY KEY ("scoreId")
);

-- CreateTable
CREATE TABLE "LeadActivity" (
    "atividadeId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "tipo" "LeadActivityTipo" NOT NULL,
    "descricao" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadActivity_pkey" PRIMARY KEY ("atividadeId")
);

-- CreateTable
CREATE TABLE "MailingContato" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefone" TEXT,
    "status" "MailingStatus" NOT NULL DEFAULT 'NOVO',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MailingContato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DueDiligence" (
    "id" TEXT NOT NULL,
    "gestorId" TEXT NOT NULL,
    "nomeEmpreendimento" TEXT NOT NULL,
    "tipologia" TEXT,
    "endereco" TEXT,
    "cidade" TEXT,
    "uf" TEXT,
    "totalUnidades" INTEGER,
    "areaTotal" DOUBLE PRECISION,
    "dataEntregaPrevista" TIMESTAMP(3),
    "nomeIncorporadora" TEXT,
    "cnpjIncorporadora" TEXT,
    "modeloAmortizacao" TEXT,
    "totalCarteira" DOUBLE PRECISION,
    "totalAReceber" DOUBLE PRECISION,
    "estruturaSocietaria" TEXT,
    "payload" JSONB NOT NULL,
    "status" "DueDiligenceStatus" NOT NULL DEFAULT 'RASCUNHO',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DueDiligence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos" (
    "documentoId" TEXT NOT NULL,
    "obraId" TEXT,
    "usuarioId" TEXT NOT NULL,
    "tipo" "DocumentoTipo" NOT NULL DEFAULT 'OUTROS',
    "nome" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
    "tamanhoBytes" INTEGER,
    "descricao" TEXT,
    "vencimento" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documentos_pkey" PRIMARY KEY ("documentoId")
);

-- CreateTable
CREATE TABLE "solicitacoes_credito" (
    "solicitacaoId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "obraId" TEXT,
    "valorSolicitado" DOUBLE PRECISION NOT NULL,
    "prazoMeses" INTEGER NOT NULL,
    "taxaMensal" DOUBLE PRECISION NOT NULL,
    "finalidade" TEXT NOT NULL,
    "garantias" TEXT,
    "observacoes" TEXT,
    "vgv" DOUBLE PRECISION,
    "ltv" DOUBLE PRECISION,
    "custoObra" DOUBLE PRECISION,
    "ratingCalculado" TEXT,
    "status" "SolicitacaoStatus" NOT NULL DEFAULT 'PENDENTE',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solicitacoes_credito_pkey" PRIMARY KEY ("solicitacaoId")
);

-- CreateTable
CREATE TABLE "comites_digitais" (
    "comiteId" TEXT NOT NULL,
    "solicitacaoId" TEXT NOT NULL,
    "parecerTecnico" TEXT,
    "parecerEngId" TEXT,
    "parecerEm" TIMESTAMP(3),
    "status" "ComiteStatus" NOT NULL DEFAULT 'ABERTO',
    "decisao" "ComiteDecisao",
    "decisaoMotivo" TEXT,
    "decisaoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comites_digitais_pkey" PRIMARY KEY ("comiteId")
);

-- CreateTable
CREATE TABLE "votos_comite" (
    "votoId" TEXT NOT NULL,
    "comiteId" TEXT NOT NULL,
    "votanteId" TEXT NOT NULL,
    "voto" "VotoDecisao" NOT NULL,
    "justificativa" TEXT,
    "condicoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "votos_comite_pkey" PRIMARY KEY ("votoId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_cpf_key" ON "Usuario"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Usuario_email_idx" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Usuario_cpf_idx" ON "Usuario"("cpf");

-- CreateIndex
CREATE INDEX "Usuario_deletadoEm_idx" ON "Usuario"("deletadoEm");

-- CreateIndex
CREATE UNIQUE INDEX "SessaoToken_refreshToken_key" ON "SessaoToken"("refreshToken");

-- CreateIndex
CREATE INDEX "SessaoToken_usuarioId_idx" ON "SessaoToken"("usuarioId");

-- CreateIndex
CREATE INDEX "usuario_fcm_tokens_ativo_idx" ON "usuario_fcm_tokens"("ativo");

-- CreateIndex
CREATE INDEX "Credito_usuarioId_idx" ON "Credito"("usuarioId");

-- CreateIndex
CREATE INDEX "Credito_status_idx" ON "Credito"("status");

-- CreateIndex
CREATE INDEX "Obra_usuarioId_idx" ON "Obra"("usuarioId");

-- CreateIndex
CREATE INDEX "Obra_creditoId_idx" ON "Obra"("creditoId");

-- CreateIndex
CREATE INDEX "Obra_status_idx" ON "Obra"("status");

-- CreateIndex
CREATE INDEX "EtapaObra_obraId_idx" ON "EtapaObra"("obraId");

-- CreateIndex
CREATE INDEX "EtapaObra_status_idx" ON "EtapaObra"("status");

-- CreateIndex
CREATE UNIQUE INDEX "EtapaObra_obraId_ordem_key" ON "EtapaObra"("obraId", "ordem");

-- CreateIndex
CREATE INDEX "EvidenciaEtapa_etapaId_idx" ON "EvidenciaEtapa"("etapaId");

-- CreateIndex
CREATE INDEX "EvidenciaEtapa_obraId_idx" ON "EvidenciaEtapa"("obraId");

-- CreateIndex
CREATE INDEX "EvidenciaEtapa_validada_idx" ON "EvidenciaEtapa"("validada");

-- CreateIndex
CREATE INDEX "LiberacaoParcela_creditoId_idx" ON "LiberacaoParcela"("creditoId");

-- CreateIndex
CREATE INDEX "LiberacaoParcela_status_idx" ON "LiberacaoParcela"("status");

-- CreateIndex
CREATE INDEX "ScoreHistorico_usuarioId_idx" ON "ScoreHistorico"("usuarioId");

-- CreateIndex
CREATE INDEX "ScoreHistorico_criadoEm_idx" ON "ScoreHistorico"("criadoEm");

-- CreateIndex
CREATE INDEX "KycDocumento_usuarioId_idx" ON "KycDocumento"("usuarioId");

-- CreateIndex
CREATE INDEX "KycDocumento_status_idx" ON "KycDocumento"("status");

-- CreateIndex
CREATE INDEX "KycDocumento_criadoEm_idx" ON "KycDocumento"("criadoEm");

-- CreateIndex
CREATE INDEX "Notificacao_usuarioId_idx" ON "Notificacao"("usuarioId");

-- CreateIndex
CREATE INDEX "Notificacao_lida_idx" ON "Notificacao"("lida");

-- CreateIndex
CREATE INDEX "Notificacao_criadoEm_idx" ON "Notificacao"("criadoEm");

-- CreateIndex
CREATE INDEX "EtapaAuditLog_etapaId_idx" ON "EtapaAuditLog"("etapaId");

-- CreateIndex
CREATE INDEX "EtapaAuditLog_usuarioId_idx" ON "EtapaAuditLog"("usuarioId");

-- CreateIndex
CREATE INDEX "EtapaAuditLog_criadoEm_idx" ON "EtapaAuditLog"("criadoEm");

-- CreateIndex
CREATE INDEX "KycAuditLog_kycDocumentoId_idx" ON "KycAuditLog"("kycDocumentoId");

-- CreateIndex
CREATE INDEX "KycAuditLog_usuarioId_idx" ON "KycAuditLog"("usuarioId");

-- CreateIndex
CREATE INDEX "KycAuditLog_criadoEm_idx" ON "KycAuditLog"("criadoEm");

-- CreateIndex
CREATE UNIQUE INDEX "PipelineStage_nome_key" ON "PipelineStage"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "PipelineStage_ordem_key" ON "PipelineStage"("ordem");

-- CreateIndex
CREATE INDEX "PipelineStage_ordem_idx" ON "PipelineStage"("ordem");

-- CreateIndex
CREATE INDEX "Lead_obraId_idx" ON "Lead"("obraId");

-- CreateIndex
CREATE INDEX "Lead_usuarioId_idx" ON "Lead"("usuarioId");

-- CreateIndex
CREATE INDEX "Lead_stageId_idx" ON "Lead"("stageId");

-- CreateIndex
CREATE INDEX "Lead_fonte_idx" ON "Lead"("fonte");

-- CreateIndex
CREATE INDEX "Lead_segmentoCliente_idx" ON "Lead"("segmentoCliente");

-- CreateIndex
CREATE INDEX "Lead_criadoEm_idx" ON "Lead"("criadoEm");

-- CreateIndex
CREATE INDEX "Lead_convertidoEm_idx" ON "Lead"("convertidoEm");

-- CreateIndex
CREATE INDEX "ConversionScore_leadId_idx" ON "ConversionScore"("leadId");

-- CreateIndex
CREATE INDEX "ConversionScore_scoreFinal_idx" ON "ConversionScore"("scoreFinal");

-- CreateIndex
CREATE INDEX "ConversionScore_atualizadoEm_idx" ON "ConversionScore"("atualizadoEm");

-- CreateIndex
CREATE INDEX "LeadActivity_leadId_idx" ON "LeadActivity"("leadId");

-- CreateIndex
CREATE INDEX "LeadActivity_tipo_idx" ON "LeadActivity"("tipo");

-- CreateIndex
CREATE INDEX "LeadActivity_criadoEm_idx" ON "LeadActivity"("criadoEm");

-- CreateIndex
CREATE INDEX "MailingContato_usuarioId_idx" ON "MailingContato"("usuarioId");

-- CreateIndex
CREATE INDEX "DueDiligence_gestorId_idx" ON "DueDiligence"("gestorId");

-- CreateIndex
CREATE INDEX "DueDiligence_status_idx" ON "DueDiligence"("status");

-- CreateIndex
CREATE INDEX "solicitacoes_credito_usuarioId_idx" ON "solicitacoes_credito"("usuarioId");

-- CreateIndex
CREATE INDEX "solicitacoes_credito_status_idx" ON "solicitacoes_credito"("status");

-- CreateIndex
CREATE UNIQUE INDEX "comites_digitais_solicitacaoId_key" ON "comites_digitais"("solicitacaoId");

-- CreateIndex
CREATE INDEX "comites_digitais_status_idx" ON "comites_digitais"("status");

-- CreateIndex
CREATE INDEX "votos_comite_comiteId_idx" ON "votos_comite"("comiteId");

-- CreateIndex
CREATE UNIQUE INDEX "votos_comite_comiteId_votanteId_key" ON "votos_comite"("comiteId", "votanteId");

-- AddForeignKey
ALTER TABLE "SessaoToken" ADD CONSTRAINT "SessaoToken_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("usuarioId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_fcm_tokens" ADD CONSTRAINT "usuario_fcm_tokens_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("usuarioId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Credito" ADD CONSTRAINT "Credito_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("usuarioId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Obra" ADD CONSTRAINT "Obra_creditoId_fkey" FOREIGN KEY ("creditoId") REFERENCES "Credito"("creditoId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Obra" ADD CONSTRAINT "Obra_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("usuarioId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtapaObra" ADD CONSTRAINT "EtapaObra_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("obraId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenciaEtapa" ADD CONSTRAINT "EvidenciaEtapa_etapaId_fkey" FOREIGN KEY ("etapaId") REFERENCES "EtapaObra"("etapaId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenciaEtapa" ADD CONSTRAINT "EvidenciaEtapa_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("obraId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiberacaoParcela" ADD CONSTRAINT "LiberacaoParcela_creditoId_fkey" FOREIGN KEY ("creditoId") REFERENCES "Credito"("creditoId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreHistorico" ADD CONSTRAINT "ScoreHistorico_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("usuarioId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KycDocumento" ADD CONSTRAINT "KycDocumento_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("usuarioId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacao" ADD CONSTRAINT "Notificacao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("usuarioId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtapaAuditLog" ADD CONSTRAINT "EtapaAuditLog_etapaId_fkey" FOREIGN KEY ("etapaId") REFERENCES "EtapaObra"("etapaId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtapaAuditLog" ADD CONSTRAINT "EtapaAuditLog_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("usuarioId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KycAuditLog" ADD CONSTRAINT "KycAuditLog_kycDocumentoId_fkey" FOREIGN KEY ("kycDocumentoId") REFERENCES "KycDocumento"("kycDocumentoId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KycAuditLog" ADD CONSTRAINT "KycAuditLog_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("usuarioId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("obraId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("usuarioId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "PipelineStage"("stageId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversionScore" ADD CONSTRAINT "ConversionScore_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("leadId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("leadId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailingContato" ADD CONSTRAINT "MailingContato_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("usuarioId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DueDiligence" ADD CONSTRAINT "DueDiligence_gestorId_fkey" FOREIGN KEY ("gestorId") REFERENCES "Usuario"("usuarioId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("obraId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("usuarioId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes_credito" ADD CONSTRAINT "solicitacoes_credito_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("usuarioId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comites_digitais" ADD CONSTRAINT "comites_digitais_solicitacaoId_fkey" FOREIGN KEY ("solicitacaoId") REFERENCES "solicitacoes_credito"("solicitacaoId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votos_comite" ADD CONSTRAINT "votos_comite_comiteId_fkey" FOREIGN KEY ("comiteId") REFERENCES "comites_digitais"("comiteId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votos_comite" ADD CONSTRAINT "votos_comite_votanteId_fkey" FOREIGN KEY ("votanteId") REFERENCES "Usuario"("usuarioId") ON DELETE CASCADE ON UPDATE CASCADE;
