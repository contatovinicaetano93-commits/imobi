"use client";

import { useState, useEffect } from "react";
import { DataTable, type Column } from "@/components/data-table";
import { Card, CardHeader, CardContent } from "@/components/card";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";

interface Documento {
  id: string;
  nome: string;
  status: "ASSINADO" | "APROVADO" | "PENDENTE" | "ATIVO" | "DISPONÍVEL";
  data: string;
  url?: string;
}

const STATUS_BADGES: Record<string, "success" | "warning" | "error" | "info"> = {
  ASSINADO: "success",
  APROVADO: "success",
  ATIVO: "success",
  DISPONÍVEL: "info",
  PENDENTE: "warning",
};

const documentoColumns: Column<Documento>[] = [
  {
    key: "nome",
    label: "Documento",
    render: (value: string) => <span className="font-medium text-gray-900">{value}</span>,
  },
  {
    key: "status",
    label: "Status",
    render: (value: string) => (
      <Badge
        variant={STATUS_BADGES[value] || "info"}
        label={value.replace(/_/g, " ")}
      />
    ),
  },
  {
    key: "data",
    label: "Data",
    render: (value: string) => <span className="text-gray-600 text-sm">{value}</span>,
  },
];

export default function DocumentosPage() {
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulated API call - replace with actual API endpoint
    const fetchDocumentos = async () => {
      try {
        setLoading(true);
        // Mock data - would normally fetch from /api/v1/documentos
        const mockData: Documento[] = [
          { id: "1", nome: "Contrato de Crédito", status: "ASSINADO", data: "15/03/2024" },
          { id: "2", nome: "KYC Completo", status: "APROVADO", data: "10/03/2024" },
          { id: "3", nome: "Documentação da Obra", status: "PENDENTE", data: "-" },
          { id: "4", nome: "Apólice de Seguro", status: "ATIVO", data: "01/03/2024" },
          { id: "5", nome: "Extrato de Crédito", status: "DISPONÍVEL", data: "Atualizado" },
        ];
        setDocumentos(mockData);
      } finally {
        setLoading(false);
      }
    };

    fetchDocumentos();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Documentos</h1>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Meus Documentos</h2>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={documentoColumns}
            data={documentos}
            keyExtractor={(doc) => doc.id}
            loading={loading}
            empty={
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">Nenhum documento disponível</p>
                <Button>Solicitar Documento</Button>
              </div>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
