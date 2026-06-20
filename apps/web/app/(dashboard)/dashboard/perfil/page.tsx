import type { Metadata } from "next";
import { usuariosApi } from "@/lib/api";
import { formatarCPF, formatarTelefone } from "@imbobi/core";
import { PerfilForm } from "./perfil-form";
import { PerfilAvatar } from "./perfil-avatar";
import { PerfilContaBancaria } from "./perfil-conta-bancaria";
import { AlertCircle } from "lucide-react";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: "Perfil — IMOBI" };

const KYC_STATUS_MAP: Record<string, { label: string; cor: string; icone: string }> = {
  PENDENTE:       { label: "Pendente",       cor: "text-yellow-600", icone: "⏳" },
  EM_VERIFICACAO: { label: "Em Verificação", cor: "text-blue-600",   icone: "🔍" },
  APROVADO:       { label: "Aprovado",        cor: "text-green-600",  icone: "✓"  },
  REJEITADO:      { label: "Rejeitado",       cor: "text-red-600",    icone: "✗"  },
};

const USER_TYPE_MAP: Record<string, string> = {
  TOMADOR:     "Tomador de Crédito",
  CONSTRUTOR:  "Construtor",
  GESTOR:      "Gestor de Fundo",
  GESTOR_OBRA: "Gestor de Obra",
  GESTOR_FUNDO:"Gestor de Fundo",
  ADMIN:       "Administrador",
  PARCEIRO:    "Parceiro",
  COMERCIAL:   "Comercial",
  ENGENHEIRO:  "Engenheiro",
};

export default async function PerfilPage() {
  const usuario = await usuariosApi.meuPerfil().catch(() => null);

  if (!usuario) {
    return (
      <div className="max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Perfil</h1>
        <div className="bg-gray-50 rounded-2xl border border-gray-100 p-12 text-center">
          <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-4" />
          <p className="font-semibold text-gray-600 mb-2">Não foi possível carregar o perfil</p>
          <p className="text-sm text-gray-400 max-w-xs mx-auto">
            Verifique sua conexão e recarregue a página.
          </p>
          <a
            href="/dashboard/perfil"
            className="inline-block mt-6 text-sm font-semibold text-[#1B4FD8] hover:underline"
          >
            Tentar novamente →
          </a>
        </div>
      </div>
    );
  }

  const kycInfo = KYC_STATUS_MAP[usuario.kycStatus] ?? KYC_STATUS_MAP.PENDENTE;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Perfil</h1>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <PerfilAvatar nome={usuario.nome} avatarUrl={usuario.avatarUrl} />
            <div>
              <h2 className="text-xl font-bold text-gray-900">{usuario.nome}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{USER_TYPE_MAP[usuario.tipo] ?? usuario.tipo}</p>
              <p className="text-sm text-gray-400 mt-0.5">{usuario.email}</p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className={`text-lg font-bold ${kycInfo.cor}`}>{kycInfo.icone}</p>
            <p className={`text-xs font-semibold ${kycInfo.cor} mt-1`}>{kycInfo.label}</p>
          </div>
        </div>
      </div>

      {/* KYC warning */}
      {usuario.kycStatus !== "APROVADO" && (
        <div className="bg-yellow-50 rounded-2xl border border-yellow-200 p-5">
          <h3 className="font-semibold text-yellow-900 text-sm mb-1">Status de Validação</h3>
          <p className="text-sm text-yellow-800">
            {usuario.kycStatus === "PENDENTE"
              ? "Seu documento ainda não foi enviado. Complete a validação para desbloquear todas as funcionalidades."
              : usuario.kycStatus === "EM_VERIFICACAO"
              ? "Seu documento está em análise. Você receberá uma notificação em breve."
              : "Seu documento foi rejeitado. Entre em contato com suporte."}
          </p>
          {usuario.kycStatus === "PENDENTE" && (
            <a href="/dashboard/kyc" className="inline-block mt-3 text-sm font-semibold text-yellow-700 hover:text-yellow-800">
              Iniciar Validação →
            </a>
          )}
        </div>
      )}

      {/* Dados pessoais — edição inline */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-bold text-gray-900 mb-1">Informações pessoais</h2>
        <p className="text-sm text-gray-500 mb-5">Edite seu nome e telefone. E-mail e CPF não podem ser alterados aqui.</p>
        <PerfilForm usuario={usuario} />
      </div>

      {(usuario.tipo === "CONSTRUTOR" || usuario.tipo === "TOMADOR") && (
        <PerfilContaBancaria usuario={usuario} />
      )}

      {/* Dados da conta */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-bold text-gray-900 mb-5">Dados da Conta</h2>
        <div className="space-y-4">
          {[
            { label: "ID do Usuário", value: usuario.usuarioId, mono: true },
            { label: "E-mail", value: usuario.email },
            { label: "CPF", value: formatarCPF(usuario.cpf) },
            { label: "Telefone", value: formatarTelefone(usuario.telefone ?? "") },
            {
              label: "Membro desde",
              value: new Date(usuario.criadoEm).toLocaleDateString("pt-BR", { year: "numeric", month: "long", day: "numeric" }),
            },
          ].filter(item => item.value).map((item) => (
            <div key={item.label}>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">{item.label}</p>
              <p className={`text-sm text-gray-900 ${item.mono ? "font-mono" : ""}`}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Segurança */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-bold text-gray-900 mb-5">Segurança</h2>
        <button className="w-full border border-gray-200 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-50 transition-colors text-sm">
          Alterar Senha
        </button>
      </div>
    </div>
  );
}
