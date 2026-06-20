"use client";
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type ToastType = "success" | "error" | "info";
interface Toast { id: number; message: string; type: ToastType; }
interface ToastCtxType { addToast: (message: string, type?: ToastType) => void; toasts: Toast[]; removeToast: (id: number) => void; }

const ToastCtx = createContext<ToastCtxType | null>(null);
let _id = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const addToast = useCallback((message: string, type: ToastType = "success") => {
    const id = ++_id;
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);
  const removeToast = useCallback((id: number) => setToasts(p => p.filter(t => t.id !== id)), []);
  return <ToastCtx.Provider value={{ addToast, toasts, removeToast }}>{children}</ToastCtx.Provider>;
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return {
    ...ctx,
    success: (message: string) => ctx.addToast(message, "success"),
    error: (message: string) => ctx.addToast(message, "error"),
    info: (message: string) => ctx.addToast(message, "info"),
  };
}
