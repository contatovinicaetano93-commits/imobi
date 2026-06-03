import Link from 'next/link';
import { comercialApi } from '@/lib/api';
import { LeadCard } from '@/components/dashboard/comercial/LeadCard';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Dashboard Comercial — imbobi' };

export default async function ComercialDashboard() {
  const [stats, leadsData] = await Promise.all([
    comercialApi.dashboardStats().catch(() => ({
      totalLeads: 0,
      leadsThisWeek: 0,
      avgScore: 0,
      conversionRate: 0,
    })),
    comercialApi.listarLeads(5, 0).catch(() => ({ leads: [], total: 0, page: 1, pageSize: 5 })),
  ]);

  const statCards = [
    { label: 'Total de Leads', value: stats.totalLeads, color: 'bg-blue-50 text-blue-700' },
    { label: 'Esta Semana', value: stats.leadsThisWeek, color: 'bg-green-50 text-green-700' },
    { label: 'Score Médio', value: Math.round(stats.avgScore), color: 'bg-purple-50 text-purple-700' },
    { label: 'Taxa Conversão', value: `${Math.round(stats.conversionRate)}%`, color: 'bg-orange-50 text-orange-700' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Comercial</h1>
        <p className="text-gray-600 mt-1">Gerenciamento de leads e conversão</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className={`rounded-2xl border border-gray-100 shadow-sm p-6 ${card.color}`}>
            <p className="text-sm font-medium opacity-75">{card.label}</p>
            <p className="text-3xl font-bold mt-2">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Leads Recentes</h2>
            <Link
              href="/dashboard/comercial/leads"
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Ver Todos
            </Link>
          </div>
          {leadsData.leads.length === 0 ? (
            <p className="text-gray-500 text-center py-12">Nenhum lead cadastrado ainda.</p>
          ) : (
            <div className="space-y-3">
              {leadsData.leads.map((lead) => (
                <LeadCard key={lead.leadId} lead={lead} />
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Ações Rápidas</h2>
          <div className="space-y-2">
            <Link
              href="/dashboard/comercial/leads?new=true"
              className="block w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 rounded-lg"
            >
              + Novo Lead
            </Link>
            <Link
              href="/dashboard/comercial/leads?filter=high-score"
              className="block w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 rounded-lg"
            >
              Leads Quentes
            </Link>
            <Link
              href="/dashboard/comercial/leads?filter=pending-followup"
              className="block w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 rounded-lg"
            >
              Follow-ups Pendentes
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
