"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@imbobi/core";

interface Usuario {
  usuarioId: string;
  nome: string;
  email: string;
  tipo: string;
  kycStatus: string;
  bloqueado: boolean;
  criadoEm: string;
}

interface ApiResponse {
  data: Usuario[];
  total: number;
  page: number;
  limit: number;
}

export default function UsersPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState({ tipo: "", bloqueado: "" });
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const limit = 20;

  useEffect(() => {
    fetchUsuarios();
  }, [page, filtro]);

  const fetchUsuarios = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(filtro.tipo && { tipo: filtro.tipo }),
        ...(filtro.bloqueado && { bloqueado: filtro.bloqueado }),
      });

      const response = await apiClient.get(`/admin/users?${params}`);
      setUsuarios(response.data);
      setTotal(response.total);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao carregar usuários"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBlockUser = async (usuarioId: string, motivo?: string) => {
    try {
      setActionInProgress(usuarioId);
      await apiClient.patch(`/admin/users/${usuarioId}/block`, {
        motivo: motivo || "Bloqueado por administrador",
      });
      await fetchUsuarios();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao bloquear usuário");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleUnblockUser = async (usuarioId: string) => {
    try {
      setActionInProgress(usuarioId);
      await apiClient.patch(`/admin/users/${usuarioId}/unlock`, {});
      await fetchUsuarios();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao desbloquear usuário"
      );
    } finally {
      setActionInProgress(null);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select
              value={filtro.tipo}
              onChange={(e) => {
                setFiltro({ ...filtro, tipo: e.target.value });
                setPage(1);
              }}
              className="px-3 py-2 border border-slate-300 rounded-md text-sm"
            >
              <option value="">Todos os tipos</option>
              <option value="TOMADOR">Tomador</option>
              <option value="GESTOR_OBRA">Gestor de Obra</option>
              <option value="PARCEIRO">Parceiro</option>
              <option value="ADMIN">Admin</option>
            </select>

            <select
              value={filtro.bloqueado}
              onChange={(e) => {
                setFiltro({ ...filtro, bloqueado: e.target.value });
                setPage(1);
              }}
              className="px-3 py-2 border border-slate-300 rounded-md text-sm"
            >
              <option value="">Todos os usuários</option>
              <option value="true">Bloqueados</option>
              <option value="false">Ativos</option>
            </select>

            <button
              onClick={() => {
                setFiltro({ tipo: "", bloqueado: "" });
                setPage(1);
              }}
              className="px-4 py-2 bg-slate-200 text-slate-900 rounded-md text-sm font-medium hover:bg-slate-300 transition"
            >
              Limpar Filtros
            </button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Usuários ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : usuarios.length === 0 ? (
            <div className="text-center py-8 text-slate-600">
              Nenhum usuário encontrado
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold">Nome</th>
                    <th className="text-left py-3 px-4 font-semibold">Email</th>
                    <th className="text-left py-3 px-4 font-semibold">Tipo</th>
                    <th className="text-left py-3 px-4 font-semibold">KYC</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                    <th className="text-left py-3 px-4 font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((user) => (
                    <tr
                      key={user.usuarioId}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="py-3 px-4">{user.nome}</td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        {user.email}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-700">
                          {user.tipo}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                            user.kycStatus === "APROVADO"
                              ? "bg-green-100 text-green-700"
                              : user.kycStatus === "PENDENTE"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                          }`}
                        >
                          {user.kycStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                            user.bloqueado
                              ? "bg-red-100 text-red-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {user.bloqueado ? "Bloqueado" : "Ativo"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {user.bloqueado ? (
                          <button
                            onClick={() => handleUnblockUser(user.usuarioId)}
                            disabled={actionInProgress === user.usuarioId}
                            className="text-green-600 hover:text-green-900 disabled:opacity-50 text-sm font-medium"
                          >
                            {actionInProgress === user.usuarioId
                              ? "..."
                              : "Desbloquear"}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBlockUser(user.usuarioId)}
                            disabled={actionInProgress === user.usuarioId}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50 text-sm font-medium"
                          >
                            {actionInProgress === user.usuarioId
                              ? "..."
                              : "Bloquear"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-6 flex justify-center gap-2">
              {page > 1 && (
                <button
                  onClick={() => setPage(page - 1)}
                  className="px-3 py-1 rounded border border-slate-300 hover:bg-slate-50"
                >
                  Anterior
                </button>
              )}

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`px-3 py-1 rounded ${
                    p === page
                      ? "bg-blue-600 text-white"
                      : "border border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {p}
                </button>
              ))}

              {page < totalPages && (
                <button
                  onClick={() => setPage(page + 1)}
                  className="px-3 py-1 rounded border border-slate-300 hover:bg-slate-50"
                >
                  Próximo
                </button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
