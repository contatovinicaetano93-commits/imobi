"use client";

import { useEffect, useState } from "react";
import {
  type AppRole,
  canAprovarKyc,
  canLiberarEtapas,
  fetchUserRole,
  isGestorFundoMonitor,
} from "@/lib/role-capabilities";

export function useUserRole() {
  const [role, setRole] = useState<AppRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserRole()
      .then(setRole)
      .finally(() => setLoading(false));
  }, []);

  return {
    role,
    loading,
    canLiberarEtapas: canLiberarEtapas(role),
    canAprovarKyc: canAprovarKyc(role),
    isGestorFundoMonitor: isGestorFundoMonitor(role),
  };
}
