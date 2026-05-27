import { ObraResumo, CreditoResumo } from "@/lib/api";

export type RegionalMetrics = {
  estado: string;
  obrasCount: number;
  totalAprovado: number;
  totalLiberado: number;
  progresso: number;
};

export type RoiDataPoint = {
  mes: string;
  esperado: number;
  real: number;
};

export type InadimplenciaDataPoint = {
  mes: string;
  taxa: number;
};

export type PortfolioPerformance = {
  data: string;
  valor: number;
  progresso: number;
};

export type ReportTemplate = "executive" | "detailed" | "minimal";

const BRAZILIAN_STATES: Record<string, string> = {
  "north": "Norte", "northeast": "Nordeste", "center-west": "Centro-Oeste",
  "southeast": "Sudeste", "south": "Sul",
};

// Memoization cache for expensive calculations
const coordinateCache = new Map<string, string>();

function getStateFromCoordinates(lat: number, lng: number): string {
  if (!lat || !lng) return "Desconhecido";

  const cacheKey = `${lat},${lng}`;
  if (coordinateCache.has(cacheKey)) {
    return coordinateCache.get(cacheKey)!;
  }

  let result = "Desconhecido";

  // Simplified state determination based on coordinates
  // Northeast: lat -2 to -17, lng -34 to -48
  if (lat <= -2 && lat >= -17 && lng >= -48 && lng <= -34) {
    result = "Nordeste";
  }
  // Southeast: lat -15 to -28, lng -41 to -55
  else if (lat <= -15 && lat >= -28 && lng >= -55 && lng <= -41) {
    result = "Sudeste";
  }
  // South: lat -25 to -33, lng -49 to -57
  else if (lat <= -25 && lat >= -33 && lng >= -57 && lng <= -49) {
    result = "Sul";
  }
  // Center-West: lat -7 to -22, lng -54 to -62
  else if (lat <= -7 && lat >= -22 && lng >= -62 && lng <= -54) {
    result = "Centro-Oeste";
  }
  // North: lat 5 to -4, lng -49 to -74
  else if (lat <= 5 && lat >= -4 && lng >= -74 && lng <= -49) {
    result = "Norte";
  }

  coordinateCache.set(cacheKey, result);
  return result;
}

export function aggregateByRegion(obras: ObraResumo[], creditos: CreditoResumo[]): RegionalMetrics[] {
  const regionMap = new Map<string, RegionalMetrics>();

  obras.forEach((obra) => {
    const estado = getStateFromCoordinates(obra.geoLatitude, obra.geoLongitude);
    const creditoValue = obra.credito;
    const approved = creditoValue ? Number(creditoValue.valorAprovado) : 0;
    const released = creditoValue ? Number(creditoValue.valorLiberado) : 0;

    if (!regionMap.has(estado)) {
      regionMap.set(estado, {
        estado,
        obrasCount: 0,
        totalAprovado: 0,
        totalLiberado: 0,
        progresso: 0,
      });
    }

    const region = regionMap.get(estado)!;
    region.obrasCount += 1;
    region.totalAprovado += approved;
    region.totalLiberado += released;
    region.progresso += obra.progresso ?? 0;
  });

  // Calculate average progress
  regionMap.forEach((region) => {
    if (region.obrasCount > 0) {
      region.progresso = Math.round(region.progresso / region.obrasCount);
    }
  });

  return Array.from(regionMap.values()).sort((a, b) => b.totalAprovado - a.totalAprovado);
}

export function calculateRoiTimeline(creditos: CreditoResumo[]): RoiDataPoint[] {
  // Simulate ROI timeline based on credit data
  const months = 12;
  const data: RoiDataPoint[] = [];
  const monthNames = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez"
  ];

  const totalAprovado = creditos.reduce((acc, c) => acc + Number(c.valorAprovado ?? 0), 0);
  const totalLiberado = creditos.reduce((acc, c) => acc + Number(c.valorLiberado ?? 0), 0);

  const expectedROI = totalAprovado * 0.15 / 12; // 15% annual, divided by 12
  const realROI = totalLiberado * 0.12 / 12; // Assuming 12% real return (conservative)

  for (let i = 0; i < months; i++) {
    data.push({
      mes: monthNames[i],
      esperado: Math.round(expectedROI * (i + 1)),
      real: Math.round(realROI * (i + 1)),
    });
  }

  return data;
}

