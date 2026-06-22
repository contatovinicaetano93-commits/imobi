import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { ApiError, clearSession, setOnUnauthorized, usuariosApi } from "./api";
import { normalizeTipo } from "./roles";

type AuthContextValue = {
  isLoading: boolean;
  isSignedIn: boolean;
  userTipo: string;
  signIn: (tipo: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** Uma limpeza de sessão por start do Metro (dev). */
let devSessionBooted = false;

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userTipo, setUserTipo] = useState("TOMADOR");

  const signOut = useCallback(async () => {
    await clearSession();
    setIsSignedIn(false);
    setUserTipo("TOMADOR");
    router.replace("/login");
  }, [router]);

  const signIn = useCallback(async (tipo: string) => {
    const normalized = normalizeTipo(tipo);
    setUserTipo(normalized);
    setIsSignedIn(true);
    await SecureStore.setItemAsync("userTipo", normalized);
  }, []);

  const refreshProfile = useCallback(async () => {
    const perfil = await usuariosApi.obterPerfil();
    const normalized = normalizeTipo(perfil.tipo);
    setUserTipo(normalized);
    await SecureStore.setItemAsync("userTipo", normalized);
    setIsSignedIn(true);
  }, []);

  useEffect(() => {
    setOnUnauthorized(() => {
      void signOut();
    });
  }, [signOut]);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        if (__DEV__ && process.env.EXPO_PUBLIC_DEV_FORCE_LOGIN === "1" && !devSessionBooted) {
          devSessionBooted = true;
          await clearSession();
        }
        const token = await SecureStore.getItemAsync("accessToken");
        if (!token) {
          setIsSignedIn(false);
          return;
        }
        const cached = await SecureStore.getItemAsync("userTipo");
        if (cached) setUserTipo(normalizeTipo(cached));
        try {
          await refreshProfile();
        } catch (e) {
          if (e instanceof ApiError && e.status === 401) {
            await clearSession();
            setIsSignedIn(false);
            return;
          }
          setIsSignedIn(true);
        }
      } catch (e) {
        console.error("bootstrap", e);
        setIsSignedIn(false);
      } finally {
        setIsLoading(false);
      }
    };
    void bootstrap();
  }, [refreshProfile]);

  const value = useMemo(
    () => ({ isLoading, isSignedIn, userTipo, signIn, signOut, refreshProfile }),
    [isLoading, isSignedIn, userTipo, signIn, signOut, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
