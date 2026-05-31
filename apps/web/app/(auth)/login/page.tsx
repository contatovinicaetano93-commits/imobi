"use client";

import { Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { LoginSchema, type LoginInput } from "@imbobi/schemas";
import { apiClient, ApiError } from "@imbobi/core";
import { FormField, Input } from "@/components/form-field";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [erro, setErro] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(LoginSchema) });

  const errorMessage = searchParams.get("error");
  if (errorMessage && !erro) {
    setErro(decodeURIComponent(errorMessage));
  }

  const onSubmit = async (data: LoginInput) => {
    setErro(null);
    try {
      const res = await apiClient.post<{ accessToken: string; refreshToken: string }>(
        "/auth/login",
        data
      );
      await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(res),
      });
      const nextUrl = searchParams.get("next") || "/dashboard";
      router.push(nextUrl);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Erro ao fazer login. Tente novamente.");
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8 w-full max-w-sm space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-brand-600">imobi</h1>
        <p className="text-gray-500 text-sm mt-2">Acesse sua conta</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField label="E-mail" error={errors.email?.message} required>
          <Input
            {...register("email")}
            type="email"
            autoComplete="email"
            placeholder="seu@email.com"
            hasError={!!errors.email}
          />
        </FormField>

        <FormField label="Senha" error={errors.senha?.message} required>
          <Input
            {...register("senha")}
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            hasError={!!errors.senha}
          />
        </FormField>

        {erro && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-700 font-medium">{erro}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-brand-600 text-white font-semibold py-3 rounded-xl hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? "Entrando..." : "Entrar"}
        </button>
      </form>

      <p className="text-center text-sm text-gray-600">
        Não tem conta?{" "}
        <a href="/cadastro" className="text-brand-600 font-semibold hover:underline">
          Cadastre-se
        </a>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <Suspense fallback={<div className="w-96 h-96 bg-white rounded-3xl" />}>
        <LoginFormContent />
      </Suspense>
    </div>
  );
}
