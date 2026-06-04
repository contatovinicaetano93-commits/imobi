"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoginSchema, type LoginInput } from "@imbobi/schemas";

export default function LoginPage() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(LoginSchema) });

  const onSubmit = async (data: LoginInput) => {
    setErro(null);
    try {
      const res = await fetch('/api/proxy/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message ?? 'Credenciais inválidas');
      router.push('/dashboard');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro inesperado.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-brand-700">imbobi</h1>
          <p className="text-gray-500 text-sm mt-2">Acesse sua conta</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="E-mail" error={errors.email?.message}>
            <input
              {...register("email")}
              type="email"
              autoComplete="email"
              placeholder="seu@email.com"
              className={input(!!errors.email)}
            />
          </Field>

          <Field label="Senha" error={errors.senha?.message}>
            <input
              {...register("senha")}
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className={input(!!errors.senha)}
            />
          </Field>

          {erro && (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2">{erro}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-brand-600 text-white font-semibold py-3 rounded-2xl hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500">
          Não tem conta?{" "}
          <a href="/cadastro" className="text-brand-600 font-semibold hover:underline">
            Cadastre-se
          </a>
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

const input = (hasError: boolean) =>
  `w-full border rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-brand-500 transition ${
    hasError ? "border-red-400 bg-red-50" : "border-gray-200 bg-white"
  }`;
