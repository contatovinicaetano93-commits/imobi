"use client";

import { useEffect, useState } from "react";
import { kycApi, type KycStatus, type KycDocumento } from "@/lib/api";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Shield,
  FileText,
  User,
  CheckCircle2,
  XCircle,
  Clock,
  Upload,
  Loader2,
  AlertCircle,
  Info,
} from "lucide-react";

const TIPOS_DOCUMENTO = [
  {
    tipo: "RG_FRENTE",
    label: "RG — Frente",
    descricao: "Foto nítida da frente do seu RG",
    icon: FileText,
  },
  {
    tipo: "RG_VERSO",
    label: "RG — Verso",
    descricao: "Foto nítida do verso do seu RG",
    icon: FileText,
  },
  {
    tipo: "Selfie",
    label: "Selfie com Documento",
    descricao: "Foto sua segurando o documento",
    icon: User,
  },
];

function StatusOverviewCard({ status }: { status: KycStatus | null }) {
  const s = status?.status ?? "NENHUM";

  const config: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string; desc: string; bg: string; text: string; border: string }> = {
    APROVADO: {
      icon: ShieldCheck,
      label: "Identidade Verificada",
      desc: "Seus documentos foram analisados e aprovados.",
      bg: "bg-green-50",
      text: "text-green-700",
      border: "border-green-200",
    },
    EM_VERIFICACAO: {
      icon: ShieldAlert,
      label: "Em Verificação",
      desc: "Seus documentos estão sendo analisados pela nossa equipe.",
      bg: "bg-blue-50",
      text: "text-blue-700",
      border: "border-blue-200",
    },
    REJEITADO: {
      icon: ShieldX,
      label: "Verificação Reprovada",
      desc: "Seus documentos foram reprovados. Envie novamente com documentos válidos.",
      bg: "bg-red-50",
      text: "text-red-700",
      border: "border-red-200",
    },
    NENHUM: {
      icon: Shield,
      label: "Verificação Pendente",
      desc: "Envie seus documentos para iniciar a verificação de identidade.",
      bg: "bg-yellow-50",
      text: "text-yellow-700",
      border: "border-yellow-200",
    },
  };

  const cfg = config[s] ?? config["NENHUM"];
  const Icon = cfg.icon;

  return (
    <div className={`rounded-2xl border p-6 ${cfg.bg} ${cfg.border}`}>
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl bg-white/60 ${cfg.text}`}>
          <Icon className="w-8 h-8" />
        </div>
        <div>
          <p className={`text-lg font-bold ${cfg.text}`}>{cfg.label}</p>
          <p className={`text-sm mt-1 ${cfg.text} opacity-80`}>{cfg.desc}</p>
        </div>
      </div>

      {status?.resumo && (
        <div className="grid grid-cols-3 gap-3 mt-5">
          <div className="bg-white/60 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-yellow-700">{status.resumo.pendentes}</p>
            <p className="text-xs text-gray-500 mt-0.5">Pendente{status.resumo.pendentes !== 1 ? "s" : ""}</p>
          </div>
          <div className="bg-white/60 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-green-700">{status.resumo.aprovados}</p>
            <p className="text-xs text-gray-500 mt-0.5">Aprovado{status.resumo.aprovados !== 1 ? "s" : ""}</p>
          </div>
          <div className="bg-white/60 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-red-700">{status.resumo.rejeitados}</p>
            <p className="text-xs text-gray-500 mt-0.5">Rejeitado{status.resumo.rejeitados !== 1 ? "s" : ""}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function DocStatusIcon({ status }: { status: string }) {
  if (status === "APROVADO") return <CheckCircle2 className="w-5 h-5 text-green-500" />;
  if (status === "REJEITADO") return <XCircle className="w-5 h-5 text-red-500" />;
  return <Clock className="w-5 h-5 text-yellow-500" />;
}

function DocumentCard({
  tipo,
  label,
  descricao,
  IconComp,
  doc,
  uploading,
  onUpload,
}: {
  tipo: string;
  label: string;
  descricao: string;
  IconComp: React.ComponentType<{ className?: string }>;
  doc?: KycDocumento;
  uploading: boolean;
  onUpload: (tipo: string) => void;
}) {
  const statusStyle: Record<string, string> = {
    APROVADO: "border-green-200 bg-green-50",
    REJEITADO: "border-red-200 bg-red-50",
    PENDENTE:  "border-yellow-200 bg-yellow-50",
  };
  const cardClass = doc
    ? statusStyle[doc.status] ?? "border-gray-100 bg-white"
    : "border-gray-100 bg-white";

  return (
    <div className={`rounded-2xl border shadow-sm p-5 transition-all ${cardClass}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-white rounded-xl border border-gray-100 shrink-0">
            <IconComp className="w-5 h-5 text-[#1B4FD8]" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">{label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{descricao}</p>
            {doc && (
              <p className="text-xs text-gray-400 mt-1">
                Enviado em {new Date(doc.criadoEm).toLocaleDateString("pt-BR")}
              </p>
            )}
            {doc?.motivo_rejeicao && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {doc.motivo_rejeicao}
              </p>
            )}
          </div>
        </div>
        <div className="shrink-0">
          {doc ? (
            <DocStatusIcon status={doc.status} />
          ) : (
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">Não enviado</span>
          )}
        </div>
      </div>

      {(!doc || doc.status === "REJEITADO") && (
        <button
          onClick={() => onUpload(tipo)}
          disabled={uploading}
          className="mt-4 w-full flex items-center justify-center gap-2 bg-[#1B4FD8] text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-[#1e40af] disabled:opacity-50 transition-colors"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              {doc?.status === "REJEITADO" ? "Reenviar" : "Enviar"}
            </>
          )}
        </button>
      )}
    </div>
  );
}

