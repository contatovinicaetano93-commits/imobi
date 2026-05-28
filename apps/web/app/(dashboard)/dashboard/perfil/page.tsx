import type { Metadata } from "next";
import { usuariosApi } from "@/lib/api";
import { formatarCPF, formatarTelefone } from "@imbobi/core";
import { PerfilForm } from "./perfil-form";

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: "Perfil — imbobi" };

const KYC_STATUS_MAP: Record<string, { label: string; cor: string; icone: string }> = {
  PENDENTE: { label: "Pendente", cor: "text-yellow-600", icone: "⏳" },
  EM_VERIFICACAO: { label: "Em Verificação", cor: "text-blue-600", icone: "🔍" },
  APROVADO: { label: "Aprovado", cor: "text-green-600", icone: "✓" },
  REJEITADO: { label: "Rejeitado", cor: "text-red-600", icone: "✗" },
};

const USER_TYPE_MAP: Record<string, string> = {
  TOMADOR: "Tomador de Crédito",
  GESTOR_OBRA: "Gestor de Obra",
  ADMIN: "Administrador",
  PARCEIRO: "Parceiro",
};

export default async function PerfilPage() {
  const usuario = await usuariosApi.meuPerfil();
  const kycInfo = KYC_STATUS_MAP[usuario.kycStatus] || KYC_STATUS_MAP.PENDENTE;

  return (
    <div className="max-w-2xl space-y-8">
      {/* Profile Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{usuario.nome}</h1>
            <p className="text-gray-600">{USER_TYPE_MAP[usuario.tipo] || usuario.tipo}</p>
          </div>
          <div className={`text-center p-4 rounded-xl bg-gray-50`}>
            <p className={`text-2xl font-bold ${kycInfo.cor}`}>{kycInfo.icone}</p>
            <p className={`text-sm font-semibold ${kycInfo.cor} mt-2`}>{kycInfo.label}</p>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Informações Pessoais</h2>
        <PerfilForm usuario={usuario} />
      </div>

      {/* Account Details */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Dados da Conta</h2>
        <div className="space-y-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">
              ID do Usuário
            </p>
            <p className="text-sm font-mono text-gray-900">{usuario.usuarioId}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">
              Email
            </p>
            <p className="text-sm text-gray-900">{usuario.email}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">
              CPF
            </p>
            <p className="text-sm text-gray-900">{formatarCPF(usuario.cpf)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">
              Membro desde
            </p>
            <p className="text-sm text-gray-900">
              {new Date(usuario.criadoEm).toLocaleDateString("pt-BR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>
      </div>

      {/* KYC Status Info */}
      {usuario.kycStatus !== "APROVADO" && (
        <div className="bg-yellow-50 rounded-2xl border border-yellow-200 p-6">
          <h3 className="font-semibold text-yellow-900 mb-2">Status de Validação</h3>
          <p className="text-sm text-yellow-800 mb-4">
            {usuario.kycStatus === "PENDENTE"
              ? "Seu documento ainda não foi enviado. Complete a validação para desbloquear funcionalidades completas."
              : usuario.kycStatus === "EM_VERIFICACAO"
              ? "Seu documento está em análise. Você receberá uma notificação quando o processo for concluído."
              : "Seu documento foi rejeitado. Entre em contato com suporte para mais informações."}
          </p>
          {usuario.kycStatus === "PENDENTE" && (
            <a href="/dashboard/kyc" className="text-sm font-semibold text-yellow-700 hover:text-yellow-800">
              Iniciar Validação →
            </a>
          )}
        </div>
      )}

      {/* Security */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Segurança</h2>
        <button className="w-full border border-gray-300 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-50 transition-colors">
          Alterar Senha
        </button>
      </div>
    </div>
  );
}
