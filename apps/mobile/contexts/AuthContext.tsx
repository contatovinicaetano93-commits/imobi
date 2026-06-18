import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

export type UserTipo =
  | "TOMADOR"
  | "GESTOR"
  | "GESTOR_FUNDO"
  | "ADMIN"
  | "ENGENHEIRO"
  | "COMERCIAL"
  | "PARCEIRO"
  | "CONSTRUTOR"
  | null;

interface AuthContextValue {
  userTipo: UserTipo;
  setUserTipo: (tipo: UserTipo) => void;
}

const AuthContext = createContext<AuthContextValue>({
  userTipo: null,
  setUserTipo: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userTipo, setUserTipo] = useState<UserTipo>(null);
  return (
    <AuthContext.Provider value={{ userTipo, setUserTipo }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
