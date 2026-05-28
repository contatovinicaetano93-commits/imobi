import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../modules/prisma/prisma.service";
import { Buffer } from "buffer";

@Injectable()
export class PdfExportService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate a work report PDF with evidence and stages
   * Using simple HTML-to-PDF approach (base64 PDF format for now)
   * In production, consider using puppeteer or similar
   */
  async generateObraRelatorioPDF(obraId: string): Promise<Buffer> {
    const obra = await this.prisma.obra.findUnique({
      where: { obraId },
      include: {
        usuario: {
          select: {
            nome: true,
            email: true,
          },
        },
        etapas: {
          include: {
            evidencias: {
              select: {
                evidenciaId: true,
                fotoUrl: true,
                validada: true,
                latCaptura: true,
                lngCaptura: true,
              },
            },
          },
          orderBy: { ordem: "asc" },
        },
        credito: {
          select: {
            creditoId: true,
            valorAprovado: true,
            valorLiberado: true,
          },
        },
      },
    });

    if (!obra) {
      throw new NotFoundException(`Obra não encontrada: ${obraId}`);
    }

    // Calculate progress
    const totalEtapas = obra.etapas.length;
    const etapasCompletas = obra.etapas.filter(
      (e) => e.status === "CONCLUIDA"
    ).length;
    const progressPercent =
      totalEtapas > 0 ? Math.round((etapasCompletas / totalEtapas) * 100) : 0;

    const htmlContent = this.buildObraRelatoriHTML(obra, progressPercent);
    return this.htmlToPDF(htmlContent, `relatorio-obra-${obraId}`);
  }

  /**
   * Generate a credit contract PDF
   */
  async generateCreditoContratoPDF(creditoId: string): Promise<Buffer> {
    const credito = await this.prisma.credito.findUnique({
      where: { creditoId },
      include: {
        usuario: {
          select: {
            nome: true,
            email: true,
            cpfHash: true,
            telefone: true,
          },
        },
      },
    });

    if (!credito) {
      throw new NotFoundException(`Crédito não encontrado: ${creditoId}`);
    }

    const htmlContent = this.buildCreditoContratoHTML(credito);
    return this.htmlToPDF(htmlContent, `contrato-credito-${creditoId}`);
  }

  /**
   * Generate a KYC approval certificate
   */
  async generateKycComprovantePDF(usuarioId: string): Promise<Buffer> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { usuarioId },
      include: {
        kycDocumentos: {
          where: {
            status: "APROVADO",
          },
          select: {
            tipo: true,
            analisadoEm: true,
          },
        },
      },
    });

    if (!usuario) {
      throw new NotFoundException(`Usuário não encontrado: ${usuarioId}`);
    }

    if (usuario.kycStatus !== "APROVADO") {
      throw new BadRequestException(
        "Usuário não possui KYC aprovado para gerar comprovante"
      );
    }

    const htmlContent = this.buildKycComprovanteHTML(usuario);
    return this.htmlToPDF(htmlContent, `comprovante-kyc-${usuarioId}`);
  }

  /**
   * Build HTML for obra relatório
   */
  private buildObraRelatoriHTML(obra: any, progressPercent: number): string {
    const etapasHTML = obra.etapas
      .map(
        (etapa: any, idx: number) => `
        <div style="margin-bottom: 30px; border: 1px solid #ddd; padding: 15px; border-radius: 8px;">
          <h3 style="margin: 0 0 10px 0; color: #1f2937; font-size: 16px;">
            Etapa ${idx + 1}: ${etapa.nome}
          </h3>
          <p style="margin: 5px 0; font-size: 14px; color: #6b7280;">
            <strong>Status:</strong> ${this.translateEtapaStatus(etapa.status)}<br/>
            <strong>Percentual da obra:</strong> ${etapa.percentualObra}%<br/>
            <strong>Valor liberação:</strong> R$ ${etapa.valorLiberacao.toFixed(2)}<br/>
            <strong>Evidências:</strong> ${etapa.evidencias.length}
          </p>
          ${
            etapa.evidencias.length > 0
              ? `<p style="font-size: 12px; color: #6b7280;">
              ${etapa.evidencias.map((ev: any) => `✓ ${ev.evidenciaId} (${ev.validada ? "Validada" : "Pendente"})`).join("<br/>")}
            </p>`
              : ""
          }
        </div>
      `
      )
      .join("");

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <style>
          body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; margin: 0; padding: 20px; }
          h1 { color: #1f2937; margin-bottom: 10px; }
          h2 { color: #374151; margin-top: 30px; margin-bottom: 15px; border-bottom: 2px solid #dbeafe; padding-bottom: 10px; }
          .header { background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 15px 0; }
          .info-item { padding: 10px; background-color: #f9fafb; border-radius: 4px; }
          .progress-bar { width: 100%; height: 20px; background-color: #e5e7eb; border-radius: 10px; overflow: hidden; margin: 10px 0; }
          .progress-fill { height: 100%; background-color: #10b981; width: ${progressPercent}%; }
          .label { font-weight: bold; color: #374151; }
          .value { color: #1f2937; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Relatório de Obra</h1>
          <p>Data de geração: ${new Date().toLocaleDateString("pt-BR")}</p>
        </div>

        <h2>Informações Gerais</h2>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">Nome:</span> <span class="value">${obra.nome}</span>
          </div>
          <div class="info-item">
            <span class="label">Endereço:</span> <span class="value">${obra.endereco}</span>
          </div>
          <div class="info-item">
            <span class="label">Responsável:</span> <span class="value">${obra.usuario.nome}</span>
          </div>
          <div class="info-item">
            <span class="label">Email:</span> <span class="value">${obra.usuario.email}</span>
          </div>
          <div class="info-item">
            <span class="label">Status:</span> <span class="value">${this.translateObraStatus(obra.status)}</span>
          </div>
          <div class="info-item">
            <span class="label">Área:</span> <span class="value">${obra.areaM2 ? obra.areaM2 + " m²" : "N/A"}</span>
          </div>
        </div>

        <h2>Progresso</h2>
        <p><strong>Conclusão:</strong> ${progressPercent}% (${etapasCompletas} de ${totalEtapas} etapas)</p>
        <div class="progress-bar">
          <div class="progress-fill"></div>
        </div>

        ${obra.credito ? `
          <h2>Crédito Associado</h2>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">Valor Aprovado:</span> <span class="value">R$ ${obra.credito.valorAprovado.toFixed(2)}</span>
            </div>
            <div class="info-item">
              <span class="label">Valor Liberado:</span> <span class="value">R$ ${obra.credito.valorLiberado.toFixed(2)}</span>
            </div>
          </div>
        ` : ""}

        <h2>Etapas</h2>
        ${etapasHTML}
      </body>
      </html>
    `;
  }

  /**
   * Build HTML for credit contract
   */
  private buildCreditoContratoHTML(credito: any): string {
    const totalAPagar = credito.valorAprovado * (1 + credito.taxaMensal * credito.prazoMeses);
    const dataVencimento = new Date();
    dataVencimento.setMonth(dataVencimento.getMonth() + credito.prazoMeses);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <style>
          body { font-family: 'Georgia', serif; color: #333; line-height: 1.8; margin: 0; padding: 40px; }
          .header { text-align: center; margin-bottom: 40px; border-bottom: 3px solid #1f2937; padding-bottom: 20px; }
          .header h1 { margin: 0; color: #1f2937; font-size: 28px; }
          .header p { margin: 5px 0; color: #6b7280; }
          .content { max-width: 800px; margin: 0 auto; }
          .section { margin: 30px 0; }
          .section-title { font-weight: bold; margin-bottom: 15px; color: #1f2937; font-size: 14px; text-transform: uppercase; }
          .clause { margin: 15px 0; text-align: justify; }
          .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 30px; }
          .party { text-align: center; padding-top: 40px; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb; }
          th { background-color: #f3f4f6; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>CONTRATO DE CRÉDITO IMOBILIÁRIO</h1>
          <p>Celebrado em ${new Date().toLocaleDateString("pt-BR")}</p>
        </div>

        <div class="content">
          <div class="section">
            <div class="section-title">Partes Contratantes</div>
            <p><strong>Mutuária:</strong> ${credito.usuario.nome}</p>
            <p><strong>CPF:</strong> ${credito.usuario.cpfHash}</p>
            <p><strong>Email:</strong> ${credito.usuario.email}</p>
            <p><strong>Telefone:</strong> ${credito.usuario.telefone || "N/A"}</p>
          </div>

          <div class="section">
            <div class="section-title">Condições do Crédito</div>
            <table>
              <tr>
                <th>Descrição</th>
                <th>Valor</th>
              </tr>
              <tr>
                <td>Valor Principal Aprovado</td>
                <td>R$ ${credito.valorAprovado.toFixed(2)}</td>
              </tr>
              <tr>
                <td>Taxa Mensal</td>
                <td>${(credito.taxaMensal * 100).toFixed(2)}%</td>
              </tr>
              <tr>
                <td>Prazo (Meses)</td>
                <td>${credito.prazoMeses}</td>
              </tr>
              <tr>
                <td><strong>Valor Total a Pagar</strong></td>
                <td><strong>R$ ${totalAPagar.toFixed(2)}</strong></td>
              </tr>
            </table>
          </div>

          <div class="section">
            <div class="section-title">Termos e Condições</div>
            <div class="clause">
              <strong>1. Objeto:</strong> A MUTUANTE concede crédito no valor de R$ ${credito.valorAprovado.toFixed(2)} à MUTUÁRIA, para ser utilizado em projetos imobiliários de sua responsabilidade.
            </div>
            <div class="clause">
              <strong>2. Prazo:</strong> O crédito deverá ser liquidado em ${credito.prazoMeses} parcelas mensais, vencendo em ${dataVencimento.toLocaleDateString("pt-BR")}.
            </div>
            <div class="clause">
              <strong>3. Juros:</strong> Incidirá juros mensais de ${(credito.taxaMensal * 100).toFixed(2)}% sobre o saldo devedor.
            </div>
            <div class="clause">
              <strong>4. Penalidades:</strong> Atrasos superiores a 30 dias resultarão em multa de 2% do valor devido e taxa de administração de 1%.
            </div>
          </div>

          <div class="parties">
            <div class="party">
              <p>_________________________</p>
              <p>${credito.usuario.nome}</p>
              <p>MUTUÁRIA</p>
            </div>
            <div class="party">
              <p>_________________________</p>
              <p>REPRESENTANTE IMBOBI</p>
              <p>MUTUANTE</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Build HTML for KYC approval certificate
   */
  private buildKycComprovanteHTML(usuario: any): string {
    const documentos = usuario.kycDocumentos
      .map(
        (doc: any) => `
        <tr>
          <td>${doc.tipo}</td>
          <td>${new Date(doc.analisadoEm).toLocaleDateString("pt-BR")}</td>
          <td>✓ Aprovado</td>
        </tr>
      `
      )
      .join("");

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <style>
          body { font-family: Arial, sans-serif; color: #333; margin: 0; padding: 20px; background-color: #f9fafb; }
          .certificate { max-width: 600px; margin: 40px auto; background-color: white; padding: 40px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #10b981; padding-bottom: 20px; }
          .header h1 { margin: 0; color: #10b981; font-size: 24px; }
          .header p { margin: 5px 0; color: #6b7280; font-size: 12px; }
          .content { text-align: center; margin: 30px 0; }
          .content p { margin: 10px 0; }
          .highlight { font-weight: bold; color: #1f2937; font-size: 16px; }
          .date { margin-top: 30px; font-size: 12px; color: #9ca3af; }
          table { width: 100%; margin-top: 20px; border-collapse: collapse; }
          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
          th { background-color: #f3f4f6; font-weight: bold; }
          .seal { text-align: center; margin-top: 40px; font-size: 40px; }
        </style>
      </head>
      <body>
        <div class="certificate">
          <div class="header">
            <h1>COMPROVANTE DE APROVAÇÃO KYC</h1>
            <p>Conhecimento do Cliente Validado</p>
          </div>

          <div class="content">
            <p>Certificamos que <span class="highlight">${usuario.nome}</span></p>
            <p>passou com êxito por todos os processos de validação de identidade</p>
            <p>e está autorizado a utilizar os serviços da plataforma IMBOBI.</p>
          </div>

          <table>
            <thead>
              <tr>
                <th>Documento</th>
                <th>Data de Análise</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${documentos}
            </tbody>
          </table>

          <div class="seal">✓</div>

          <div class="date">
            <p>Emitido em: ${new Date().toLocaleDateString("pt-BR")}</p>
            <p>Válido por: 2 anos</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Convert HTML to PDF (simplified version - returns base64 for now)
   * In production, use puppeteer or pdfkit library
   */
  private htmlToPDF(
    html: string,
    filename: string
  ): Buffer {
    // This is a placeholder implementation
    // In production, use: puppeteer, pdfkit, or html2pdf
    // For now, return a simple placeholder PDF
    const pdfHeader = Buffer.from(
      "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
    );
    const pdfContent = Buffer.from(
      `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length ${html.length} >>\nstream\n${html}\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000074 00000 n\n0000000133 00000 n\n0000000244 00000 n\ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${html.length + 320}\n%%EOF`
    );

    return Buffer.concat([pdfHeader, pdfContent]);
  }

  private translateObraStatus(status: string): string {
    const map: { [key: string]: string } = {
      PLANEJAMENTO: "Planejamento",
      EM_EXECUCAO: "Em Execução",
      PAUSADA: "Pausada",
      CONCLUIDA: "Concluída",
      CANCELADA: "Cancelada",
    };
    return map[status] || status;
  }

  private translateEtapaStatus(status: string): string {
    const map: { [key: string]: string } = {
      PLANEJADA: "Planejada",
      EM_EXECUCAO: "Em Execução",
      AGUARDANDO_VISTORIA: "Aguardando Vistoria",
      REPROVADA: "Reprovada",
      CONCLUIDA: "Concluída",
    };
    return map[status] || status;
  }
}
