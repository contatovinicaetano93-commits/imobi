"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global error]", error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100dvh",
          fontFamily: "system-ui, sans-serif",
          background: "#f8fafc",
          textAlign: "center",
          padding: "2rem",
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: "#fef2f2",
            border: "1px solid #fecaca",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
            marginBottom: 20,
          }}
        >
          ⚠
        </div>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#0C1A3D", margin: "0 0 8px" }}>
          Algo deu errado
        </h1>
        <p style={{ fontSize: "0.875rem", color: "#6b7280", maxWidth: 340, margin: "0 0 28px" }}>
          Ocorreu um erro inesperado. Nossa equipe foi notificada. Tente recarregar a página.
        </p>
        <button
          onClick={reset}
          style={{
            padding: "0.5rem 1.5rem",
            borderRadius: 10,
            border: "none",
            background: "#0C1A3D",
            color: "white",
            fontWeight: 600,
            fontSize: "0.875rem",
            cursor: "pointer",
          }}
        >
          Tentar novamente
        </button>
      </body>
    </html>
  );
}
