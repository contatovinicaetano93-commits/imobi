"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard error]", error);
  }, [error]);

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", minHeight: "60vh", padding: "2rem",
      fontFamily: "'Jost', sans-serif", textAlign: "center",
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: "#fef2f2", border: "1px solid #fecaca",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 16, fontSize: 22,
      }}>⚠</div>
      <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0C1A3D", marginBottom: 6 }}>
        Algo deu errado
      </h2>
      <p style={{ fontSize: "0.82rem", color: "rgba(12,26,61,0.45)", marginBottom: 24, maxWidth: 320 }}>
        {error.message || "Ocorreu um erro inesperado. Tente novamente."}
      </p>
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
    </div>
  );
}
