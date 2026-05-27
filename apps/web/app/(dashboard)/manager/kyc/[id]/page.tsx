'use client';

import { useState, useEffect } from 'react';
import { managerApi, type KycPendente } from '@/lib/api';

interface Params {
  id: string;
}

const KYC_TYPES: Record<string, string> = {
  CPF: 'CPF',
  RG: 'RG',
  COMPROVANTE_RENDA: 'Comprovante de Renda',
  COMPROVANTE_ENDERECO: 'Comprovante de Endereço',
  SELFIE: 'Selfie',
  DOCUMENTO_FRENTE: 'Documento - Frente',
  DOCUMENTO_VERSO: 'Documento - Verso',
};

export default function KycDetalhePage({ params }: { params: Params }) {
  const [kyc, setKyc] = useState<KycPendente | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<'idle' | 'approving' | 'rejecting'>('idle');
  const [motivoRejeicao, setMotivoRejeicao] = useState('');
  const [showRejectionModal, setShowRejectionModal] = useState(false);

  useEffect(() => {
    const fetchKyc = async () => {
      try {
        setLoading(true);
        const result = await managerApi.obterKycDetalhe(params.id);
        setKyc(result);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar documento KYC');
      } finally {
        setLoading(false);
      }
    };

    fetchKyc();
  }, [params.id]);

  const handleApprove = async () => {
    if (!kyc) return;
    try {
      setAction('approving');
      await managerApi.aprovarKyc(kyc.kycDocumentoId);
      // Success - redirect back
      window.location.href = '/dashboard/manager/kyc';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao aprovar documento');
      setAction('idle');
    }
  };

  const handleReject = async () => {
    if (!kyc || !motivoRejeicao.trim()) {
      setError('Motivo da rejeição é obrigatório');
      return;
    }
    try {
      setAction('rejecting');
      await managerApi.rejeitarKyc(kyc.kycDocumentoId, motivoRejeicao);
      // Success - redirect back
      window.location.href = '/dashboard/manager/kyc';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao rejeitar documento');
      setAction('idle');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <a href="/dashboard/manager/kyc" className="text-sm text-brand-600 font-medium">← Voltar</a>
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <p className="text-gray-500">Carregando documento KYC...</p>
        </div>
      </div>
    );
  }

  if (!kyc) {
    return (
      <div className="space-y-6">
        <a href="/dashboard/manager/kyc" className="text-sm text-brand-600 font-medium">← Voltar</a>
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <p className="text-gray-500 mb-4">Documento KYC não encontrado.</p>
          <a href="/dashboard/manager/kyc" className="text-brand-600 text-sm font-semibold">
            Voltar para lista de documentos
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <a href="/dashboard/manager/kyc" className="text-sm text-brand-600 font-medium mb-2 block">← Voltar</a>
          <h1 className="text-2xl font-bold text-gray-900">Revisão KYC</h1>
        </div>
        <span className="bg-yellow-50 text-yellow-700 px-4 py-2 rounded-full text-sm font-medium">
          PENDENTE
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Informações do Cliente */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Informações do Cliente</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Nome</p>
            <p className="font-semibold text-gray-900">{kyc.usuario.nome}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">CPF</p>
            <p className="font-semibold text-gray-900">{kyc.usuario.cpf}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="font-semibold text-gray-900">{kyc.usuario.email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Status KYC</p>
            <p className={`font-semibold ${
              kyc.usuario.kycStatus === 'COMPLETO' ? 'text-green-600' :
              kyc.usuario.kycStatus === 'PENDENTE' ? 'text-yellow-600' :
              'text-red-600'
            }`}>
              {kyc.usuario.kycStatus === 'COMPLETO' && '✓ Completo'}
              {kyc.usuario.kycStatus === 'PENDENTE' && '⏳ Pendente'}
              {kyc.usuario.kycStatus === 'REJEITADO' && '✗ Rejeitado'}
            </p>
          </div>
        </div>
      </div>

      {/* Informações do Documento */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Documento</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Tipo</p>
            <p className="font-semibold text-gray-900">{KYC_TYPES[kyc.tipo] || kyc.tipo}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Data de Envio</p>
            <p className="font-semibold text-gray-900">{new Date(kyc.criadoEm).toLocaleDateString('pt-BR')}</p>
          </div>
        </div>
      </div>

      {/* Visualização do Documento */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Visualização</h2>
        <div className="relative w-full max-h-96 rounded-lg overflow-hidden bg-gray-100">
          {kyc.url.toLowerCase().endsWith('.pdf') ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <p className="text-4xl mb-4">📄</p>
                <p className="text-gray-500 mb-4">Arquivo PDF</p>
                <a
                  href={kyc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-600 font-semibold hover:text-brand-700"
                >
                  Abrir em nova aba →
                </a>
              </div>
            </div>
          ) : (
            <img
              src={kyc.url}
              alt="Documento"
              className="w-full h-full object-cover"
            />
          )}
        </div>
        <a
          href={kyc.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-600 text-sm font-semibold hover:text-brand-700 block"
        >
          Ver documento em tamanho real →
        </a>
      </div>

      {/* Action Buttons */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex gap-3">
          <button
            onClick={handleApprove}
            disabled={action !== 'idle'}
            className="flex-1 bg-green-600 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {action === 'approving' ? 'Aprovando...' : '✓ Aprovar Documento'}
          </button>
          <button
            onClick={() => setShowRejectionModal(true)}
            disabled={action !== 'idle'}
            className="flex-1 bg-red-600 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ✗ Rejeitar Documento
          </button>
        </div>
      </div>

      {/* Rejection Modal */}
      {showRejectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Rejeitar Documento</h3>
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
