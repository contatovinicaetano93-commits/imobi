import * as SecureStore from "expo-secure-store";
import { apiClient } from "@imbobi/core";

export type Jornada = {
  perfil: "tomador" | "gestor" | "outro";
  passoAtual: string;
  titulo: string;
  descricao: string;
  href: string;
  concluido: boolean;
  passosConcluidos: number;
  totalPassos: number;
  progressoPct: number;
  bloqueado?: string;
  fila?: { kyc: number; etapas: number };
};

/** Mapeia href da jornada web → rota Expo Router. */
export function mapJornadaHrefToMobileRoute(href: string): string {
  const path = href.split("?")[0] ?? href;
  if (path.includes("/kyc")) return "/(tabs)/kyc";
  if (path.includes("/credito")) return "/(tabs)/credito";
  if (path.includes("/obras")) return "/(tabs)/obras";
  if (path.includes("/construtor") || path.includes("/gestor")) return "/(tabs)/inicio";
  return "/(tabs)/inicio";
}

export async function obterJornada(): Promise<Jornada> {
  const token = await SecureStore.getItemAsync("accessToken");
  if (!token) throw new Error("Sessão expirada");
  return apiClient.get<Jornada>("/jornada", token);
}

export async function resolvePostLoginRoute(): Promise<string> {
  try {
    const jornada = await obterJornada();
    return mapJornadaHrefToMobileRoute(jornada.href);
  } catch {
    return "/(tabs)/inicio";
  }
}
