"use client";

import { Suspense, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import { CadastroUsuarioSchema, type CadastroUsuarioInput } from "@imbobi/schemas";
import PasswordInput from "../_components/PasswordInput";
import { registerWithRetry } from "@/lib/register-with-retry";
import { redirectAfterLogin } from "@/lib/post-login-redirect";

const WA = "5511993455589";

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export default function CadastroPage() {
  return (
    <Suspense fallback={<CadastroFallback />}>
      <CadastroForm />
    </Suspense>
  );
}

function CadastroFallback() {
  return (
    <div style={pageStyle}>
      <div style={{ ...cardStyle, maxWidth: 460, textAlign: "center", color: "var(--gray)" }}>
        Carregando…
      </div>
    </div>
  );
}

function CadastroForm() {
  const searchParams = useSearchParams();
  const simValor = searchParams.get("valor");
  const simFase = searchParams.get("fase");
  const simPrazo = searchParams.get("prazo");

  const [erro, setErro] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const nextAfterLogin = useMemo(() => {
    const next = searchParams.get("next");
    if (next && next.startsWith("/") && !next.startsWith("//")) return next;
    return null;
  }, [searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CadastroUsuarioInput>({
    resolver: zodResolver(CadastroUsuarioSchema),
  });

  const onSubmit = async (data: CadastroUsuarioInput) => {
    setErro(null);
    setStatusMsg("Conectando ao servidor… (a 1ª vez pode levar até 1 minuto)");
    try {
      const result = await registerWithRetry(data, setStatusMsg);
      redirectAfterLogin(result.role ?? "CLIENTE", nextAfterLogin ?? undefined);
    } catch (e) {
      setStatusMsg(null);
      setErro(e instanceof Error ? e.message : "Erro inesperado.");
    }
  };

  return (
    <div style={pageStyle}>
      <div style={{ ...cardStyle, maxWidth: 460 }}>
        <LogoHeader />

        {(simValor || simFase || simPrazo) && (
          <div style={simBannerStyle}>
            <p style={{ fontSize: "0.78rem", fontWeight: 600, color: "#1B4FD8", marginBottom: "0.35rem" }}>
              Simulação em andamento
            </p>
            <p style={{ fontSize: "0.75rem", color: "#334155", lineHeight: 1.5, margin: 0 }}>
              {simValor ? `Obra ${brl(Number(simValor))}` : "Obra simulada"}
              {simFase ? ` · ${simFase}` : ""}
              {simPrazo ? ` · ${simPrazo} meses` : ""}
              {" — após criar a conta você continua na jornada."}
            </p>
          </div>
        )}

        <h1 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--ink)", marginBottom: "0.25rem" }}>
          Criar conta
        </h1>
        <p style={{ fontSize: "0.83rem", color: "var(--gray)", marginBottom: "1.75rem" }}>
          Preencha os dados para acessar a plataforma IMOBI. Senha: mínimo 8 caracteres, 1 maiúscula e 1 número.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          <Field label="Nome completo" error={errors.nome?.message}>
            <input {...register("nome")} placeholder="João da Silva" style={errors.nome ? inputErrorStyle : inputStyle} />
          </Field>

          <Field label="E-mail" error={errors.email?.message}>
            <input {...register("email")} type="email" placeholder="seu@email.com.br" style={errors.email ? inputErrorStyle : inputStyle} />
          </Field>

          <Field label="Senha" error={errors.senha?.message}>
            <PasswordInput
              {...register("senha")}
              placeholder="Mín. 8 caracteres, 1 maiúscula, 1 número"
              hasError={!!errors.senha}
              style={inputStyle}
              errorStyle={inputErrorStyle}
            />
          </Field>

          {statusMsg && (
            <p style={{ color: "#1B4FD8", fontSize: "0.78rem", background: "#EFF6FF", borderRadius: 8, padding: "0.6rem 0.85rem" }}>
              {statusMsg}
            </p>
          )}

          {erro && (
            <p style={{ color: "#EF4444", fontSize: "0.78rem", background: "#FEF2F2", borderRadius: 8, padding: "0.6rem 0.85rem" }}>
              {erro}
            </p>
          )}

          <button type="submit" disabled={isSubmitting} style={btnStyle}>
            {isSubmitting ? "Criando conta…" : "Criar conta"}
          </button>
        </form>

        <p style={{ marginTop: "1.25rem", fontSize: "0.78rem", color: "var(--gray)", textAlign: "center" }}>
          Já tem conta? <a href="/login" style={{ color: "var(--blue)", fontWeight: 600 }}>Entrar</a>
        </p>
        <p style={{ marginTop: "0.75rem", fontSize: "0.72rem", color: "var(--gray)", textAlign: "center" }}>
          Dúvidas? <a href={`https://wa.me/${WA}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--blue)" }}>WhatsApp</a>
        </p>
      </div>
    </div>
  );
}

function LogoHeader() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", marginBottom: "1.5rem" }}>
      <div style={{ width: 28, height: 28, borderRadius: 6, border: "1.5px solid #4ADE80" }} />
      <span style={{ fontWeight: 800, fontSize: "1.1rem", letterSpacing: "0.04em", color: "var(--ink)" }}>IMOBI</span>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
      <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--ink-soft)" }}>{label}</span>
      {children}
      {error && <span style={{ fontSize: "0.7rem", color: "#EF4444" }}>{error}</span>}
    </label>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "2rem 1rem",
  background: "linear-gradient(180deg, #EEF3FF 0%, #f8faff 100%)",
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  background: "white",
  borderRadius: 16,
  padding: "2rem 1.75rem",
  boxShadow: "0 8px 32px rgba(12,26,61,0.08)",
  border: "1px solid rgba(12,26,61,0.06)",
};

const simBannerStyle: React.CSSProperties = {
  background: "#EFF6FF",
  border: "1px solid #BFDBFE",
  borderRadius: 10,
  padding: "0.75rem 0.85rem",
  marginBottom: "1.25rem",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.65rem 0.75rem",
  borderRadius: 8,
  border: "1px solid var(--border)",
  fontSize: "0.85rem",
  outline: "none",
};

const inputErrorStyle: React.CSSProperties = {
  ...inputStyle,
  borderColor: "#EF4444",
};

const btnStyle: React.CSSProperties = {
  marginTop: "0.25rem",
  padding: "0.75rem",
  borderRadius: 10,
  border: "none",
  background: "#1B4FD8",
  color: "white",
  fontWeight: 700,
  fontSize: "0.85rem",
  cursor: "pointer",
};
