"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function MonitoringPage() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">API Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-sm font-medium">Operacional</span>
            </div>
            <p className="text-xs text-slate-600 mt-2">Resposta: 45ms</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Database Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-sm font-medium">Operacional</span>
            </div>
            <p className="text-xs text-slate-600 mt-2">Conexões: 12/50</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Cache Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-sm font-medium">Operacional</span>
            </div>
            <p className="text-xs text-slate-600 mt-2">Memória: 2.3GB/8GB</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alertas Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 border border-yellow-200 rounded-lg bg-yellow-50">
              <p className="text-sm font-medium text-yellow-900">
                Taxa de erro elevada em /api/kyc (0.5%)
              </p>
              <p className="text-xs text-yellow-700 mt-1">2 horas atrás</p>
            </div>
            <div className="p-3 border border-blue-200 rounded-lg bg-blue-50">
              <p className="text-sm font-medium text-blue-900">
                Backup diário completado com sucesso
              </p>
              <p className="text-xs text-blue-700 mt-1">Há 12 horas</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-slate-600 mb-1">Requisições/min</p>
              <p className="text-lg font-semibold">1,234</p>
            </div>
            <div>
              <p className="text-xs text-slate-600 mb-1">Tempo médio</p>
              <p className="text-lg font-semibold">82ms</p>
            </div>
            <div>
              <p className="text-xs text-slate-600 mb-1">Taxa de erro</p>
              <p className="text-lg font-semibold text-green-600">0.01%</p>
            </div>
            <div>
              <p className="text-xs text-slate-600 mb-1">Disponibilidade</p>
              <p className="text-lg font-semibold text-green-600">99.9%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Logs Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm font-mono">
            <p className="text-slate-600">[2024-05-28 14:32:15] INFO: Usuário 123 realizou login</p>
            <p className="text-slate-600">[2024-05-28 14:31:45] INFO: KYC documento aprovado</p>
            <p className="text-red-600">[2024-05-28 14:31:20] ERROR: Falha ao processar liberação de parcela</p>
            <p className="text-slate-600">[2024-05-28 14:30:55] INFO: Crédito criado para usuário 456</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
