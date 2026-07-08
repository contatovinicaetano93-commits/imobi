"use client";

import { useEffect } from "react";
import { captureException } from "@/lib/sentry";

/**
 * Última linha de defesa: captura erros que escapam do root layout
 * (onde `(dashboard)/error.tsx` não alcança). Precisa renderizar seu
 * próprio <html>/<body> porque substitui o layout raiz.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global error]", error);
    try {
      captureException(error, { boundary: "global-error", digest: error.digest });
    } catch {
      /* Sentry opcional */
    }
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
          minHeight: "100vh",
          padding: "2rem",
          fontFamily: "'Jost', system-ui, sans-serif",
          textAlign: "center",
          background: "#f8fafc",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: "#fef2f2",
            border: "1px solid #fecaca",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
            fontSize: 22,
          }}
        >
          ⚠
        </div>
        <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#0C1A3D", marginBottom: 6 }}>
          Algo deu errado
        </h2>
        <p
          style={{
            fontSize: "0.85rem",
            color: "rgba(12,26,61,0.5)",
            marginBottom: 24,
            maxWidth: 340,
          }}
        >
          Tivemos um problema inesperado. Tente novamente — se persistir, recarregue a página.
        </p>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={reset}
            style={{
              padding: "0.55rem 1.25rem",
              borderRadius: 10,
              border: "none",
              background: "#0C1A3D",
              color: "white",
              fontFamily: "inherit",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Tentar novamente
          </button>
          <a
            href="/dashboard/construtor"
            style={{
              padding: "0.55rem 1.25rem",
              borderRadius: 10,
              border: "1px solid rgba(12,26,61,0.15)",
              background: "white",
              color: "#0C1A3D",
              fontFamily: "inherit",
              fontSize: "0.85rem",
              fontWeight: 600,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            Ir para o início
          </a>
        </div>
      </body>
    </html>
  );
}
