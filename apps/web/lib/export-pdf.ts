/**
 * PDF Export Utilities
 * Helps generate downloadable PDF documents from page content
 */

export interface ExportOptions {
  filename: string;
  title?: string;
  subtitle?: string;
}

/**
 * Generate a simple CSV export (for amortization tables)
 * @param data Array of objects to convert to CSV
 * @param filename Name of the file to download
 */
export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  filename: string
): void {
  if (!data || data.length === 0) {
    console.warn("No data to export");
    return;
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);

  // Create CSV content
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          // Escape quotes and wrap in quotes if contains comma
          if (typeof value === "string" && value.includes(",")) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value?.toString() ?? "";
        })
        .join(",")
    ),
  ].join("\n");

  // Create blob and download
  downloadFile(csvContent, filename, "text/csv;charset=utf-8;");
}

/**
 * Export data as JSON (for programmatic use)
 */
export function exportToJSON<T>(data: T, filename: string): void {
  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(jsonContent, filename, "application/json;charset=utf-8;");
}

/**
 * Helper to trigger file download
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const element = document.createElement("a");
  element.setAttribute("href", `data:${mimeType}base64,${btoa(content)}`);
  element.setAttribute("download", filename);
  element.style.display = "none";
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

/**
 * Generate HTML content for printing credit simulator results
 */
export function generateSimulatorPrintContent(
  values: {
    valorSolicitado: number;
    prazoMeses: number;
    taxaMensal: number;
    parcelaMensal: number;
    totalPago: number;
    totalJuros: number;
    cet: number;
  },
  amortizationSchedule?: Array<{
    parcela: number;
    saldo_inicial: number;
    juros: number;
    amortizacao: number;
    pagamento: number;
    saldo_devedor: number;
  }>
): string {
  const dateStr = new Date().toLocaleDateString("pt-BR");

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Simulação de Crédito - IMOBI</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          max-width: 900px;
          margin: 0 auto;
          padding: 40px 20px;
          color: #333;
          background: #f9fafb;
        }
        .container {
          background: white;
          border-radius: 12px;
          padding: 40px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #1B4FD8;
          padding-bottom: 20px;
        }
        .header h1 {
          margin: 0;
          color: #0C1A3D;
          font-size: 28px;
        }
        .header p {
          margin: 5px 0 0 0;
          color: #666;
          font-size: 14px;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin: 30px 0;
        }
        .summary-item {
          padding: 15px;
          background: #f3f4f6;
          border-radius: 8px;
          border-left: 4px solid #1B4FD8;
        }
        .summary-item.highlight {
          background: #1B4FD8;
          color: white;
        }
        .summary-item h3 {
          margin: 0;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #666;
          font-weight: 600;
        }
        .summary-item.highlight h3 {
          color: rgba(255,255,255,0.8);
        }
        .summary-item p {
          margin: 5px 0 0 0;
          font-size: 20px;
          font-weight: bold;
        }
        .summary-item.highlight p {
          color: white;
        }
        .table-section {
          margin-top: 40px;
        }
        .table-section h2 {
          font-size: 16px;
          margin-bottom: 15px;
          color: #0C1A3D;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        thead {
          background: #f3f4f6;
          border-bottom: 2px solid #ddd;
        }
        th {
          padding: 10px;
          text-align: right;
          font-weight: 600;
          color: #666;
        }
        th:first-child {
          text-align: left;
        }
        td {
          padding: 10px;
          text-align: right;
          border-bottom: 1px solid #eee;
        }
        td:first-child {
          text-align: left;
        }
        tr:nth-child(even) {
          background: #f9fafb;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #eee;
          font-size: 12px;
          color: #999;
          text-align: center;
        }
        .currency {
          font-family: 'Courier New', monospace;
        }
        @media (max-width: 600px) {
          .summary-grid {
            grid-template-columns: 1fr;
          }
          body {
            padding: 20px;
          }
          .container {
            padding: 20px;
          }
        }
        @media print {
          body {
            background: white;
            padding: 0;
          }
          .container {
            box-shadow: none;
            padding: 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Simulação de Crédito</h1>
          <p>IMOBI — Plataforma de Crédito Imobiliário</p>
          <p style="font-size: 12px; color: #999; margin-top: 10px;">Gerado em ${dateStr}</p>
        </div>

        <div class="summary-grid">
          <div class="summary-item">
            <h3>Valor Solicitado</h3>
            <p class="currency">R$ ${values.valorSolicitado.toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}</p>
          </div>
          <div class="summary-item">
            <h3>Prazo</h3>
            <p>${values.prazoMeses} meses</p>
          </div>
          <div class="summary-item">
            <h3>Taxa Mensal</h3>
            <p>${values.taxaMensal.toFixed(3)}%</p>
          </div>
          <div class="summary-item highlight">
            <h3>Parcela Mensal</h3>
            <p class="currency">R$ ${values.parcelaMensal.toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}</p>
          </div>
          <div class="summary-item">
            <h3>Total de Juros</h3>
            <p class="currency">R$ ${values.totalJuros.toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}</p>
          </div>
          <div class="summary-item">
            <h3>CET (Custo Efetivo Total)</h3>
            <p>${values.cet.toFixed(3)}%</p>
          </div>
        </div>

        ${
          amortizationSchedule && amortizationSchedule.length > 0
            ? `
          <div class="table-section">
            <h2>Cronograma de Amortização</h2>
            <table>
              <thead>
                <tr>
                  <th>Parcela</th>
                  <th>Saldo Inicial</th>
                  <th>Juros</th>
                  <th>Amortização</th>
                  <th>Pagamento</th>
                  <th>Saldo Devedor</th>
                </tr>
              </thead>
              <tbody>
                ${amortizationSchedule
                  .map(
                    (row) => `
                  <tr>
                    <td>${row.parcela}</td>
                    <td class="currency">R$ ${row.saldo_inicial.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}</td>
                    <td class="currency">R$ ${row.juros.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}</td>
                    <td class="currency">R$ ${row.amortizacao.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}</td>
                    <td class="currency"><strong>R$ ${row.pagamento.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}</strong></td>
                    <td class="currency">R$ ${row.saldo_devedor.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}</td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        `
            : ""
        }

        <div class="footer">
          <p>
            Esta simulação é apenas para fins informativos e não constitui uma proposta de crédito.
            Para mais informações, entre em contato com nossa equipe de vendas.
          </p>
          <p style="margin-top: 10px;">
            IMOBI — Crédito Imobiliário Seguro e Rápido
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Open print dialog with HTML content
 */
export function openPrintDialog(htmlContent: string, title: string = "Documento"): void {
  const printWindow = window.open("", "", "height=600,width=800");
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.title = title;
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
}

/**
 * Download HTML as PDF using print-to-PDF (browser native)
 */
export async function downloadAsPDF(
  htmlContent: string,
  filename: string
): Promise<void> {
  const printWindow = window.open("", "", "height=600,width=800");
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.title = filename;
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
}
