"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { CadastroUsuarioSchema, type CadastroUsuarioInput } from "@imbobi/schemas";
import { apiClient, ApiError, formatarCPF, formatarTelefone } from "@imbobi/core";

export default function CadastroPage() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CadastroUsuarioInput>({
    resolver: zodResolver(CadastroUsuarioSchema),
    defaultValues: { tipo: "TOMADOR" },
  });

  const onError = (errs: unknown) => {
    console.error("[cadastro] validation errors:", errs);
  };

  const onSubmit = async (data: CadastroUsuarioInput) => {
    setErro(null);
    try {
      const res = await apiClient.post<{ accessToken: string; refreshToken: string }>(
        "/auth/registrar",
        { ...data, consentidoEm: new Date().toISOString() }
      );
      await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(res),
      });
      router.push("/dashboard");
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Erro inesperado.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-brand-700">imbobi</h1>
          <p className="text-gray-500 text-sm mt-2">Crie sua conta gratuitamente</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nome completo" error={errors.nome?.message} className="col-span-2">
              <input {...register("nome")} placeholder="João da Silva" className={input(!!errors.nome)} />
            </Field>

            <Field label="CPF" error={errors.cpf?.message}>
              <input
                {...register("cpf")}
                placeholder="00000000000"
                maxLength={11}
                className={input(!!errors.cpf)}
              />
            </Field>

            <Field label="Telefone" error={errors.telefone?.message}>
              <input
                {...register("telefone")}
                placeholder="11999999999"
                maxLength={11}
                className={input(!!errors.telefone)}
              />
            </Field>

            <Field label="E-mail" error={errors.email?.message} className="col-span-2">
              <input {...register("email")} type="email" placeholder="seu@email.com" className={input(!!errors.email)} />
            </Field>

            <Field label="Senha" error={errors.senha?.message} className="col-span-2">
              <input {...register("senha")} type="password" placeholder="Mín. 8 caracteres" className={input(!!errors.senha)} />
            </Field>
          </div>

          <div className="space-y-3 pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Consentimentos (LGPD)</p>

            <ConsentCheck
              id="consentidoTermos"
              error={errors.consentidoTermos?.message}
              {...register("consentidoTermos")}
            >
              Li e aceito os{" "}
              <a href="/termos" target="_blank" className="text-brand-600 underline">Termos de Uso</a>
              {" "}*
            </ConsentCheck>

            <ConsentCheck
              id="consentidoPrivacy"
              error={errors.consentidoPrivacy?.message}
              {...register("consentidoPrivacy")}
            >
              Li e aceito a{" "}
              <a href="/privacidade" target="_blank" className="text-brand-600 underline">Política de Privacidade</a>
              {" "}*
            </ConsentCheck>

            <ConsentCheck
              id="consentidoKyc"
              error={errors.consentidoKyc?.message}
              {...register("consentidoKyc")}
            >
              Autorizo a verificação de identidade (KYC) junto à Unico/SERPRO *
            </ConsentCheck>

            <ConsentCheck
              id="consentidoMarketing"
              {...register("consentidoMarketing")}
            >
              Aceito receber comunicações de marketing (opcional)
            </ConsentCheck>
          </div>

          {erro && (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2">{erro}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-brand-600 text-white font-semibold py-3 rounded-2xl hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? "Criando conta..." : "Criar conta"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500">
          Já tem conta?{" "}
          <a href="/login" className="text-brand-600 font-semibold hover:underline">
            Entrar
          </a>
        </p>
      </div>
    </div>
  );
}

function Field({
  label, error, children, className = "",
}: {
  label: string; error?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`space-y-1 ${className}`}>
      <label className="text-sm font-medium text-gray-700">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function ConsentCheck({
  id, error, children, ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { id: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <label htmlFor={id} className="flex items-start gap-2 cursor-pointer">
        <input id={id} type="checkbox" className="mt-0.5 accent-brand-600" {...props} />
        <span className="text-sm text-gray-700">{children}</span>
      </label>
      {error && <p className="text-xs text-red-500 ml-5">{error}</p>}
    </div>
  );
}

const input = (hasError: boolean) =>
  `w-full border rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-brand-500 transition ${
    hasError ? "border-red-400 bg-red-50" : "border-gray-200 bg-white"
  }`;
