import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

export interface ConfiguracaoSistema {
  taxaMensalMin: number;
  taxaMensalMax: number;
  taxaPadrao: number;
  valorMinCredito: number;
  valorMaxCredito: number;
  prazoMaxMeses: number;
  raioValidacaoMetrosPadrao: number;
  toleranciaPrecisaoGps: number;
  diasAprovacao: number;
  limiteEvidenciasMB: number;
  modoManutencao: boolean;
}

export const CONFIG_DEFAULTS: ConfiguracaoSistema = {
  taxaMensalMin: 0.89,
  taxaMensalMax: 2.5,
  taxaPadrao: 1.89,
  valorMinCredito: 50000,
  valorMaxCredito: 5000000,
  prazoMaxMeses: 60,
  raioValidacaoMetrosPadrao: 100,
  toleranciaPrecisaoGps: 20,
  diasAprovacao: 15,
  limiteEvidenciasMB: 10,
  modoManutencao: false,
};

function configPath(): string {
  const dir = join(process.cwd(), "data");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return join(dir, "configuracoes.json");
}

export function lerConfiguracoes(): ConfiguracaoSistema {
  const path = configPath();
  if (!existsSync(path)) return { ...CONFIG_DEFAULTS };
  try {
    const raw = readFileSync(path, "utf-8");
    return { ...CONFIG_DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...CONFIG_DEFAULTS };
  }
}

export function salvarConfiguracoes(partial: Partial<ConfiguracaoSistema>): ConfiguracaoSistema {
  const current = lerConfiguracoes();
  const next = { ...current, ...partial };
  writeFileSync(configPath(), JSON.stringify(next, null, 2), "utf-8");
  return next;
}
