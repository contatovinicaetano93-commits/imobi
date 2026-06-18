"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { RegionalMetrics, RoiDataPoint, InadimplenciaDataPoint, generateCSVReport } from "./fundos-utils";
import { CreditoResumo } from "@/lib/api";

interface ReportExportProps {
  regional: RegionalMetrics[];
  roiData: RoiDataPoint[];
  inadimplenciaData: InadimplenciaDataPoint[];
  creditos: CreditoResumo[];
}

export function ReportExport({
  regional,
  roiData,
  inadimplenciaData,
  creditos,
}: ReportExportProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleCSVExport = async () => {
    setIsExporting(true);
    try {
      const csv = generateCSVReport(regional, roiData, inadimplenciaData, creditos);
      const element = document.createElement("a");
      const file = new Blob([csv], { type: "text/csv;charset=utf-8" });
      element.href = URL.createObjectURL(file);
      element.download = `fundos-report-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    } catch (error) {
      console.error("Erro ao exportar relatório:", error);
      alert("Erro ao exportar relatório. Tente novamente.");
    } finally {
      setIsExporting(false);
    }
  };

  const handlePDFExport = async () => {
    setIsExporting(true);
    try {
      // For PDF export, we'll use the browser's print functionality
      // This is a simpler approach that works across browsers
      window.print();
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      alert("Erro ao exportar PDF. Tente novamente.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleJSONExport = async () => {
    setIsExporting(true);
    try {
      const data = {
        exportedAt: new Date().toISOString(),
        summary: {
          totalAprovado: creditos.reduce((acc, c) => acc + Number(c.valorAprovado ?? 0), 0),
          totalLiberado: creditos.reduce((acc, c) => acc + Number(c.valorLiberado ?? 0), 0),
          creditosCount: creditos.length,
          regionesCount: regional.length,
        },
        regional,
        roiTimeline: roiData,
        inadimplencia: inadimplenciaData,
      };

      const element = document.createElement("a");
      const file = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
      element.href = URL.createObjectURL(file);
      element.download = `fundos-report-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    } catch (error) {
      console.error("Erro ao exportar JSON:", error);
      alert("Erro ao exportar dados. Tente novamente.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-2xl border border-blue-200 p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Exportar Relatório</h3>
          <p className="text-sm text-blue-700">
            Baixe um relatório completo do seu portfólio em diferentes formatos
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={handleCSVExport}
            disabled={isExporting}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-white text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Exportar CSV
          </button>

          <button
            onClick={handleJSONExport}
            disabled={isExporting}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-white text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Exportar JSON
          </button>

          <button
            onClick={handlePDFExport}
            disabled={isExporting}
            className="flex items-center justify-center gap-2 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium hover:opacity-90"
            style={{ background: "#1B4FD8" }}
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Imprimir/PDF
          </button>
        </div>

        <p className="text-xs text-[#1B4FD8] mt-3">
          Os relatórios contêm informações consolidadas de todos os seus fundos, ROI esperado vs real, distribuição regional e análise de risco.
        </p>
      </div>
    </div>
  );
}
