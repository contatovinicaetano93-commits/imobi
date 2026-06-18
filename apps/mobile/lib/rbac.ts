import { useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { normalizeUserRole, roleCanAccessMobileTab, type AppRole } from "@imbobi/schemas";

type MobileTab = "gestor" | "engenharia" | "comercial" | "obras" | "credito" | "perfil";

export function useMobileTabAccess(tab: MobileTab) {
  const [role, setRole] = useState<AppRole | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);

  useEffect(() => {
    SecureStore.getItemAsync("userRole")
      .then((storedRole) => setRole(normalizeUserRole(storedRole)))
      .finally(() => setLoadingRole(false));
  }, []);

  return {
    role,
    loadingRole,
    canAccess: !loadingRole && roleCanAccessMobileTab(role, tab),
  };
}
