"use client";

import { useEffect, useState } from "react";
import type { DashboardUserRole } from "@/components/dashboard/nav/dashboard-nav-config";

const AUTH_CACHE_KEY = "imobi_auth";
const AUTH_TTL_MS = 15 * 60 * 1000;

type AuthCache = {
  authenticated?: boolean;
  role?: string;
  nome?: string;
  email?: string;
  funcoesBloqueadas?: string[];
};

export function useDashboardAuth() {
  const [role, setRole] = useState<DashboardUserRole>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [funcoesBloqueadas, setFuncoesBloqueadas] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(AUTH_CACHE_KEY);
      if (raw) {
        const { d, ts } = JSON.parse(raw) as { d?: AuthCache; ts?: number };
        if (Date.now() - (ts ?? 0) < AUTH_TTL_MS && d?.authenticated) {
          setRole((d.role as DashboardUserRole) ?? null);
          setUserName(d.nome ?? null);
          setUserEmail(d.email ?? null);
          setFuncoesBloqueadas(Array.isArray(d.funcoesBloqueadas) ? d.funcoesBloqueadas : []);
          setRoleLoading(false);
          return;
        }
      }
    } catch {
      /* sessionStorage unavailable */
    }

    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((d: AuthCache | null) => {
        if (d?.authenticated) {
          try {
            sessionStorage.setItem(AUTH_CACHE_KEY, JSON.stringify({ d, ts: Date.now() }));
          } catch {
            /* ignore */
          }
          setRole((d.role as DashboardUserRole) ?? null);
          setUserName(d.nome ?? null);
          setUserEmail(d.email ?? null);
          setFuncoesBloqueadas(Array.isArray(d.funcoesBloqueadas) ? d.funcoesBloqueadas : []);
        }
        setRoleLoading(false);
      });
  }, []);

  return { role, roleLoading, userName, userEmail, funcoesBloqueadas };
}
