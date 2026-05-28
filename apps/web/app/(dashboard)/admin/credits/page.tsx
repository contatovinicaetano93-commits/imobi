"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CreditsPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gerenciamento de Créditos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-700">
              Feature em desenvolvimento. Aqui você poderá aprovar, rejeitar e gerenciar créditos dos usuários.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 border border-slate-200 rounded-lg">
              <h3 className="font-semibold text-slate-900 mb-2">Aprovação de Créditos</h3>
              <p className="text-sm text-slate-600 mb-4">
                Aprovar solicitações de crédito com validação de KYC e score
              </p>
              <div className="space-y-2 text-sm text-slate-600">
                <p>• Validar documentos do cliente</p>
                <p>• Revisar score de construtibilidade</p>
                <p>• Definir valor e prazo</p>
                <p>• Registrar decisão</p>
              </div>
            </div>

            <div className="p-4 border border-slate-200 rounded-lg">
              <h3 className="font-semibold text-slate-900 mb-2">Rejeição de Créditos</h3>
              <p className="text-sm text-slate-600 mb-4">
                Rejeitar solicitações com justificativa
              </p>
              <div className="space-y-2 text-sm text-slate-600">
                <p>• Especificar motivo da rejeição</p>
                <p>• Notificar usuário automaticamente</p>
                <p>• Manter auditoria completa</p>
                <p>• Permitir reaplicação</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
