"use client";

import { useEffect } from "react";

export default function MarketingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[marketing error]", error);
  }, [error]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        fontFamily: "'Jost', system-ui, sans-serif",
        textAlign: "center",
        padding: "2rem",
      }}
    >
      <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0C1A3D", marginBottom: 8 }}>
        Algo deu errado
      </h2>
      <p style={{ fontSize: "0.875rem", color: "#6b7280", maxWidth: 320, marginBottom: 24 }}>
        {error.message || "Ocorreu um erro inesperado. Tente novamente."}
      </p>
      <button
        onClick={reset}
        style={{
          padding: "0.5rem 1.25rem",
          borderRadius: 10,
          border: "none",
          background: "#1B4FD8",
          color: "white",
          fontWeight: 600,
          fontSize: "0.875rem",
          cursor: "pointer",
        }}
      >
        Tentar novamente
      </button>
    </div>
  );
}
