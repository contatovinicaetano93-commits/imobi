'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface DashboardStats {
  totalLeads: number;
  leadsThisWeek: number;
  avgScore: number;
  conversionRate: number;
}

export default function ComercialDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalLeads: 0,
    leadsThisWeek: 0,
    avgScore: 0,
    conversionRate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch dashboard stats
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/comercial/dashboard/stats');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      label: 'Total de Leads',
      value: stats.totalLeads,
      color: 'bg-blue-50 text-blue-700',
    },
    {
      label: 'Esta Semana',
      value: stats.leadsThisWeek,
      color: 'bg-green-50 text-green-700',
    },
    {
      label: 'Score Médio',
      value: Math.round(stats.avgScore),
      color: 'bg-purple-50 text-purple-700',
    },
    {
      label: 'Taxa Conversão',
      value: `${Math.round(stats.conversionRate * 100)}%`,
      color: 'bg-orange-50 text-orange-700',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Comercial</h1>
        <p className="text-gray-600 mt-1">Gerenciamento de leads e conversão</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card key={card.label} className={`p-6 ${card.color}`}>
            <p className="text-sm font-medium opacity-75">{card.label}</p>
            <p className="text-3xl font-bold mt-2">{loading ? '-' : card.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Leads Recentes</h2>
            <Link href="/dashboard/comercial/leads">
              <Button variant="outline" size="sm">
                Ver Todos
              </Button>
            </Link>
          </div>
          <p className="text-gray-500 text-center py-12">
            Carregando leads mais recentes...
          </p>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Ações Rápidas</h2>
          <div className="space-y-2">
            <Link href="/dashboard/comercial/leads?new=true">
              <Button className="w-full justify-start" variant="ghost">
                + Novo Lead
              </Button>
            </Link>
            <Link href="/dashboard/comercial/leads?filter=high-score">
              <Button className="w-full justify-start" variant="ghost">
                Leads Quentes
              </Button>
            </Link>
            <Link href="/dashboard/comercial/leads?filter=pending-followup">
              <Button className="w-full justify-start" variant="ghost">
                Follow-ups Pendentes
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
