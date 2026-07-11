"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, Lock, Bell } from "lucide-react";
import { ROLE_LABELS, type AppRole } from "@/lib/role-permissions";
import { PerfilForm } from "./perfil-form";
import { PerfilContaBancaria } from "./perfil-conta-bancaria";

type MeResponse = {
  authenticated: boolean;
  nome?: string | null;
  email?: string | null;
  role?: AppRole | null;
};

export default function PerfilPage() {
  const [usuario, setUsuario] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setUsuario(d))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="max-w-2xl p-6 text-sm text-gray-500">Carregando perfil…</div>;
  }

  if (!usuario?.authenticated || !usuario.email) {
    return (
      <div className="max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Perfil</h1>
        <div className="bg-gray-50 rounded-2xl border border-gray-100 p-12 text-center">
          <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-4" />
          <p className="font-semibold text-gray-600 mb-2">Não foi possível carregar o perfil</p>
        </div>
      </div>
    );
  }

  const nome = usuario.nome ?? "Usuário";
  const roleLabel = usuario.role ? ROLE_LABELS[usuario.role] : "Usuário";

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Perfil</h1>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900">{nome}</h2>
        <p className="text-sm text-gray-500 mt-0.5">{roleLabel}</p>
        <p className="text-sm text-gray-400 mt-0.5">{usuario.email}</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Dados pessoais</h3>
        <PerfilForm usuario={{ nome, email: usuario.email }} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Conta bancária</h3>
        <PerfilContaBancaria usuario={{ nome }} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/dashboard/perfil/seguranca" className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 no-underline">
          <Lock size={18} className="text-[#1B4FD8]" />
          <span className="text-sm font-semibold text-gray-900">Segurança</span>
        </Link>
        <Link href="/dashboard/notificacoes" className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 no-underline">
          <Bell size={18} className="text-[#1B4FD8]" />
          <span className="text-sm font-semibold text-gray-900">Notificações</span>
        </Link>
      </div>
    </div>
  );
}
