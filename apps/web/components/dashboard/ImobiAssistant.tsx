"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, Loader2, Send, X } from "lucide-react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const ROYAL = "#1B4FD8";
const NAVY = "#0C1A3D";

export function ImobiAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Olá! Sou o assistente IMOBI. Posso ajudar com KYC, obras, crédito, viabilidade e navegação na plataforma. O que você precisa?",
    },
  ]);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, open, loading]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const history = messages.filter((m) => m.role === "user" || m.role === "assistant");
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/proxy/assistente/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: history.slice(-12),
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        reply?: string;
        message?: string;
      };

      if (!res.ok) {
        throw new Error(data.message ?? "Não foi possível obter resposta.");
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply ?? "Sem resposta." },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao enviar mensagem.";
      setError(msg);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Não consegui responder agora. Tente de novo em instantes ou use o WhatsApp para falar com a equipe.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Fechar assistente IMOBI" : "Abrir assistente IMOBI"}
        aria-expanded={open}
        style={{
          position: "fixed",
          bottom: 80,
          right: 24,
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: `linear-gradient(135deg, ${ROYAL} 0%, ${NAVY} 100%)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 16px rgba(27,79,216,0.35)",
          zIndex: 51,
          border: "none",
          cursor: "pointer",
          color: "white",
        }}
      >
        {open ? <X size={20} /> : <Bot size={22} />}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Assistente IMOBI"
          style={{
            position: "fixed",
            bottom: 136,
            right: 24,
            width: "min(360px, calc(100vw - 32px))",
            height: "min(480px, calc(100vh - 160px))",
            background: "white",
            borderRadius: 16,
            border: "1px solid rgba(12,26,61,0.1)",
            boxShadow: "0 12px 40px rgba(12,26,61,0.18)",
            zIndex: 52,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            fontFamily: "'Jost', sans-serif",
          }}
        >
          <div
            style={{
              padding: "14px 16px",
              background: NAVY,
              color: "white",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: "rgba(74,222,128,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Bot size={18} color="#4ADE80" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>Assistente IMOBI</p>
              <p style={{ margin: 0, fontSize: 11, opacity: 0.65 }}>
                Dúvidas sobre a plataforma
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar"
              style={{
                background: "transparent",
                border: "none",
                color: "white",
                cursor: "pointer",
                padding: 4,
              }}
            >
              <X size={18} />
            </button>
          </div>

          <div
            ref={listRef}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              background: "#F8FAFF",
            }}
          >
            {messages.map((m, i) => (
              <div
                key={`${i}-${m.role}`}
                style={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "88%",
                  padding: "10px 12px",
                  borderRadius: 12,
                  fontSize: 13,
                  lineHeight: 1.45,
                  background: m.role === "user" ? ROYAL : "white",
                  color: m.role === "user" ? "white" : "#374151",
                  border: m.role === "user" ? "none" : "1px solid #E5E7EB",
                }}
              >
                {m.content}
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#6B7280", fontSize: 12 }}>
                <Loader2 size={14} className="animate-spin" />
                Pensando…
              </div>
            )}
          </div>

          {error && (
            <p style={{ margin: 0, padding: "6px 12px", fontSize: 11, color: "#B45309", background: "#FFFBEB" }}>
              {error}
            </p>
          )}

          <form
            style={{
              padding: 10,
              borderTop: "1px solid #EEF2FF",
              display: "flex",
              gap: 8,
              background: "white",
            }}
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pergunte sobre o IMOBI…"
              disabled={loading}
              maxLength={2000}
              style={{
                flex: 1,
                border: "1px solid #E5E7EB",
                borderRadius: 10,
                padding: "10px 12px",
                fontSize: 13,
                outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Enviar"
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                border: "none",
                background: ROYAL,
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                opacity: loading || !input.trim() ? 0.5 : 1,
              }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
