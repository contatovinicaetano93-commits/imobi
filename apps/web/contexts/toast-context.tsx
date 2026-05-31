"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { AlertContainer } from "@/components/alert";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string, title?: string, duration?: number) => void;
  error: (message: string, title?: string, duration?: number) => void;
  warning: (message: string, title?: string, duration?: number) => void;
  info: (message: string, title?: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = "info", title?: string, duration = 5000) => {
    const id = typeof window !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const newToast: Toast = { id, type, message, title, duration };
    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const toast = useCallback((message: string, type: ToastType = "info", duration = 5000) => {
    addToast(message, type, undefined, duration);
  }, [addToast]);

  const success = useCallback((message: string, title?: string, duration = 5000) => {
    addToast(message, "success", title, duration);
  }, [addToast]);

  const error = useCallback((message: string, title?: string, duration = 5000) => {
    addToast(message, "error", title || "Erro", duration);
  }, [addToast]);

  const warning = useCallback((message: string, title?: string, duration = 5000) => {
    addToast(message, "warning", title, duration);
  }, [addToast]);

  const info = useCallback((message: string, title?: string, duration = 5000) => {
    addToast(message, "info", title, duration);
  }, [addToast]);

  const value: ToastContextType = {
    toast,
    success,
    error,
    warning,
    info,
  };

  const handleDismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <AlertContainer
        alerts={toasts.map((t) => ({
          id: t.id,
          type: t.type,
          title: t.title,
          message: t.message,
          dismissible: true,
        }))}
        onDismiss={handleDismiss}
      />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
