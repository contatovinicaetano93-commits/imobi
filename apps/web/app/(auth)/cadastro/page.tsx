"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CadastroUsuarioSchema, type CadastroUsuarioInput } from "@imbobi/schemas";

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

  const onSubmit = async (data: CadastroUsuarioInput) => {
    setErro(null);
    try {
      const res = await fetch("http://localhost:4000/api/v1/auth/registrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(
          Array.isArray(error.message) ? error.message[0] : error.message
        );
      }

      const result = await res.json();

      // Save accessToken to localStorage for dashboard
      localStorage.setItem("accessToken", result.accessToken);

      // refreshToken is automatically set as HttpOnly cookie by the API
      // No need to handle it explicitly

      router.push("/dashboard");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-brand-700">imbobi</h1>
          <p className="text-gray-500 text-sm mt-2">Crie sua conta gratuitamente</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

const input = (hasError: boolean) =>
  `w-full border rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-brand-500 transition ${
    hasError ? "border-red-400 bg-red-50" : "border-gray-200 bg-white"
  }`;
