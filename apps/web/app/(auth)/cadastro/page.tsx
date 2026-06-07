"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { CadastroUsuarioSchema, type CadastroUsuarioInput } from "@imbobi/schemas";
import { apiClient, ApiError } from "@imbobi/core";

const WA = "5511993455589";

export default function CadastroPage() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CadastroUsuarioInput>({
    resolver: zodResolver(CadastroUsuarioSchema),
    defaultValues: {
      tipo: "TOMADOR",
      consentidoTermos: false,
      consentidoPrivacy: false,
      consentidoKyc: false,
      consentidoMarketing: false,
    },
  });

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
    <div
      className="min-h-screen flex items-center justify-center p-4 py-8"
      style={{ background: "linear-gradient(135deg, #1B4FD8 0%, #1e40af 100%)" }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Faixa verde topo */}
        <div className="h-1.5 w-full" style={{ backgroundColor: "#16a34a" }} />

        <div className="px-6 py-5 space-y-4">
          {/* Logo */}
          <div className="text-center">
            <span className="text-2xl font-bold" style={{ color: "#15803d" }}>Imobi</span>
            <p className="text-gray-400 text-xs mt-0.5">Crie sua conta gratuitamente</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nome completo" error={errors.nome?.message} className="col-span-2">
                <input {...register("nome")} placeholder="João da Silva" className={inputCls(!!errors.nome)} />
              </Field>

              <Field label="CPF" error={errors.cpf?.message}>
                <input {...register("cpf")} placeholder="00000000000" maxLength={11} className={inputCls(!!errors.cpf)} />
              </Field>

              <Field label="Telefone" error={errors.telefone?.message}>
                <input {...register("telefone")} placeholder="11999999999" maxLength={11} className={inputCls(!!errors.telefone)} />
              </Field>

              <Field label="E-mail" error={errors.email?.message} className="col-span-2">
                <input {...register("email")} type="email" placeholder="seu@email.com" className={inputCls(!!errors.email)} />
              </Field>

              <Field label="Senha" error={errors.senha?.message} className="col-span-2">
                <input {...register("senha")} type="password" placeholder="Mín. 8 caracteres" className={inputCls(!!errors.senha)} />
              </Field>
            </div>

            {/* Consentimentos */}
            <div className="space-y-2 pt-2" style={{ borderTop: "1px solid #f0fdf4" }}>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#15803d" }}>
                Consentimentos (LGPD)
              </p>

              <ConsentController control={control} name="consentidoTermos" error={errors.consentidoTermos?.message}>
                Li e aceito os{" "}
                <a href="/termos" target="_blank" style={{ color: "#16a34a" }} className="underline">Termos de Uso</a> *
              </ConsentController>

              <ConsentController control={control} name="consentidoPrivacy" error={errors.consentidoPrivacy?.message}>
                Li e aceito a{" "}
                <a href="/privacidade" target="_blank" style={{ color: "#16a34a" }} className="underline">Política de Privacidade</a> *
              </ConsentController>

              <ConsentController control={control} name="consentidoKyc" error={errors.consentidoKyc?.message}>
                Autorizo verificação de identidade (KYC) *
              </ConsentController>

              <ConsentController control={control} name="consentidoMarketing">
                Aceito comunicações de marketing (opcional)
              </ConsentController>
            </div>

            {erro && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{erro}</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full text-white font-bold py-3 rounded-xl transition-all text-sm disabled:opacity-60 hover:opacity-90 active:scale-95"
              style={{ backgroundColor: "#16a34a" }}
            >
              {isSubmitting ? "Criando conta..." : "Criar conta"}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400">
            Já tem conta?{" "}
            <a href="/login" className="font-semibold hover:underline" style={{ color: "#16a34a" }}>
              Entrar
            </a>
          </p>
        </div>

        {/* Faixa verde rodapé */}
        <div className="h-1 w-full opacity-40" style={{ backgroundColor: "#22c55e" }} />
      </div>

      {/* WhatsApp flutuante */}
      <a
        href={`https://wa.me/${WA}?text=Olá!%20Preciso%20de%20ajuda%20com%20o%20Imobi.`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Fale conosco no WhatsApp"
        className="fixed bottom-6 right-6 flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-transform hover:scale-110 active:scale-95"
        style={{ backgroundColor: "#25D366" }}
      >
        <svg viewBox="0 0 24 24" fill="white" className="w-7 h-7">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </a>
    </div>
  );
}

function ConsentController({ control, name, error, children }: {
  control: any; name: string; error?: string; children: React.ReactNode;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div className="space-y-0.5">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5"
              style={{ accentColor: "#16a34a" }}
              checked={!!field.value}
              onChange={(e) => field.onChange(e.target.checked)}
            />
            <span className="text-xs text-gray-600">{children}</span>
          </label>
          {error && <p className="text-xs text-red-500 ml-5">{error}</p>}
        </div>
      )}
    />
  );
}

function Field({ label, error, children, className = "" }: {
  label: string; error?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`space-y-1 ${className}`}>
      <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#15803d" }}>
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

const inputCls = (hasError: boolean) =>
  `w-full border rounded-lg px-3 py-2 text-sm text-gray-800 outline-none transition ${
    hasError ? "border-red-400 bg-red-50" : "border-gray-200 bg-gray-50 focus:bg-white focus:border-green-400"
  }`;
