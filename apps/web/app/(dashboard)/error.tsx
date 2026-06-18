"use client";

import { useEffect } from "react";

function getErrorKind(error: Error & { status?: number }) {
  const status = error.status;
  const msg = error.message?.toLowerCase() ?? "";
  if (status === 403 || msg.includes("acesso negado") || msg === "forbidden") return "forbidden";
  if (status === 404 || msg.includes("não encontrado") || msg.includes("not found")) return "not-found";
  return "generic";
}

const KINDS = {
  forbidden: {
    icon: "🔒",
    title: "Sem permissão",
    detail: "Você não tem acesso a esta página. Verifique se está logado com o perfil correto.",
    showReset: false,
  },
  "not-found": {
    icon: "🔍",
    title: "Não encontrado",
    detail: "O recurso que você procura não existe ou foi removido.",
    showReset: false,
  },
  generic: {
    icon: "⚠",
    title: "Algo deu errado",
    detail: "",
    showReset: true,
  },
};

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string; status?: number };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard error]", error);
  }, [error]);

  const kind = getErrorKind(error);
  const { icon, title, detail, showReset } = KINDS[kind];

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", minHeight: "60vh", padding: "2rem",
      fontFamily: "'Jost', sans-serif", textAlign: "center",
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: kind === "forbidden" ? "#fef9ec" : kind === "not-found" ? "#eff6ff" : "#fef2f2",
        border: `1px solid ${kind === "forbidden" ? "#fde68a" : kind === "not-found" ? "#bfdbfe" : "#fecaca"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 16, fontSize: 22,
      }}>{icon}</div>
      <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0C1A3D", marginBottom: 6 }}>
        {title}
      </h2>
      <p style={{ fontSize: "0.82rem", color: "rgba(12,26,61,0.45)", marginBottom: 24, maxWidth: 320 }}>
        {detail || error.message || "Ocorreu um erro inesperado. Tente novamente."}
      </p>
      {showReset && (
        <button
          onClick={reset}
          style={{
            padding: "0.5rem 1.25rem", borderRadius: 10, border: "none",
            background: "#0C1A3D", color: "white", fontFamily: "'Jost', sans-serif",
            fontSize: "0.84rem", fontWeight: 600, cursor: "pointer",
          }}
        >
          Tentar novamente
        </button>
      )}
      {!showReset && (
        <a
          href="/dashboard"
          style={{
            padding: "0.5rem 1.25rem", borderRadius: 10, border: "none",
            background: "#0C1A3D", color: "white", fontFamily: "'Jost', sans-serif",
            fontSize: "0.84rem", fontWeight: 600, cursor: "pointer",
            textDecoration: "none", display: "inline-block",
          }}
        >
          Voltar ao início
        </a>
      )}
    </div>
  );
}