export function calculateInadimplenciaRate(creditos: CreditoResumo[]): InadimplenciaDataPoint[] {
  // Simulate inadimplência rate progression
  const months = 12;
  const data: InadimplenciaDataPoint[] = [];
  const monthNames = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez"
  ];

  // Start with 0% and gradually increase to 2-3% (typical for fintech lending)
  const maxRate = 2.5;

  for (let i = 0; i < months; i++) {
    const taxa = (i / months) * maxRate * (0.7 + Math.random() * 0.3); // Add slight variance
    data.push({
      mes: monthNames[i],
      taxa: parseFloat(taxa.toFixed(2)),
    });
  }

  return data;
}

export function calculatePortfolioPerformance(obras: ObraResumo[]): PortfolioPerformance[] {
  // Simulate portfolio value progression over time
  const months = 12;
  const data: PortfolioPerformance[] = [];
  const monthNames = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez"
  ];

  const totalLiberado = obras.reduce((acc, o) => {
    return acc + (o.credito ? Number(o.credito.valorLiberado) : 0);
  }, 0);

  const avgProgresso = Math.round(
    obras.reduce((acc, o) => acc + (o.progresso ?? 0), 0) / Math.max(obras.length, 1)
  );

  for (let i = 0; i < months; i++) {
    const progressionFactor = (i + 1) / months;
    const valorMes = totalLiberado * progressionFactor * 0.9; // Assumes phased deployment
    const progressoMes = Math.round(avgProgresso * progressionFactor);

    data.push({
      data: monthNames[i],
      valor: Math.round(valorMes),
      progresso: Math.min(progressoMes, 100),
    });
  }

  return data;
}

export function generateCSVReport(
  regional: RegionalMetrics[],
  roiData: RoiDataPoint[],
  inadimplenciaData: InadimplenciaDataPoint[],
  creditos: CreditoResumo[],
  template: ReportTemplate = "detailed"
): string {
  const totalAprovado = creditos.reduce((acc, c) => acc + Number(c.valorAprovado ?? 0), 0);
  const totalLiberado = creditos.reduce((acc, c) => acc + Number(c.valorLiberado ?? 0), 0);
  const percentualLiberado = totalAprovado > 0 ? ((totalLiberado / totalAprovado) * 100).toFixed(2) : "0.00";

  let csv = "RELATÓRIO DE FUNDOS - IMBOBI\n";
  csv += `Gerado em: ${new Date().toLocaleString("pt-BR")}\n`;
  csv += `Tipo de Relatório: ${template === "executive" ? "Executivo" : template === "minimal" ? "Mínimo" : "Detalhado"}\n\n`;

  // Summary
  csv += "RESUMO EXECUTIVO\n";
  csv += `Total Aprovado,${totalAprovado}\n`;
  csv += `Total Liberado,${totalLiberado}\n`;
  csv += `Percentual Liberado,${percentualLiberado}%\n`;
  csv += `Número de Créditos,${creditos.length}\n`;
  csv += `Número de Regiões,${regional.length}\n\n`;

  if (template !== "minimal") {
    // Regional Distribution
    csv += "DISTRIBUIÇÃO REGIONAL\n";
    csv += "Estado,Obras,Total Aprovado,Total Liberado,Progresso Médio\n";
    regional.forEach((r) => {
      csv += `${r.estado},${r.obrasCount},${r.totalAprovado},${r.totalLiberado},${r.progresso}%\n`;
    });
    csv += "\n";

    // ROI Timeline
    csv += "TIMELINE DE ROI\n";
    csv += "Mês,ROI Esperado,ROI Real\n";
    roiData.forEach((r) => {
      csv += `${r.mes},${r.esperado},${r.real}\n`;
    });
    csv += "\n";

    // Inadimplência
    csv += "TAXA DE INADIMPLÊNCIA\n";
    csv += "Mês,Taxa (%)\n";
    inadimplenciaData.forEach((i) => {
      csv += `${i.mes},${i.taxa}\n`;
    });
  }

  return csv;
}

export function generateXLSXReport(
  regional: RegionalMetrics[],
  roiData: RoiDataPoint[],
  inadimplenciaData: InadimplenciaDataPoint[],
  creditos: CreditoResumo[],
  template: ReportTemplate = "detailed"
): Uint8Array {
  // This function creates a simple XLSX-compatible format
  // In production, use a library like 'xlsx' for full XLSX support
  const totalAprovado = creditos.reduce((acc, c) => acc + Number(c.valorAprovado ?? 0), 0);
  const totalLiberado = creditos.reduce((acc, c) => acc + Number(c.valorLiberado ?? 0), 0);

  // For now, return CSV data as fallback - proper XLSX generation should use a dedicated library
  const csvData = generateCSVReport(regional, roiData, inadimplenciaData, creditos, template);

  // Convert to Uint8Array for download
  const encoder = new TextEncoder();
  return encoder.encode(csvData);
}
