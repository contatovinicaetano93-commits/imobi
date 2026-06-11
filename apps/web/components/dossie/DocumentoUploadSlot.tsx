"use client";

import { useRef, useState } from "react";
import { FileText, Trash2, Upload } from "lucide-react";
import { DocumentoDossieSchema, type TipoDocumentoDossie } from "@imbobi/schemas";
import { dossiesApi, type DossieDocumentoItem } from "@/lib/api";
import { fmtData, TIPO_DOCUMENTO_LABEL, traduzMensagemZod } from "./dossie-utils";

/**
 * Slot de upload de documento do dossiê.
 *
 * Segue o padrão de storage existente no web (ver KYC em
 * app/(dashboard)/dashboard/kyc/page.tsx): o arquivo é registrado na API com
 * uma URL S3 e os metadados; a API valida com DocumentoDossieSchema.
 */
export function DocumentoUploadSlot({
  dossieId,
  tipo,
  titulo,
  descricaoSlot,
  anoExercicio,
  documentos,
  readOnly,
  multiplos = false,
  aoAlterar,
}: {
  dossieId: string;
  tipo: TipoDocumentoDossie;
  titulo?: string;
  descricaoSlot?: string;
  /** Obrigatório quando tipo = DEMONSTRACAO_FINANCEIRA */
  anoExercicio?: number;
  /** Documentos já enviados deste slot (filtrados pelo chamador) */
  documentos: DossieDocumentoItem[];
  readOnly: boolean;
  /** Permite mais de um arquivo no slot */
  multiplos?: boolean;
  aoAlterar: () => Promise<void>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [removendo, setRemovendo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const podeEnviar = !readOnly && (multiplos || documentos.length === 0);

  async function handleArquivo(file: File) {
    setErro(null);
    setEnviando(true);
    try {
      const nomeSeguro = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
      const url = `https://s3.example.com/dossies/${dossieId}/${tipo}-${Date.now()}-${nomeSeguro}`;
      const payload = {
        tipo,
        url,
        nomeArquivo: file.name.slice(0, 255),
        ...(anoExercicio != null ? { anoExercicio } : {}),
        ...(tipo === "OUTRO" ? { descricao: descricaoSlot ?? file.name.slice(0, 500) } : {}),
      };
      const parsed = DocumentoDossieSchema.safeParse(payload);
      if (!parsed.success) {
        setErro(traduzMensagemZod(parsed.error.issues[0]?.message ?? "Documento inválido"));
        return;
      }
      await dossiesApi.adicionarDocumento(dossieId, parsed.data);
      await aoAlterar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao enviar documento");
    } finally {
      setEnviando(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleRemover(docId: string) {
    setErro(null);
    setRemovendo(docId);
    try {
      await dossiesApi.removerDocumento(dossieId, docId);
      await aoAlterar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao remover documento");
    } finally {
      setRemovendo(null);
    }
  }

  return (
    <div className="border border-gray-100 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#EEF3FF] flex items-center justify-center shrink-0">
          <FileText className="w-4.5 h-4.5 text-[#1B4FD8]" size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">
            {titulo ?? TIPO_DOCUMENTO_LABEL[tipo] ?? tipo}
            {anoExercicio != null && (
              <span className="text-gray-500 font-normal"> — exercício {anoExercicio}</span>
            )}
          </p>
          {descricaoSlot && <p className="text-xs text-gray-400 mt-0.5">{descricaoSlot}</p>}
        </div>
        {podeEnviar && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={enviando}
            style={{ background: "#1B4FD8" }}
            className="flex items-center gap-1.5 text-xs font-semibold text-white px-3 py-1.5 rounded-lg disabled:opacity-50 hover:opacity-90 transition-opacity shrink-0"
          >
            <Upload className="w-3.5 h-3.5" />
            {enviando ? "Enviando..." : "Enviar"}
          </button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.csv,.ppt,.pptx,.doc,.docx"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleArquivo(f);
        }}
      />

      {documentos.length > 0 && (
        <ul className="divide-y divide-gray-50">
          {documentos.map((doc) => (
            <li key={doc.dossieDocumentoId} className="flex items-center gap-3 py-2">
              <FileText className="w-4 h-4 text-gray-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-700 hover:text-[#1B4FD8] truncate block"
                >
                  {doc.nomeArquivo ?? TIPO_DOCUMENTO_LABEL[doc.tipo] ?? doc.tipo}
                </a>
                <p className="text-xs text-gray-400">
                  {doc.anoExercicio != null && <>Exercício {doc.anoExercicio} · </>}
                  Enviado em {fmtData(doc.criadoEm)}
                </p>
              </div>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => void handleRemover(doc.dossieDocumentoId)}
                  disabled={removendo === doc.dossieDocumentoId}
                  title="Remover documento"
                  className="text-gray-300 hover:text-red-500 disabled:opacity-50 transition-colors shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {erro && <p className="text-xs text-red-600">{erro}</p>}
    </div>
  );
}
