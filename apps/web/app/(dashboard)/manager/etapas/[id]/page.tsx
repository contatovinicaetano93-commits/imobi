'use client';

import { useState, useEffect } from 'react';
import { managerApi, type EtapaDetalhe } from '@/lib/api';
import { formatarBRL } from '@imbobi/core';

interface Params {
  id: string;
}

export default function EtapaDetalhePage({ params }: { params: Params }) {
  const [etapa, setEtapa] = useState<EtapaDetalhe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<'idle' | 'approving' | 'rejecting'>('idle');
  const [motivoRejeicao, setMotivoRejeicao] = useState('');
  const [showRejectionModal, setShowRejectionModal] = useState(false);

  useEffect(() => {
    const fetchEtapa = async () => {
      try {
        setLoading(true);
        const result = await managerApi.obterEtapaDetalhe(params.id);
        setEtapa(result);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar etapa');
      } finally {
        setLoading(false);
      }
    };

    fetchEtapa();
  }, [params.id]);

  const handleApprove = async () => {
    if (!etapa) return;
    try {
      setAction('approving');
      await managerApi.aprovarEtapa(etapa.etapaId);
      // Success - redirect back
      window.location.href = '/dashboard/manager/etapas';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao aprovar etapa');
      setAction('idle');
    }
  };

  const handleReject = async () => {
    if (!etapa || !motivoRejeicao.trim()) {
      setError('Motivo da rejeição é obrigatório');
      return;
    }
    try {
      setAction('rejecting');
      await managerApi.rejeitarEtapa(etapa.etapaId, motivoRejeicao);
      // Success - redirect back
      window.location.href = '/dashboard/manager/etapas';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao rejeitar etapa');
      setAction('idle');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <a href="/dashboard/manager/etapas" className="text-sm text-brand-600 font-medium">← Voltar</a>
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <p className="text-gray-500">Carregando detalhes da etapa...</p>
        </div>
      </div>
    );
  }

  if (!etapa) {
    return (
      <div className="space-y-6">
        <a href="/dashboard/manager/etapas" className="text-sm text-brand-600 font-medium">← Voltar</a>
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <p className="text-gray-500 mb-4">Etapa não encontrada.</p>
          <a href="/dashboard/manager/etapas" className="text-brand-600 text-sm font-semibold">
            Voltar para lista de etapas
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <a href="/dashboard/manager/etapas" className="text-sm text-brand-600 font-medium mb-2 block">← Voltar</a>
          <h1 className="text-2xl font-bold text-gray-900">{etapa.nome}</h1>
        </div>
        <span className="bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium">
          AGUARDANDO VISTORIA
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Informações da Obra */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Informações da Obra</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Nome da Obra</p>
            <p className="font-semibold text-gray-900">{etapa.obra.nome}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Endereço</p>
            <p className="font-semibold text-gray-900">{etapa.obra.endereco}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Cliente</p>
            <p className="font-semibold text-gray-900">{etapa.obra.usuario.nome}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="font-semibold text-gray-900">{etapa.obra.usuario.email}</p>
          </div>
          {etapa.obra.credito && (
            <>
              <div>
                <p className="text-sm text-gray-500">Valor Aprovado</p>
                <p className="font-semibold text-gray-900">{formatarBRL(etapa.obra.credito.valorAprovado)}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Informações da Etapa */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Informações da Etapa</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-500">Ordem</p>
            <p className="font-semibold text-gray-900">{etapa.ordem}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">% da Obra</p>
            <p className="font-semibold text-gray-900">{etapa.percentualObra}%</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Valor de Liberação</p>
            <p className="font-semibold text-gray-900">{formatarBRL(etapa.valorLiberacao)}</p>
          </div>
        </div>
      </div>

      {/* Evidências */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Evidências ({etapa.evidencias.length})
        </h2>
        {etapa.evidencias.length === 0 ? (
          <p className="text-gray-500 text-sm">Nenhuma evidência validada disponível.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {etapa.evidencias.map((evidencia) => (
              <div key={evidencia.evidenciaId} className="space-y-2">
                <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={evidencia.fotoUrl}
                    alt="Evidência"
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-xs text-gray-500">
                  {new Date(evidencia.criadoEm).toLocaleDateString('pt-BR')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex gap-3">
          <button
            onClick={handleApprove}
            disabled={action !== 'idle'}
            className="flex-1 bg-green-600 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {action === 'approving' ? 'Aprovando...' : '✓ Aprovar Etapa'}
          </button>
          <button
            onClick={() => setShowRejectionModal(true)}
            disabled={action !== 'idle'}
            className="flex-1 bg-red-600 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ✗ Rejeitar Etapa
          </button>
        </div>
      </div>

      {/* Rejection Modal */}
      {showRejectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Rejeitar Etapa</h3>
            <p className="text-sm text-gray-600">
              Explique o motivo da rejeição. Este motivo será enviado ao cliente.
            </p>
            <textarea
              value={motivoRejeicao}
              onChange={(e) => setMotivoRejeicao(e.target.value)}
              placeholder="Motivo da rejeição..."
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              rows={4}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowRejectionModal(false)}
                className="flex-1 px-4 py-3 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleReject}
                disabled={!motivoRejeicao.trim() || action !== 'idle'}
                className="flex-1 bg-red-600 text-white px-4 py-3 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {action === 'rejecting' ? 'Rejeitando...' : 'Rejeitar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