export default function KycPage() {
  const [status, setStatus] = useState<KycStatus | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const data = await kycApi.obterStatus();
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar status KYC");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (tipo: string) => {
    setUploading(true);
    setError(null);
    try {
      // In real app, would upload file to S3 first and get URL
      const mockUrl = `https://s3.example.com/kyc/${tipo}-${Date.now()}.jpg`;
      await kycApi.uploadDocumento(tipo, mockUrl);
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao fazer upload");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-[#1B4FD8]" />
          <p className="text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  // Map docs by tipo for easy lookup
  const docPorTipo: Record<string, KycDocumento | undefined> = {};
  status?.documentos?.forEach((doc) => { docPorTipo[doc.tipo] = doc; });

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-[#1B4FD8]/10 rounded-xl">
          <ShieldCheck className="w-6 h-6 text-[#1B4FD8]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Verificação de Identidade</h1>
          <p className="text-sm text-gray-500 mt-0.5">Envie seus documentos para desbloquear o crédito completo</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Status Overview */}
      <StatusOverviewCard status={status} />

      {/* Documentos necessários */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-4">Documentos Necessários</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TIPOS_DOCUMENTO.map(({ tipo, label, descricao, icon: Icon }) => (
            <DocumentCard
              key={tipo}
              tipo={tipo}
              label={label}
              descricao={descricao}
              IconComp={Icon}
              doc={docPorTipo[tipo]}
              uploading={uploading}
              onUpload={handleUpload}
            />
          ))}
        </div>
      </div>

      {/* Documentos extras enviados */}
      {status?.documentos && status.documentos.some(doc => !TIPOS_DOCUMENTO.find(t => t.tipo === doc.tipo)) && (
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-4">Outros Documentos Enviados</h2>
          <div className="space-y-3">
            {status.documentos
              .filter(doc => !TIPOS_DOCUMENTO.find(t => t.tipo === doc.tipo))
              .map((doc: KycDocumento) => (
                <div key={doc.kycDocumentoId} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-5 h-5 text-gray-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{doc.tipo}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(doc.criadoEm).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <DocStatusIcon status={doc.status} />
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Informações */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-900 mb-2">Próximos passos</p>
            <ul className="space-y-1.5 text-sm text-blue-800">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                Seus documentos serão analisados em até 24 horas
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                Você receberá uma notificação quando forem aprovados ou rejeitados
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                Se rejeitado, você pode enviar os documentos novamente
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
