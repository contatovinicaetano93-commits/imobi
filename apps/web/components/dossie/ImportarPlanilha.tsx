"use client";

import { useRef, useState } from "react";
import { Download, FileUp } from "lucide-react";
import type { ZodTypeAny } from "zod";
import type { DossieImportResultado } from "@/lib/api";
import {
  baixarModeloCsv,
  mapearHeaders,
  parseCsv,
  traduzMensagemZod,
} from "./dossie-utils";
import { BannerOk, ErrosLinha } from "./shared";

type ErroLinha = { linha: number; mensagens: string[] };

/**
 * Importação de planilha CSV (sem dependências novas no monorepo):
 * 1. Parse do CSV no client;
 * 2. Validação linha a linha com o schema de import (Zod = fonte de verdade);
 * 3. Envio das linhas cruas (raw rows) para o endpoint de import da API,
 *    que revalida e retorna { importadas, erros }.
 *
 * Arquivos XLSX devem ser exportados como CSV (o endpoint de import recebe
 * linhas JSON, não arquivos binários).
 */
export function ImportarPlanilha({
  titulo,
  headers,
  exemplo,
  schema,
  nomeModelo,
  readOnly,
  onImportar,
  aoImportar,
}: {
  titulo: string;
  /** Headers canônicos esperados (na ordem do modelo) */
  headers: string[];
  /** Linha de exemplo do modelo CSV */
  exemplo?: string[];
  /** Schema Zod de validação por linha (ImportUnidadeRowSchema etc.) */
  schema: ZodTypeAny;
  nomeModelo: string;
  readOnly: boolean;
  onImportar: (rows: Record<string, unknown>[]) => Promise<DossieImportResultado>;
  aoImportar: () => Promise<void>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [processando, setProcessando] = useState(false);
  const [errosCliente, setErrosCliente] = useState<ErroLinha[]>([]);
  const [errosServidor, setErrosServidor] = useState<ErroLinha[]>([]);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  function limpar() {
    setErrosCliente([]);
    setErrosServidor([]);
    setErroGeral(null);
    setSucesso(null);
  }

  async function handleArquivo(file: File) {
    limpar();

    if (/\.(xlsx|xls)$/i.test(file.name)) {
      setErroGeral(
        "Arquivos XLSX não são lidos diretamente: na sua planilha, use \"Salvar como → CSV\" e envie o arquivo CSV. Baixe o modelo para ver o formato esperado."
      );
      return;
    }
    if (!/\.(csv|txt)$/i.test(file.name)) {
      setErroGeral("Formato não suportado. Envie um arquivo CSV (baixe o modelo).");
      return;
    }

    setProcessando(true);
    try {
      const texto = await file.text();
      const { headers: encontrados, rows } = parseCsv(texto);

      if (rows.length === 0) {
        setErroGeral("O arquivo não contém linhas de dados.");
        return;
      }

      const mapa = mapearHeaders(encontrados, headers);
      if (Object.keys(mapa).length === 0) {
        setErroGeral(
          `Nenhuma coluna reconhecida. Colunas esperadas: ${headers.join(", ")}. Baixe o modelo para ver o formato.`
        );
        return;
      }

      // Linhas cruas com chaves canônicas (como a API espera)
      const rawRows: Record<string, unknown>[] = rows.map((row) => {
        const out: Record<string, unknown> = {};
        for (const [original, canonico] of Object.entries(mapa)) {
          out[canonico] = row[original];
        }
        return out;
      });

      // Validação client-side linha a linha (linha 1 = cabeçalho)
      const erros: ErroLinha[] = [];
      rawRows.forEach((raw, idx) => {
        const parsed = schema.safeParse(raw);
        if (!parsed.success) {
          erros.push({
            linha: idx + 2,
            mensagens: parsed.error.issues.map((i) => traduzMensagemZod(i.message)),
          });
        }
      });

      if (erros.length > 0) {
        setErrosCliente(erros);
        return;
      }

      const resultado = await onImportar(rawRows);
      if (resultado.erros?.length > 0) {
        setErrosServidor(resultado.erros);
      }
      if (resultado.importadas > 0) {
        setSucesso(
          `${resultado.importadas} linha${resultado.importadas !== 1 ? "s" : ""} importada${resultado.importadas !== 1 ? "s" : ""} com sucesso.`
        );
        await aoImportar();
      }
    } catch (err) {
      setErroGeral(err instanceof Error ? err.message : "Erro ao importar planilha");
    } finally {
      setProcessando(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px]">
          <p className="text-sm font-semibold text-gray-900">{titulo}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Envie um arquivo CSV no formato do modelo. Planilhas XLSX: exporte como CSV antes.
          </p>
        </div>
        <button
          type="button"
          onClick={() => baixarModeloCsv(nomeModelo, headers, exemplo)}
          className="inline-flex items-center gap-1.5 border border-gray-300 text-gray-700 text-xs font-semibold px-3 py-2 rounded-xl hover:bg-white transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Baixar modelo
        </button>
        {!readOnly && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={processando}
            style={{ background: "#1B4FD8" }}
            className="inline-flex items-center gap-1.5 text-white text-xs font-semibold px-3 py-2 rounded-xl disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            <FileUp className="w-3.5 h-3.5" />
            {processando ? "Importando..." : "Importar CSV"}
          </button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".csv,.txt,.xlsx,.xls"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleArquivo(f);
        }}
      />

      {erroGeral && <p className="text-sm text-red-600">{erroGeral}</p>}
      {sucesso && <BannerOk>{sucesso}</BannerOk>}
      <ErrosLinha
        titulo="Corrija as linhas abaixo e importe novamente (nenhuma linha foi enviada):"
        erros={errosCliente}
      />
      <ErrosLinha titulo="A API recusou as linhas abaixo:" erros={errosServidor} />
    </div>
  );
}
