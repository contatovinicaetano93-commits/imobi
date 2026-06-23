import type { Metadata } from "next";
import { ChangePasswordForm } from "./change-password-form";
import { Lock, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "Segurança — IMOBI" };

export default function SegurancaPage() {
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
            <Lock className="w-6 h-6" />
            Segurança
          </h1>
          <p className="text-sm text-gray-600 mt-1">Altere sua senha com segurança</p>
        </div>
      </div>

      {/* Password Change Form */}
      <ChangePasswordForm />

      {/* Security Tips */}
      <div className="bg-blue-50 rounded-2xl border border-blue-200 p-6">
        <h3 className="font-semibold text-blue-900 mb-3">Dicas de Segurança</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>Use uma senha forte com letras maiúsculas, minúsculas, números e símbolos</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>Não compartilhe sua senha com ninguém, nem com a IMOBI</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>Altere sua senha regularmente (a cada 3 meses é recomendado)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>Se sua conta foi comprometida, altere a senha imediatamente</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
