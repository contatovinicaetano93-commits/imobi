"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CadastroUsuarioSchema, type CadastroUsuarioInput } from "@imbobi/schemas";
import { FormField, Input } from "@/components";

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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8 w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-brand-600">imobi</h1>
          <p className="text-gray-500 text-sm mt-2">Crie sua conta gratuitamente</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            label="Nome completo"
            error={errors.nome?.message}
            required
          >
            <Input
              {...register("nome")}
              placeholder="João da Silva"
              hasError={!!errors.nome}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="CPF" error={errors.cpf?.message} required>
              <Input
                {...register("cpf")}
                placeholder="00000000000"
                maxLength={11}
                hasError={!!errors.cpf}
              />
            </FormField>

            <FormField label="Telefone" error={errors.telefone?.message} required>
              <Input
                {...register("telefone")}
                placeholder="11999999999"
                maxLength={11}
                hasError={!!errors.telefone}
              />
            </FormField>
          </div>

          <FormField
            label="E-mail"
            error={errors.email?.message}
            required
          >
            <Input
              {...register("email")}
              type="email"
              placeholder="seu@email.com"
              hasError={!!errors.email}
            />
          </FormField>

          <FormField
            label="Senha"
            error={errors.senha?.message}
            hint="Mínimo 8 caracteres, com letra maiúscula e número"
            required
          >
            <Input
              {...register("senha")}
              type="password"
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
            {isSubmitting ? "Criando conta..." : "Criar conta"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600">
          Já tem conta?{" "}
          <a href="/login" className="text-brand-600 font-semibold hover:underline">
            Entrar
          </a>
        </p>
      </div>
    </div>
  );
}
