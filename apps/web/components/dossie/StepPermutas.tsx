"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { dossiesApi } from "@/lib/api";
import { fmtNumero, type StepProps } from "./dossie-utils";
import { AcoesEtapa, BannerAviso, BannerErro, BannerOk } from "./shared";
import { DocumentoUploadSlot } from "./DocumentoUploadSlot";

export function StepPermutas({ dossie, readOnly, recarregar, concluirEtapa }: StepProps) {
  const unidadesPermuta = (dossie.unidades ?? []).filter((u) => u.status === "PERMUTA");
  const aplicavel = unidadesPermuta.length > 0;

  const [resposta, setResposta] = useState<boolean | null>(
    dossie.possuiAcordoNaoConcorrenciaPermuta ?? null
  );
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const docsAcordo = (dossie.documentos ?? []).filter((d) => d.tipo === "ACORDO_PERMUTA");

  async function salvar(concluir: boolean) {
    setErro(null);
    setSucesso(null);

    if (concluir && aplicavel && resposta === null) {
      setErro("Responda à pergunta sobre o acordo de não concorrência antes de concluir a etapa.");
      return;
    }
    if (concluir && aplicavel && resposta === true && docsAcordo.length === 0) {
      setErro("Anexe o documento do acordo de permuta antes de concluir a etapa.");
      return;
    }

    setSalvando(true);
    try {
      if (aplicavel) {
        await dossiesApi.atualizarPermuta(dossie.dossieId, resposta);
      }
      if (concluir) {
        await concluirEtapa(3);
      } else {
        await recarregar();
        setSucesso("Resposta salva.");
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  if (!aplicavel) {
    return (
      <div className="space-y-6">
        <div className="flex items-start gap-3 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4">
          <Info className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
          <div className="text-sm text-gray-600">
            <p className="font-semibold text-gray-700">
              Nenhuma unidade em permuta — etapa não aplicável.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Esta etapa só se aplica quando há unidades com status PERMUTA na Tabela de
              Unidades (etapa 2). Você pode marcá-la como concluída.
            </p>
          </div>
        </div>

        {erro && <BannerErro>{erro}</BannerErro>}

        <AcoesEtapa
          readOnly={readOnly}
          salvando={salvando}
          concluida={dossie.etapasConcluidas.includes(3)}
          onConcluir={() => void salvar(true)}
          rotuloConcluir="Marcar etapa como concluída"
        />
      </div>
    );
  }

  const radioCls = "w-4 h-4 border-gray-300 text-blue-600 focus:ring-blue-500";

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3">
        <p className="text-sm text-gray-600">
          Este dossiê possui{" "}
          <strong>
            {fmtNumero(unidadesPermuta.length)} unidade
            {unidadesPermuta.length !== 1 ? "s" : ""} em permuta
          </strong>
          : {unidadesPermuta.map((u) => u.numeroUnidade).join(", ")}.
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold text-gray-900">
          Existe acordo impedindo as unidades permutadas de concorrer com o estoque do
          empreendimento (não concorrência)?
        </p>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="radio"
              name="acordo-permuta"
              checked={resposta === true}
              onChange={() => setResposta(true)}
              disabled={readOnly || salvando}
              className={radioCls}
            />
            Sim, existe acordo
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="radio"
              name="acordo-permuta"
              checked={resposta === false}
              onChange={() => setResposta(false)}
              disabled={readOnly || salvando}
              className={radioCls}
            />
            Não existe acordo
          </label>
        </div>
      </div>

      {resposta === true && (
        <DocumentoUploadSlot
          dossieId={dossie.dossieId}
          tipo="ACORDO_PERMUTA"
          titulo="Acordo de não concorrência (permutas)"
          descricaoSlot="Anexe o acordo firmado com os permutantes."
          documentos={docsAcordo}
          readOnly={readOnly}
          aoAlterar={recarregar}
        />
      )}

      {resposta === false && (
        <BannerAviso>
          <strong>Atenção:</strong> a ausência de acordo de não concorrência será registrada
          como <strong>flag de risco</strong> no dossiê — as unidades permutadas podem
          competir em preço com o estoque do empreendimento durante a análise de crédito.
        </BannerAviso>
      )}

      {erro && <BannerErro>{erro}</BannerErro>}
      {sucesso && <BannerOk>{sucesso}</BannerOk>}

      <AcoesEtapa
        readOnly={readOnly}
        salvando={salvando}
        concluida={dossie.etapasConcluidas.includes(3)}
        onSalvar={() => void salvar(false)}
        onConcluir={() => void salvar(true)}
      />
    </div>
  );
}
