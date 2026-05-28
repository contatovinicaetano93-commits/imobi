"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function StagesPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gerenciamento de Etapas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-700">
              Feature em desenvolvimento. Aqui você poderá aprovar etapas em lote após análise de evidências.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 border border-slate-200 rounded-lg">
              <h3 className="font-semibold text-slate-900 mb-2">Aprovação em Lote</h3>
              <p className="text-sm text-slate-600 mb-4">
                Selecionar e aprovar múltiplas etapas simultaneamente
              </p>
              <div className="space-y-2 text-sm text-slate-600">
                <p>• Listar etapas aguardando vistoria</p>
                <p>• Filtrar por obra ou usuário</p>
                <p>• Análise de evidências</p>
                <p>• Aprovação em lote com confirmação</p>
              </div>
            </div>

            <div className="p-4 border border-slate-200 rounded-lg">
              <h3 className="font-semibold text-slate-900 mb-2">Histórico de Etapas</h3>
              <p className="text-sm text-slate-600 mb-4">
                Rastrear todas as etapas e decisões
              </p>
              <div className="space-y-2 text-sm text-slate-600">
                <p>• Ver histórico completo de etapas</p>
                <p>• Revisar evidências de cada etapa</p>
                <p>• Exportar relatórios</p>
                <p>• Audit trail de aprovações</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
