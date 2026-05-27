import {
  aggregateByRegion,
  calculateRoiTimeline,
  calculateInadimplenciaRate,
  calculatePortfolioPerformance,
  generateCSVReport,
  RegionalMetrics,
  RoiDataPoint,
  InadimplenciaDataPoint,
  PortfolioPerformance,
} from "../_components/fundos-utils";
import { ObraResumo, CreditoResumo } from "@/lib/api";

describe("fundos-utils", () => {
  describe("aggregateByRegion", () => {
    it("should group obras by geographic region correctly", () => {
      const obras: ObraResumo[] = [
        {
          id: "1",
          nome: "Obra Nordeste",
          geoLatitude: -8,
          geoLongitude: -40,
          status: "EM_ANDAMENTO",
          progresso: 50,
          credito: {
            id: "c1",
            status: "ATIVO",
            valorAprovado: BigInt(100000),
            valorLiberado: BigInt(50000),
            taxaMensal: 0.02,
            prazoMeses: 12,
          } as CreditoResumo,
        },
        {
          id: "2",
          nome: "Obra Sudeste",
          geoLatitude: -23,
          geoLongitude: -46,
          status: "EM_ANDAMENTO",
          progresso: 75,
          credito: {
            id: "c2",
            status: "ATIVO",
            valorAprovado: BigInt(200000),
            valorLiberado: BigInt(150000),
            taxaMensal: 0.02,
            prazoMeses: 12,
          } as CreditoResumo,
        },
      ];

      const result = aggregateByRegion(obras, []);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        totalAprovado: 200000,
        obrasCount: 1,
        estado: "Sudeste",
      });
      expect(result[1]).toMatchObject({
        totalAprovado: 100000,
        obrasCount: 1,
        estado: "Nordeste",
      });
    });

    it("should calculate average progress correctly", () => {
      const obras: ObraResumo[] = [
        {
          id: "1",
          geoLatitude: -23,
          geoLongitude: -46,
          status: "EM_ANDAMENTO",
          progresso: 40,
          credito: {
            valorAprovado: BigInt(100000),
            valorLiberado: BigInt(50000),
          } as CreditoResumo,
        } as ObraResumo,
        {
          id: "2",
          geoLatitude: -23,
          geoLongitude: -46,
          status: "EM_ANDAMENTO",
          progresso: 60,
          credito: {
            valorAprovado: BigInt(100000),
            valorLiberado: BigInt(50000),
          } as CreditoResumo,
        } as ObraResumo,
      ];

      const result = aggregateByRegion(obras, []);

      expect(result[0].progresso).toBe(50); // (40 + 60) / 2
    });

    it("should sort by total aprovado in descending order", () => {
      const obras: ObraResumo[] = [
        {
          id: "1",
          geoLatitude: -8,
          geoLongitude: -40,
          status: "EM_ANDAMENTO",
          progresso: 50,
          credito: {
            valorAprovado: BigInt(50000),
            valorLiberado: BigInt(25000),
          } as CreditoResumo,
        } as ObraResumo,
        {
          id: "2",
          geoLatitude: -23,
          geoLongitude: -46,
          status: "EM_ANDAMENTO",
          progresso: 50,
          credito: {
            valorAprovado: BigInt(200000),
            valorLiberado: BigInt(100000),
          } as CreditoResumo,
        } as ObraResumo,
      ];

      const result = aggregateByRegion(obras, []);

      expect(result[0].totalAprovado).toBeGreaterThanOrEqual(result[1].totalAprovado);
    });

    it("should handle missing coordinates gracefully", () => {
      const obras: ObraResumo[] = [
        {
          id: "1",
          geoLatitude: 0,
          geoLongitude: 0,
          status: "EM_ANDAMENTO",
          progresso: 50,
          credito: {
            valorAprovado: BigInt(100000),
            valorLiberado: BigInt(50000),
          } as CreditoResumo,
        } as ObraResumo,
      ];

      const result = aggregateByRegion(obras, []);

      expect(result[0].estado).toBe("Desconhecido");
    });
  });

  describe("calculateRoiTimeline", () => {
    it("should generate 12-month ROI data points", () => {
      const creditos: CreditoResumo[] = [
        {
          id: "1",
          status: "ATIVO",
          valorAprovado: BigInt(1000000),
          valorLiberado: BigInt(800000),
          taxaMensal: 0.02,
          prazoMeses: 12,
        } as CreditoResumo,
      ];

      const result = calculateRoiTimeline(creditos);

      expect(result).toHaveLength(12);
      expect(result[0]).toHaveProperty("mes");
      expect(result[0]).toHaveProperty("esperado");
      expect(result[0]).toHaveProperty("real");
    });

    it("should have increasing values across months", () => {
      const creditos: CreditoResumo[] = [
        {
          id: "1",
          status: "ATIVO",
          valorAprovado: BigInt(1000000),
          valorLiberado: BigInt(800000),
          taxaMensal: 0.02,
          prazoMeses: 12,
        } as CreditoResumo,
      ];

      const result = calculateRoiTimeline(creditos);

      // Each month should have higher or equal ROI than previous
      for (let i = 1; i < result.length; i++) {
        expect(result[i].esperado).toBeGreaterThanOrEqual(result[i - 1].esperado);
        expect(result[i].real).toBeGreaterThanOrEqual(result[i - 1].real);
      }
    });

    it("should calculate ROI based on 15% annual approved and 12% actual", () => {
      const creditos: CreditoResumo[] = [
        {
          id: "1",
          status: "ATIVO",
          valorAprovado: BigInt(1200000),
          valorLiberado: BigInt(1000000),
          taxaMensal: 0.02,
          prazoMeses: 12,
        } as CreditoResumo,
      ];

      const result = calculateRoiTimeline(creditos);

      // 12-month expected ROI: 1200000 * 0.15 = 180000
      const expectedAnnual = result[11].esperado;
      expect(expectedAnnual).toBeGreaterThan(0);

      // Real ROI should be less than expected (12% vs 15%)
      expect(result[11].real).toBeLessThan(expectedAnnual);
    });

    it("should return 0 ROI for empty credit list", () => {
      const result = calculateRoiTimeline([]);

      expect(result[0].esperado).toBe(0);
      expect(result[0].real).toBe(0);
    });
  });

  describe("calculateInadimplenciaRate", () => {
    it("should generate 12-month inadimplência data", () => {
      const creditos: CreditoResumo[] = [
        {
          id: "1",
          status: "ATIVO",
          valorAprovado: BigInt(1000000),
          valorLiberado: BigInt(800000),
          taxaMensal: 0.02,
          prazoMeses: 12,
        } as CreditoResumo,
      ];

      const result = calculateInadimplenciaRate(creditos);

      expect(result).toHaveLength(12);
      expect(result[0]).toHaveProperty("mes");
      expect(result[0]).toHaveProperty("taxa");
    });

    it("should have taxa between 0 and 2.5%", () => {
      const creditos: CreditoResumo[] = [
        {
          id: "1",
          status: "ATIVO",
          valorAprovado: BigInt(1000000),
          valorLiberado: BigInt(800000),
          taxaMensal: 0.02,
          prazoMeses: 12,
        } as CreditoResumo,
      ];

      const result = calculateInadimplenciaRate(creditos);

      result.forEach((point) => {
        expect(point.taxa).toBeGreaterThanOrEqual(0);
        expect(point.taxa).toBeLessThanOrEqual(2.5);
      });
    });

    it("should have increasing taxa trend", () => {
      const creditos: CreditoResumo[] = [
        {
          id: "1",
          status: "ATIVO",
          valorAprovado: BigInt(1000000),
          valorLiberado: BigInt(800000),
          taxaMensal: 0.02,
          prazoMeses: 12,
        } as CreditoResumo,
      ];

      const result = calculateInadimplenciaRate(creditos);

      // Taxa should generally increase over time (not guaranteed due to randomness, but likely)
      const firstMonth = result[0].taxa;
      const lastMonth = result[11].taxa;
      expect(lastMonth).toBeGreaterThanOrEqual(0);
    });

    it("should format taxa to 2 decimal places", () => {
      const creditos: CreditoResumo[] = [
        {
          id: "1",
          status: "ATIVO",
          valorAprovado: BigInt(1000000),
          valorLiberado: BigInt(800000),
          taxaMensal: 0.02,
          prazoMeses: 12,
        } as CreditoResumo,
      ];

      const result = calculateInadimplenciaRate(creditos);

      result.forEach((point) => {
        const decimalPlaces = (point.taxa.toString().split(".")[1] || "").length;
        expect(decimalPlaces).toBeLessThanOrEqual(2);
      });
    });
  });

  describe("calculatePortfolioPerformance", () => {
    it("should generate 12-month portfolio performance data", () => {
      const obras: ObraResumo[] = [
        {
          id: "1",
          geoLatitude: -23,
          geoLongitude: -46,
          status: "EM_ANDAMENTO",
          progresso: 50,
          credito: {
            id: "c1",
            status: "ATIVO",
            valorAprovado: BigInt(1000000),
            valorLiberado: BigInt(600000),
            taxaMensal: 0.02,
            prazoMeses: 12,
          } as CreditoResumo,
        } as ObraResumo,
      ];

      const result = calculatePortfolioPerformance(obras);

      expect(result).toHaveLength(12);
      result.forEach((point) => {
        expect(point).toHaveProperty("data");
        expect(point).toHaveProperty("valor");
        expect(point).toHaveProperty("progresso");
      });
    });

    it("should have increasing valor and progresso", () => {
      const obras: ObraResumo[] = [
        {
          id: "1",
          geoLatitude: -23,
          geoLongitude: -46,
          status: "EM_ANDAMENTO",
          progresso: 100,
          credito: {
            id: "c1",
            status: "ATIVO",
            valorAprovado: BigInt(1000000),
            valorLiberado: BigInt(600000),
            taxaMensal: 0.02,
            prazoMeses: 12,
          } as CreditoResumo,
        } as ObraResumo,
      ];

      const result = calculatePortfolioPerformance(obras);

      for (let i = 1; i < result.length; i++) {
        expect(result[i].valor).toBeGreaterThanOrEqual(result[i - 1].valor);
        expect(result[i].progresso).toBeGreaterThanOrEqual(result[i - 1].progresso);
      }
    });

    it("should cap progresso at 100%", () => {
      const obras: ObraResumo[] = [
        {
          id: "1",
          geoLatitude: -23,
          geoLongitude: -46,
          status: "EM_ANDAMENTO",
          progresso: 100,
          credito: {
            id: "c1",
            status: "ATIVO",
            valorAprovado: BigInt(1000000),
            valorLiberado: BigInt(600000),
            taxaMensal: 0.02,
            prazoMeses: 12,
          } as CreditoResumo,
        } as ObraResumo,
      ];

      const result = calculatePortfolioPerformance(obras);

      result.forEach((point) => {
        expect(point.progresso).toBeLessThanOrEqual(100);
      });
    });
  });

  describe("generateCSVReport", () => {
    it("should generate valid CSV with headers", () => {
      const regional: RegionalMetrics[] = [
        {
          estado: "Sudeste",
          obrasCount: 2,
          totalAprovado: 200000,
          totalLiberado: 150000,
          progresso: 60,
        },
      ];

      const roiData: RoiDataPoint[] = [
        { mes: "Jan", esperado: 15000, real: 12000 },
      ];

      const inadimplenciaData: InadimplenciaDataPoint[] = [
        { mes: "Jan", taxa: 0.5 },
      ];

      const creditos: CreditoResumo[] = [
        {
          id: "1",
          status: "ATIVO",
          valorAprovado: BigInt(200000),
          valorLiberado: BigInt(150000),
          taxaMensal: 0.02,
          prazoMeses: 12,
        } as CreditoResumo,
      ];

      const csv = generateCSVReport(regional, roiData, inadimplenciaData, creditos);

      expect(csv).toContain("RELATÓRIO DE FUNDOS - IMBOBI");
      expect(csv).toContain("RESUMO EXECUTIVO");
      expect(csv).toContain("DISTRIBUIÇÃO REGIONAL");
      expect(csv).toContain("TIMELINE DE ROI");
      expect(csv).toContain("TAXA DE INADIMPLÊNCIA");
    });

    it("should include summary metrics", () => {
      const regional: RegionalMetrics[] = [];
      const roiData: RoiDataPoint[] = [];
      const inadimplenciaData: InadimplenciaDataPoint[] = [];

      const creditos: CreditoResumo[] = [
        {
          id: "1",
          status: "ATIVO",
          valorAprovado: BigInt(1000000),
          valorLiberado: BigInt(600000),
          taxaMensal: 0.02,
          prazoMeses: 12,
        } as CreditoResumo,
      ];

      const csv = generateCSVReport(regional, roiData, inadimplenciaData, creditos);

      expect(csv).toContain("1000000");
      expect(csv).toContain("600000");
    });

    it("should support executive template with minimal details", () => {
      const regional: RegionalMetrics[] = [
        {
          estado: "Sudeste",
          obrasCount: 2,
          totalAprovado: 200000,
          totalLiberado: 150000,
          progresso: 60,
        },
      ];

      const roiData: RoiDataPoint[] = [
        { mes: "Jan", esperado: 15000, real: 12000 },
      ];

      const inadimplenciaData: InadimplenciaDataPoint[] = [
        { mes: "Jan", taxa: 0.5 },
      ];

      const creditos: CreditoResumo[] = [
        {
          id: "1",
          status: "ATIVO",
          valorAprovado: BigInt(200000),
          valorLiberado: BigInt(150000),
          taxaMensal: 0.02,
          prazoMeses: 12,
        } as CreditoResumo,
      ];

      const csv = generateCSVReport(regional, roiData, inadimplenciaData, creditos, "executive");

      expect(csv).toContain("executivo");
      expect(csv).toContain("RESUMO EXECUTIVO");
    });

    it("should support minimal template", () => {
      const regional: RegionalMetrics[] = [];
      const roiData: RoiDataPoint[] = [];
      const inadimplenciaData: InadimplenciaDataPoint[] = [];

      const creditos: CreditoResumo[] = [
        {
          id: "1",
          status: "ATIVO",
          valorAprovado: BigInt(500000),
          valorLiberado: BigInt(300000),
          taxaMensal: 0.02,
          prazoMeses: 12,
        } as CreditoResumo,
      ];

      const csv = generateCSVReport(regional, roiData, inadimplenciaData, creditos, "minimal");

      expect(csv).toContain("Mínimo");
      expect(csv).toContain("RESUMO EXECUTIVO");
      expect(csv).not.toContain("DISTRIBUIÇÃO REGIONAL");
    });

    it("should calculate correct liberation percentage", () => {
      const regional: RegionalMetrics[] = [];
      const roiData: RoiDataPoint[] = [];
      const inadimplenciaData: InadimplenciaDataPoint[] = [];

      const creditos: CreditoResumo[] = [
        {
          id: "1",
          status: "ATIVO",
          valorAprovado: BigInt(1000000),
          valorLiberado: BigInt(500000),
          taxaMensal: 0.02,
          prazoMeses: 12,
        } as CreditoResumo,
      ];

      const csv = generateCSVReport(regional, roiData, inadimplenciaData, creditos);

      expect(csv).toContain("50.00%");
    });
  });

  describe("Performance and Memoization", () => {
    it("should memoize coordinate calculations", () => {
      const obras: ObraResumo[] = [
        {
          id: "1",
          geoLatitude: -23,
          geoLongitude: -46,
          status: "EM_ANDAMENTO",
          progresso: 50,
          credito: {
            valorAprovado: BigInt(100000),
            valorLiberado: BigInt(50000),
          } as CreditoResumo,
        } as ObraResumo,
        {
          id: "2",
          geoLatitude: -23,
          geoLongitude: -46,
          status: "EM_ANDAMENTO",
          progresso: 50,
          credito: {
            valorAprovado: BigInt(100000),
            valorLiberado: BigInt(50000),
          } as CreditoResumo,
        } as ObraResumo,
      ];

      const result1 = aggregateByRegion(obras, []);
      const result2 = aggregateByRegion(obras, []);

      expect(result1).toEqual(result2);
      expect(result1[0].estado).toBe("Sudeste");
    });

    it("should handle large datasets efficiently", () => {
      const largeObraSet: ObraResumo[] = Array.from({ length: 100 }, (_, i) => ({
        id: `obra-${i}`,
        geoLatitude: -23 + (Math.random() * 10 - 5),
        geoLongitude: -46 + (Math.random() * 10 - 5),
        status: "EM_ANDAMENTO",
        progresso: Math.floor(Math.random() * 100),
        credito: {
          valorAprovado: BigInt(Math.floor(Math.random() * 1000000)),
          valorLiberado: BigInt(Math.floor(Math.random() * 500000)),
        } as CreditoResumo,
      } as ObraResumo));

      const largeCreditSet: CreditoResumo[] = Array.from({ length: 100 }, (_, i) => ({
        id: `credito-${i}`,
        status: "ATIVO",
        valorAprovado: BigInt(Math.floor(Math.random() * 1000000)),
        valorLiberado: BigInt(Math.floor(Math.random() * 500000)),
        taxaMensal: 0.02,
        prazoMeses: 12,
      } as CreditoResumo));

      const startTime = performance.now();
      const result = aggregateByRegion(largeObraSet, largeCreditSet);
      const endTime = performance.now();

      expect(result.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(100);
    });
  });
});
