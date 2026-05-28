import { Injectable, Logger } from "@nestjs/common";

export enum AuditEvent {
  KYC_APPROVAL = "KYC_APPROVAL",
  KYC_REJECTION = "KYC_REJECTION",
  EVIDENCE_UPLOAD = "EVIDENCE_UPLOAD",
  PAYMENT_RELEASE = "PAYMENT_RELEASE",
  STAGE_APPROVAL = "STAGE_APPROVAL",
  STAGE_REJECTION = "STAGE_REJECTION",
  TOKEN_REFRESH = "TOKEN_REFRESH",
  USER_LOGIN = "USER_LOGIN",
  USER_REGISTRATION = "USER_REGISTRATION",
}

interface AuditLog {
  event: AuditEvent;
  usuarioId: string;
  timestamp: Date;
  details: Record<string, unknown>;
  ipAddress?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  log(auditLog: AuditLog): void {
    this.logger.log(
      `[${auditLog.event}] User: ${auditLog.usuarioId} | Details: ${JSON.stringify(auditLog.details)} | IP: ${auditLog.ipAddress || "unknown"}`,
      AuditService.name
    );
  }

  logKycApproval(usuarioId: string, documentoId: string, ipAddress?: string): void {
    this.log({
      event: AuditEvent.KYC_APPROVAL,
      usuarioId,
      timestamp: new Date(),
      details: { documentoId },
      ipAddress,
    });
  }

  logKycRejection(usuarioId: string, documentoId: string, motivo: string, ipAddress?: string): void {
    this.log({
      event: AuditEvent.KYC_REJECTION,
      usuarioId,
      timestamp: new Date(),
      details: { documentoId, motivo },
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

  logPaymentRelease(usuarioId: string, creditoId: string, parcelaNum: number, ipAddress?: string): void {
    this.log({
      event: AuditEvent.PAYMENT_RELEASE,
      usuarioId,
      timestamp: new Date(),
      details: { creditoId, parcelaNum },
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

  logUserLogin(usuarioId: string, email: string, ipAddress?: string): void {
    this.log({
      event: AuditEvent.USER_LOGIN,
      usuarioId,
      timestamp: new Date(),
      details: { email },
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
