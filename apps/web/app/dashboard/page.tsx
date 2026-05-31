"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface User {
  usuarioId: string;
  nome: string;
  email: string;
  tipo: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // Get token from localStorage (set by signup form)
        const token = localStorage.getItem("accessToken");
        if (!token) {
          router.push("/login");
          return;
        }

        // Fetch user data from API
        const res = await fetch("http://localhost:4000/api/v1/usuario/perfil", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401) {
          localStorage.removeItem("accessToken");
          router.push("/login");
          return;
        }

        if (!res.ok) {
          throw new Error("Falha ao carregar dados do usuário");
        }

        const data = await res.json();
        setUser(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro desconhecido");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  const handleLogout = async () => {
    localStorage.removeItem("accessToken");
    await fetch("/api/auth/session", { method: "DELETE" });
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Carregando...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => location.reload()}
            className="text-brand-600 hover:underline"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-brand-700">imbobi</h1>
            <p className="text-sm text-gray-600">Bem-vindo, {user.nome}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Sair
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* KYC Card */}
          <Link href="/dashboard/perfil">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition cursor-pointer">
              <div className="text-3xl mb-2">📋</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Perfil & KYC
              </h2>
              <p className="text-gray-600 text-sm">
                Envie documentos para verificação de identidade
              </p>
              <div className="mt-4 text-sm text-brand-600 font-medium">
                Ver Perfil →
              </div>
            </div>
          </Link>

          {/* Credit Simulator Card */}
          <Link href="/dashboard/credito">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition cursor-pointer">
              <div className="text-3xl mb-2">💰</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Simulador de Crédito
              </h2>
              <p className="text-gray-600 text-sm">
                Calcule as condições de financiamento para seu projeto
              </p>
              <div className="mt-4 text-sm text-brand-600 font-medium">
                Simular Crédito →
              </div>
            </div>
          </Link>

          {/* Works Card (placeholder) */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 opacity-50 cursor-not-allowed">
            <div className="text-3xl mb-2">🏗️</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Minhas Obras
            </h2>
            <p className="text-gray-600 text-sm">
              Gerencie seus projetos de construção
            </p>
            <div className="mt-4 text-sm text-gray-400 font-medium">
              Em breve
            </div>
          </div>

          {/* Settings Card (placeholder) */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 opacity-50 cursor-not-allowed">
            <div className="text-3xl mb-2">⚙️</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Configurações
            </h2>
            <p className="text-gray-600 text-sm">
              Gerencie sua conta e preferências
            </p>
            <div className="mt-4 text-sm text-gray-400 font-medium">
              Em breve
            </div>
          </div>
        </div>

        {/* Quick Info */}
        <div className="mt-8 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Informações da Conta
          </h3>
          <dl className="space-y-4">
            <div className="flex justify-between">
              <dt className="text-gray-600">Nome:</dt>
              <dd className="font-medium text-gray-900">{user.nome}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Email:</dt>
              <dd className="font-medium text-gray-900">{user.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Tipo de Conta:</dt>
              <dd className="font-medium text-gray-900">{user.tipo}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">ID de Usuário:</dt>
              <dd className="font-medium text-gray-900 text-sm font-mono">
                {user.usuarioId.substring(0, 12)}...
              </dd>
            </div>
          </dl>
        </div>
      </main>
    </div>
  );
}
