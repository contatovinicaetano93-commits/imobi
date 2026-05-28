import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../modules/prisma/prisma.service";

export enum AuditEvent {
  USER_SIGNUP = "USER_SIGNUP",
  USER_LOGIN = "USER_LOGIN",
  KYC_UPLOAD = "KYC_UPLOAD",
  KYC_APPROVAL = "KYC_APPROVAL",
  KYC_REJECTION = "KYC_REJECTION",
  CREDIT_REQUESTED = "CREDIT_REQUESTED",
  CREDIT_APPROVED = "CREDIT_APPROVED",
  PAYMENT_RELEASED = "PAYMENT_RELEASED",
  STAGE_COMPLETED = "STAGE_COMPLETED",
  EVIDENCE_UPLOAD = "EVIDENCE_UPLOAD",
  STAGE_APPROVAL = "STAGE_APPROVAL",
  STAGE_REJECTION = "STAGE_REJECTION",
  TOKEN_REFRESH = "TOKEN_REFRESH",
  USER_REGISTRATION = "USER_REGISTRATION",
}

interface AuditLog {
  event: AuditEvent;
  usuarioId: string;
  timestamp: Date;
  details: Record<string, unknown>;
  ipAddress?: string;
}

interface AdminAuditLog {
  usuarioId: string;
  adminId: string;
  acao: string;
  descricao?: string;
  mudancasAntes?: Record<string, unknown>;
  mudancasDepois?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma?: PrismaService) {}

  log(auditLog: AuditLog): void {
    this.logger.log(
      `[${auditLog.event}] User: ${auditLog.usuarioId} | Details: ${JSON.stringify(auditLog.details)} | IP: ${auditLog.ipAddress || "unknown"}`,
      AuditService.name
    );
  }

  async registrar(log: AdminAuditLog): Promise<void> {
    if (!this.prisma) {
      this.logger.warn(
        `PrismaService not available for audit logging`,
        AuditService.name
      );
      return;
    }

    try {
      await this.prisma.auditLog.create({
        data: {
          usuarioId: log.usuarioId,
          adminId: log.adminId,
          acao: log.acao,
          descricao: log.descricao,
          mudancasAntes: log.mudancasAntes ? JSON.stringify(log.mudancasAntes) : null,
          mudancasDepois: log.mudancasDepois ? JSON.stringify(log.mudancasDepois) : null,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
        },
      });

      this.logger.log(
        `[ADMIN_AUDIT] Admin: ${log.adminId} | Action: ${log.acao} | User: ${log.usuarioId}`,
        AuditService.name
      );
    } catch (error) {
      this.logger.error(
        `Failed to register audit log: ${error}`,
        AuditService.name
      );
    }
  }

  logUserSignup(usuarioId: string, email: string, ipAddress?: string): void {
    this.log({
      event: AuditEvent.USER_SIGNUP,
      usuarioId,
      timestamp: new Date(),
      details: { email },
      ipAddress,
    });
  }

  logUserLogin(usuarioId: string, email: string, ipAddress?: string): void {
    this.log({
      event: AuditEvent.USER_LOGIN,
      usuarioId,
      timestamp: new Date(),
      details: { email },
      ipAddress,
    });
  }

  logKycUpload(usuarioId: string, documentoId: string, tipo: string, ipAddress?: string): void {
    this.log({
      event: AuditEvent.KYC_UPLOAD,
      usuarioId,
      timestamp: new Date(),
      details: { documentoId, tipo },
      ipAddress,
    });
  }

  logKycApproval(usuarioId: string, documentoId: string, gestorId?: string, ipAddress?: string): void {
    this.log({
      event: AuditEvent.KYC_APPROVAL,
      usuarioId,
      timestamp: new Date(),
      details: { documentoId, gestorId },
      ipAddress,
    });
  }

  logKycRejection(usuarioId: string, documentoId: string, motivo: string, gestorId?: string, ipAddress?: string): void {
    this.log({
      event: AuditEvent.KYC_REJECTION,
      usuarioId,
      timestamp: new Date(),
      details: { documentoId, motivo, gestorId },
      ipAddress,
    });
  }

  logCreditRequested(usuarioId: string, creditoId: string, valorSolicitado: number, prazoMeses: number, ipAddress?: string): void {
    this.log({
      event: AuditEvent.CREDIT_REQUESTED,
      usuarioId,
      timestamp: new Date(),
      details: { creditoId, valorSolicitado, prazoMeses },
      ipAddress,
    });
  }

  logCreditApproved(usuarioId: string, creditoId: string, valorAprovado: number, ipAddress?: string): void {
    this.log({
      event: AuditEvent.CREDIT_APPROVED,
      usuarioId,
      timestamp: new Date(),
      details: { creditoId, valorAprovado },
      ipAddress,
    });
  }

  logPaymentReleased(usuarioId: string, creditoId: string, parcelaNum: number, valor: number, ipAddress?: string): void {
    this.log({
      event: AuditEvent.PAYMENT_RELEASED,
      usuarioId,
      timestamp: new Date(),
      details: { creditoId, parcelaNum, valor },
      ipAddress,
    });
  }

  logStageCompleted(usuarioId: string, etapaId: string, obraId: string, ipAddress?: string): void {
    this.log({
      event: AuditEvent.STAGE_COMPLETED,
      usuarioId,
      timestamp: new Date(),
      details: { etapaId, obraId },
      ipAddress,
    });
  }

  logEvidenceUpload(usuarioId: string, obraId: string, ipAddress?: string): void {
    this.log({
      event: AuditEvent.EVIDENCE_UPLOAD,
      usuarioId,
      timestamp: new Date(),
      details: { obraId },
      ipAddress,
    });
  }

  logStageApproval(usuarioId: string, etapaId: string, ipAddress?: string): void {
    this.log({
      event: AuditEvent.STAGE_APPROVAL,
      usuarioId,
      timestamp: new Date(),
      details: { etapaId },
      ipAddress,
    });
  }

  logStageRejection(usuarioId: string, etapaId: string, motivo: string, ipAddress?: string): void {
    this.log({
      event: AuditEvent.STAGE_REJECTION,
      usuarioId,
      timestamp: new Date(),
      details: { etapaId, motivo },
      ipAddress,
    });
  }

  logTokenRefresh(usuarioId: string, ipAddress?: string): void {
    this.log({
      event: AuditEvent.TOKEN_REFRESH,
      usuarioId,
      timestamp: new Date(),
      details: {},
      ipAddress,
    });
  }

  logUserRegistration(usuarioId: string, email: string, ipAddress?: string): void {
    this.log({
      event: AuditEvent.USER_REGISTRATION,
      usuarioId,
      timestamp: new Date(),
      details: { email },
      ipAddress,
    });
  }
}
