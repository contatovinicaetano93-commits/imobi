"use client";
import { useToast } from "@/hooks/toast-context";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

export function Toaster() {
  const { toasts, removeToast } = useToast();
  if (toasts.length === 0) return null;
  return (
    <div style={{ position: "fixed", bottom: 80, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8, maxWidth: 340 }}>
      {toasts.map(t => {
        const cfg = t.type === "success"
          ? { bg: "#f0fdf4", border: "#bbf7d0", color: "#15803d", icon: CheckCircle2 }
          : t.type === "error"
          ? { bg: "#fef2f2", border: "#fecaca", color: "#dc2626", icon: XCircle }
          : { bg: "#eff6ff", border: "#bfdbfe", color: "#1d4ed8", icon: Info };
        const Icon = cfg.icon;
        return (
          <div key={t.id} style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            background: cfg.bg, border: `1px solid ${cfg.border}`,
            borderRadius: 12, padding: "0.75rem 1rem",
            boxShadow: "0 4px 20px rgba(0,0,0,0.10)",
            animation: "toast-in 0.25s cubic-bezier(0.22,1,0.36,1)",
            fontFamily: "'Jost', sans-serif",
          }}>
            <Icon size={16} color={cfg.color} style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ flex: 1, fontSize: "0.82rem", fontWeight: 500, color: cfg.color, margin: 0 }}>{t.message}</p>
            <button onClick={() => removeToast(t.id)} style={{ background: "none", border: "none", cursor: "pointer", color: cfg.color, opacity: 0.5, padding: 0, display: "flex", marginTop: 1 }}>
              <X size={14} />
            </button>
          </div>
        );
      })}
      <style>{`@keyframes toast-in { from { opacity:0; transform: translateY(12px); } to { opacity:1; transform: none; } }`}</style>
    </div>
  );
}
