"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { useAuth } from "@/hooks/useAuth";

/**
 * Gestor de fundo = somente leitura. Admin que cair em rota /gestor/* operacional
 * é enviado ao Centro de Comando (fallback além do middleware).
 */
export function useRedirectAdminFromGestorRoute(adminHref: Route): boolean {
  const { user, loading } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === "ADMIN";

  useEffect(() => {
    if (!loading && isAdmin) {
      router.replace(adminHref);
    }
  }, [loading, isAdmin, adminHref, router]);

  return isAdmin;
}
