'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Phone, Mail, User, Calendar, CheckCircle } from 'lucide-react';
import { LeadDetail } from '@imbobi/schemas';
import { ScoreBreakdown } from '@/components/dashboard/comercial/ScoreBreakdown';
import { ConversionTimeline } from '@/components/dashboard/comercial/ConversionTimeline';

export default function LeadDetailPage() {
  const params = useParams();
  const id = String(params?.id ?? "");
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLead = async () => {
      try {
        const response = await fetch(`/api/proxy/comercial/leads/${id}`);
        if (response.ok) {
          const data: LeadDetail = await response.json();
          setLead(data);
        }
      } catch (error) {
        console.error('Failed to fetch lead:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLead();
  }, [id]);

  const STAGE_COLOR: Record<string, string> = {
    Novo: "bg-gray-100 text-gray-700",
    Contatado: "bg-blue-100 text-blue-700",
    Qualificado: "bg-purple-100 text-purple-700",
    Proposta: "bg-orange-100 text-orange-700",
    Convertido: "bg-green-100 text-green-700",
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/comercial" className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="h-7 w-48 bg-gray-200 rounded-lg animate-pulse" />
        </div>
        <div className="h-40 bg-white rounded-2xl border border-gray-100 animate-pulse" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/comercial" className="flex items-center gap-1.5 text-[#1B4FD8] hover:text-blue-800 text-sm font-semibold transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>
        </div>
        <div className="bg-red-50 rounded-2xl border border-red-100 p-8 text-center">
          <p className="text-red-700 font-semibold">Lead não encontrado</p>
          <p className="text-sm text-red-500 mt-1">O lead pode ter sido removido ou você não tem acesso.</p>
        </div>
      </div>
    );
  }

  const stageName = lead.stage?.nome ?? 'N/A';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/dashboard/comercial" className="p-2 rounded-xl hover:bg-white hover:shadow-sm transition-all text-gray-400 hover:text-[#1B4FD8] shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 truncate">{lead.clienteNome}</h1>
            <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 shrink-0" />
              {lead.clienteEmail}
            </p>
          </div>
        </div>
        <span className={`text-xs font-semibold px-3 py-1.5 rounded-full shrink-0 ${STAGE_COLOR[stageName] ?? "bg-gray-100 text-gray-700"}`}>
          {stageName}
        </span>
      </div>

      {/* Info card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Informações do Contato</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="flex items-start gap-2">
            <Phone className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Telefone</p>
              <p className="text-sm font-semibold text-gray-900">{lead.clienteTelefone || '—'}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <User className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Segmento</p>
              <p className="text-sm font-semibold text-gray-900">{lead.segmentoCliente || '—'}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Fonte</p>
            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">{lead.fonte || '—'}</span>
          </div>
          {lead.proximoAcompanhamento && (
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Próx. Contato</p>
                <p className="text-sm font-semibold text-gray-900">
                  {new Date(lead.proximoAcompanhamento).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {lead.scoreHistorico && lead.scoreHistorico.length > 0 ? (
            <ScoreBreakdown score={lead.scoreHistorico[0]} />
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
              <p className="text-gray-400 text-sm">Score ainda não calculado para este lead.</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-4">
          <h3 className="font-semibold text-gray-900">Ações</h3>
          {lead.proximoAcompanhamento && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl">
              <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
              <div>
                <p className="text-xs text-blue-600 font-medium">Acompanhamento</p>
                <p className="text-sm font-bold text-blue-800">
                  {new Date(lead.proximoAcompanhamento).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          )}
          <a
            href={`https://wa.me/${lead.clienteTelefone?.replace(/\D/g, '')}?text=Olá ${encodeURIComponent(lead.clienteNome)}, tudo bem?`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#25D366] text-white text-sm font-semibold rounded-xl hover:bg-green-600 transition-colors"
          >
            <Phone className="w-4 h-4" />
            WhatsApp
          </a>
          <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors">
            <CheckCircle className="w-4 h-4" />
            Registrar Atividade
          </button>
        </div>
      </div>

      {lead.atividades && lead.atividades.length > 0 && (
        <ConversionTimeline activities={lead.atividades} />
      )}
    </div>
  );
}
