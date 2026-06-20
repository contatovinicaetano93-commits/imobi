import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Obra, ObraDetalhe } from "./api";

const OBRAS_LIST_KEY = "@imbobi/obras_list";
const obraDetailKey = (id: string) => `@imbobi/obra_${id}`;

type CachedList = { data: Obra[]; cachedAt: number };

export async function cacheObrasList(obras: Obra[]) {
  const payload: CachedList = { data: obras, cachedAt: Date.now() };
  await AsyncStorage.setItem(OBRAS_LIST_KEY, JSON.stringify(payload));
}

export async function getCachedObrasList(): Promise<Obra[] | null> {
  const raw = await AsyncStorage.getItem(OBRAS_LIST_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CachedList;
    return parsed.data ?? null;
  } catch {
    return null;
  }
}

export async function cacheObraDetail(obraId: string, obra: ObraDetalhe) {
  await AsyncStorage.setItem(
    obraDetailKey(obraId),
    JSON.stringify({ data: obra, cachedAt: Date.now() })
  );
}

export async function getCachedObraDetail(obraId: string): Promise<ObraDetalhe | null> {
  const raw = await AsyncStorage.getItem(obraDetailKey(obraId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { data: ObraDetalhe };
    return parsed.data ?? null;
  } catch {
    return null;
  }
}
