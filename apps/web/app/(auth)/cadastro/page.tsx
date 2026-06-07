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
    <div style={pageStyle}>
      <div style={{ ...cardStyle, maxWidth: 460 }}>
        <LogoHeader />

        <h1 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--ink)", marginBottom: "0.25rem" }}>
          Criar conta
        </h1>
        <p style={{ fontSize: "0.83rem", color: "var(--gray)", marginBottom: "1.75rem" }}>
          Preencha os dados para acessar a plataforma IMOBI.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          <Field label="Nome completo" error={errors.nome?.message}>
            <input {...register("nome")} placeholder="João da Silva" style={errors.nome ? inputErrorStyle : inputStyle} />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <Field label="CPF" error={errors.cpf?.message}>
              <input {...register("cpf")} placeholder="00000000000" maxLength={11} style={errors.cpf ? inputErrorStyle : inputStyle} />
            </Field>
            <Field label="WhatsApp" error={errors.telefone?.message}>
              <input {...register("telefone")} placeholder="11999999999" maxLength={11} style={errors.telefone ? inputErrorStyle : inputStyle} />
            </Field>
          </div>

          <Field label="E-mail" error={errors.email?.message}>
            <input {...register("email")} type="email" placeholder="seu@email.com.br" style={errors.email ? inputErrorStyle : inputStyle} />
          </Field>

          <Field label="Senha" error={errors.senha?.message}>
            <input {...register("senha")} type="password" placeholder="Mín. 8 caracteres, 1 maiúscula, 1 número" style={errors.senha ? inputErrorStyle : inputStyle} />
          </Field>

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <p style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--ink-soft)", marginBottom: "0.25rem" }}>
              CONSENTIMENTOS (LGPD)
            </p>

            <ConsentController control={control} name="consentidoTermos" error={errors.consentidoTermos?.message}>
              Li e aceito os{" "}
              <a href="/termos" target="_blank" style={{ color: "var(--blue)", textDecoration: "underline" }}>Termos de Uso</a> *
            </ConsentController>

            <ConsentController control={control} name="consentidoPrivacy" error={errors.consentidoPrivacy?.message}>
              Li e aceito a{" "}
              <a href="/privacidade" target="_blank" style={{ color: "var(--blue)", textDecoration: "underline" }}>Política de Privacidade</a> *
            </ConsentController>

            <ConsentController control={control} name="consentidoKyc" error={errors.consentidoKyc?.message}>
              Autorizo verificação de identidade (KYC) *
            </ConsentController>

            <ConsentController control={control} name="consentidoMarketing">
              Aceito comunicações de marketing (opcional)
            </ConsentController>
          </div>

          {erro && (
            <p style={{ color: "#EF4444", fontSize: "0.78rem", background: "#FEF2F2", borderRadius: 8, padding: "0.6rem 0.85rem" }}>
              {erro}
            </p>
          )}

          <button type="submit" disabled={isSubmitting} style={submitStyle}>
            {isSubmitting ? "Criando conta..." : "Criar minha conta"}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: "0.78rem", color: "var(--gray)", marginTop: "1.25rem" }}>
          Já tem conta?{" "}
          <a href="/login" style={{ color: "var(--blue)", fontWeight: 600, textDecoration: "none" }}>
            Fazer login
          </a>
        </p>
      </div>

      <a
        href={`https://wa.me/${WA}?text=Olá!%20Preciso%20de%20ajuda%20com%20o%20IMOBI.`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Fale conosco no WhatsApp"
        style={{ position: "fixed", bottom: "1.75rem", right: "1.75rem", width: 48, height: 48, borderRadius: "50%", backgroundColor: "#25D366", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(37,211,102,0.35)", color: "white", textDecoration: "none", zIndex: 50 }}
      >
        <svg width={24} height={24} viewBox="0 0 24 24" fill="white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </a>
    </div>
  );
}

function LogoHeader() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.5rem" }}>
      <div style={{ width: 28, height: 28, border: "2px solid var(--blue)", borderRadius: 6, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gridTemplateRows: "1fr 1fr 1fr", gap: 2, padding: 4, flexShrink: 0 }}>
        {[0,1,2,3,4,5,6,7,8].map((i) => (
          <span key={i} style={{ background: [1,3,5,7].includes(i) ? "transparent" : "var(--blue)", borderRadius: 1, display: "block" }} />
        ))}
      </div>
      <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.02em" }}>IMOBI</span>
    </div>
  );
}

function ConsentController({ control, name, error, children }: {
  control: Parameters<typeof Controller>[0]["control"];
  name: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <Controller
      control={control}
      name={name as keyof CadastroUsuarioInput}
      render={({ field }) => (
        <div>
          <label style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", cursor: "pointer" }}>
            <input
              type="checkbox"
              style={{ marginTop: 2, accentColor: "var(--blue)", flexShrink: 0 }}
              checked={!!field.value}
              onChange={(e) => field.onChange(e.target.checked)}
            />
            <span style={{ fontSize: "0.72rem", color: "var(--gray)", lineHeight: 1.5 }}>{children}</span>
          </label>
          {error && <p style={{ fontSize: "0.7rem", color: "#EF4444", marginTop: "0.2rem", marginLeft: "1.25rem" }}>{error}</p>}
        </div>
      )}
    />
  );
}

function Field({ label, error, children }: {
  label: string; error?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: "var(--ink-soft)", marginBottom: "0.4rem" }}>
        {label}
      </label>
      {children}
      {error && <p style={{ fontSize: "0.72rem", color: "#EF4444", marginTop: "0.25rem" }}>{error}</p>}
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "2rem 1.5rem",
  background: "linear-gradient(150deg, #F0F5FF 0%, #FFFFFF 55%, #F0FDF7 100%)",
};

const cardStyle: React.CSSProperties = {
  background: "white",
  borderRadius: 20,
  width: "100%",
  padding: "2.25rem",
  boxShadow: "0 24px 60px rgba(15,23,42,0.1)",
  border: "1px solid var(--border)",
};

const baseInputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  color: "var(--ink)",
  fontFamily: "Inter, sans-serif",
  fontSize: "0.88rem",
  padding: "0.72rem 1rem",
  borderRadius: 10,
  outline: "none",
  transition: "all 0.15s",
};

const inputStyle: React.CSSProperties = { ...baseInputStyle };
const inputErrorStyle: React.CSSProperties = { ...baseInputStyle, borderColor: "#FCA5A5", background: "#FEF2F2" };

const submitStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--blue)",
  color: "white",
  fontFamily: "Inter, sans-serif",
  fontSize: "0.88rem",
  fontWeight: 600,
  padding: "0.85rem",
  borderRadius: 10,
  border: "none",
  cursor: "pointer",
  transition: "all 0.15s",
  boxShadow: "0 4px 14px rgba(27,79,216,0.28)",
  marginTop: "0.25rem",
};
