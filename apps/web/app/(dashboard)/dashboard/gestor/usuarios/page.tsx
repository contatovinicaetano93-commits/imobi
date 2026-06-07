"use client";

import { Suspense, useEffect, useState } from "react";
import { managerApi, type UsuarioGestor } from "@/lib/api";
import Link from "next/link";

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("pt-BR");
}

function maskCpf(cpf: string): string {
  return "***.***.***-**";
}

const KYC_STYLE: Record<string, string> = {
  APROVADO: "bg-green-50 text-green-700",
  PENDENTE: "bg-yellow-50 text-yellow-700",
  EM_VERIFICACAO: "bg-blue-50 text-blue-700",
  REJEITADO: "bg-red-50 text-red-700",
};

const KYC_LABEL: Record<string, string> = {
  APROVADO: "KYC Aprovado",
  PENDENTE: "Pendente KYC",
  EM_VERIFICACAO: "Em Verificação",
  REJEITADO: "KYC Rejeitado",
};

const TIPO_STYLE: Record<string, string> = {
  TOMADOR: "bg-gray-100 text-gray-700",
  GESTOR_OBRA: "bg-purple-50 text-purple-700",
  ADMIN: "bg-red-50 text-red-700",
  PARCEIRO: "bg-orange-50 text-orange-700",
};

const TIPO_LABEL: Record<string, string> = {
  TOMADOR: "Tomador",
  GESTOR_OBRA: "Gestor",
  ADMIN: "Admin",
  PARCEIRO: "Parceiro",
};

type TabKey = "TODOS" | "PENDENTE" | "APROVADO" | "TOMADOR" | "GESTOR_OBRA";

const TABS: { key: TabKey; label: string }[] = [
  { key: "TODOS", label: "Todos" },
  { key: "PENDENTE", label: "Pendentes KYC" },
  { key: "APROVADO", label: "KYC Aprovado" },
  { key: "TOMADOR", label: "Tomadores" },
  { key: "GESTOR_OBRA", label: "Gestores" },
];

function GestorUsuariosContent() {
  const [data, setData] = useState<{ usuarios: UsuarioGestor[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("TODOS");
  const limit = 20;

  useEffect(() => {
    setLoading(true);

    const isKycTab = activeTab === "PENDENTE" || activeTab === "APROVADO";
    const isTipoTab = activeTab === "TOMADOR" || activeTab === "GESTOR_OBRA";

    managerApi
      .listarUsuarios(limit, offset, {
        searchTerm: searchTerm || undefined,
        kycStatus: isKycTab ? activeTab : undefined,
        tipo: isTipoTab ? activeTab : undefined,
      })
      .then(setData)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [offset, searchTerm, activeTab]);

  useEffect(() => {
    setOffset(0);
  }, [searchTerm, activeTab]);

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestão de Usuários</h1>
          <p className="text-gray-500 text-sm mt-1">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestão de Usuários</h1>
        </div>
        <div className="bg-red-50 rounded-2xl border border-red-100 p-6">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  const pages = data ? Math.ceil(data.total / limit) : 0;
  const currentPage = offset / limit + 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gestão de Usuários</h1>
        <p className="text-gray-500 text-sm mt-1">
          {data?.total ?? 0} usuário{(data?.total ?? 0) !== 1 ? "s" : ""} encontrado{(data?.total ?? 0) !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <input
          type="text"
          placeholder="Buscar por nome ou email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="flex gap-2 flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-brand-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {!data || data.usuarios.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <p className="text-4xl mb-4">👤</p>
          <p className="text-gray-500">
            {searchTerm || activeTab !== "TODOS"
              ? "Nenhum usuário encontrado com os filtros selecionados"
              : "Nenhum usuário cadastrado no sistema"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-6 py-3 font-semibold text-gray-600">Nome</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Email</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">CPF</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Tipo</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">KYC</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Cadastro</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.usuarios.map((usuario) => (
                  <tr key={usuario.usuarioId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">{usuario.nome}</p>
                      <p className="text-xs text-gray-400 sm:hidden">{usuario.email}</p>
                    </td>
                    <td className="px-4 py-4 hidden sm:table-cell">
                      <p className="text-gray-600">{usuario.email}</p>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <p className="text-gray-500 font-mono text-xs">{maskCpf(usuario.cpf)}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          TIPO_STYLE[usuario.tipo] ?? "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {TIPO_LABEL[usuario.tipo] ?? usuario.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          KYC_STYLE[usuario.kycStatus] ?? "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {KYC_LABEL[usuario.kycStatus] ?? usuario.kycStatus}
                      </span>
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell">
                      <p className="text-gray-500">{formatDate(usuario.criadoEm)}</p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-2">
                        {(usuario.kycStatus === "PENDENTE" || usuario.kycStatus === "EM_VERIFICACAO") && (
                          <Link
                            href="/dashboard/gestor/kyc"
                            className="text-xs bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg font-medium hover:bg-purple-100 transition-colors whitespace-nowrap"
                          >
                            Ver KYC
                          </Link>
                        )}
                        <Link
                          href={`/dashboard/gestor/usuarios/${usuario.usuarioId}`}
                          className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg font-medium hover:bg-gray-200 transition-colors whitespace-nowrap"
                        >
                          Ver Perfil
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-gray-500">
            Página {currentPage} de {pages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              ← Anterior
            </button>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={!data || offset + limit >= data.total}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Próxima →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GestorUsuariosPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestão de Usuários</h1>
            <p className="text-gray-500 text-sm mt-1">Carregando...</p>
          </div>
        </div>
      }
    >
      <GestorUsuariosContent />
    </Suspense>
  );
}
