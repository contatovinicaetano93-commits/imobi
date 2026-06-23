import type { Metadata } from "next";
import { BankAccountForm } from "./bank-account-form";
import { Building2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "Conta Bancária — IMOBI" };

export default function BancoPage() {
  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/perfil">
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6" />
            Dados Bancários
          </h1>
          <p className="text-sm text-gray-600 mt-1">Atualize suas informações bancárias para receber liberações de crédito</p>
        </div>
      </div>

      {/* Bank Account Form */}
      <BankAccountForm />

      {/* Info Box */}
      <div className="bg-blue-50 rounded-2xl border border-blue-200 p-6">
        <h3 className="font-semibold text-blue-900 mb-3">Por que preciso atualizar meus dados bancários?</h3>
        <p className="text-sm text-blue-800 mb-3">
          Suas informações bancárias são essenciais para receber as liberações de crédito de forma segura e rápida.
        </p>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>Certifique-se de usar a conta em seu nome</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>Verifique o número da agência e da conta cuidadosamente</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>Dados incorretos podem atrasar o recebimento de seu crédito</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>Sua conta deve estar ativa para receber transferências</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
