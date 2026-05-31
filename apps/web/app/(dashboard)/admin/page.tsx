"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardContent } from "@/components/card";
import { StatsCard, StatsGrid } from "@/components/stats-card";
import { Button } from "@/components/button";
import { Alert } from "@/components/alert";

interface ServiceStatus {
  name: string;
  status: "online" | "offline" | "degraded";
}

interface ActivityLog {
  id: string;
  type: "success" | "warning" | "error";
  title: string;
  description: string;
  timestamp: string;
}

export default function AdminDashboard() {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Mock data - would fetch from /api/v1/admin/health
        const mockServices: ServiceStatus[] = [
          { name: "API NestJS", status: "online" },
          { name: "PostgreSQL", status: "online" },
          { name: "Redis", status: "online" },
        ];

        const mockActivities: ActivityLog[] = [
          {
            id: "1",
            type: "success",
            title: "Obra geovalidada",
            description: "Residencial Park Avenue",
            timestamp: "5 minutos atrás",
          },
          {
            id: "2",
            type: "success",
            title: "Parcela liberada",
            description: "R$ 890.000",
            timestamp: "12 minutos atrás",
          },
          {
            id: "3",
            type: "warning",
            title: "Erro no envio KYC",
            description: "João Silva",
            timestamp: "28 minutos atrás",
          },
        ];

        setServices(mockServices);
        setActivities(mockActivities);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">Painel Administrativo</h1>

      <StatsGrid>
        <StatsCard
          label="Usuários Ativos"
          value="1.240"
          trend={{ direction: "up", value: 12 }}
        />
        <StatsCard
          label="Operações Hoje"
          value="342"
          trend={{ direction: "up", value: 8 }}
        />
        <StatsCard
          label="Volume Processado"
          value="R$ 24.5M"
          trend={{ direction: "up", value: 15 }}
        />
        <StatsCard
          label="Taxa de Erro"
          value="0.02%"
          trend={{ direction: "down", value: 3 }}
        />
      </StatsGrid>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">Atividades Recentes</h2>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <p className="text-gray-500 text-sm">Nenhuma atividade registrada</p>
            ) : (
              <div className="space-y-3">
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="p-3 bg-gray-50 rounded-lg border border-gray-100"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                          activity.type === "success"
                            ? "bg-green-500"
                            : activity.type === "warning"
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm">
                          {activity.title}
                        </p>
                        <p className="text-gray-600 text-xs mt-0.5">
                          {activity.description}
                        </p>
                        <p className="text-gray-400 text-xs mt-1">
                          {activity.timestamp}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">Ações Rápidas</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button variant="primary" className="w-full">
                Gerenciar Usuários
              </Button>
              <Button variant="secondary" className="w-full">
                Relatórios & Analytics
              </Button>
              <Button variant="ghost" className="w-full">
                Configurações do Sistema
              </Button>
              <Button variant="ghost" className="w-full">
                Logs & Auditoria
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Status dos Serviços</h2>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {services.map((service) => (
              <div
                key={service.name}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100"
              >
                <span className="text-gray-700 font-medium text-sm">
                  {service.name}
                </span>
                <span className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      service.status === "online"
                        ? "bg-green-500"
                        : service.status === "degraded"
                        ? "bg-yellow-500"
                        : "bg-red-500"
                    }`}
                  />
                  <span
                    className={`text-xs font-medium ${
                      service.status === "online"
                        ? "text-green-700"
                        : service.status === "degraded"
                        ? "text-yellow-700"
                        : "text-red-700"
                    }`}
                  >
                    {service.status === "online"
                      ? "Online"
                      : service.status === "degraded"
                      ? "Degradado"
                      : "Offline"}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
