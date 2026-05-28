"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AlertCircle, Plus, Trash2, Edit2, TestTube, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Webhook {
  webhookId: string;
  url: string;
  eventos: string[];
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

interface WebhookLog {
  logId: string;
  evento: string;
  status: number | null;
  resposta: string | null;
  timestamp: string;
  tentativas: number;
}

const WEBHOOK_EVENTS = [
  { value: "user.signup", label: "Novo Usuário Registrado" },
  { value: "user.kyc.approved", label: "KYC Aprovado" },
  { value: "user.kyc.rejected", label: "KYC Rejeitado" },
  { value: "credit.approved", label: "Crédito Aprovado" },
  { value: "credit.rejected", label: "Crédito Rejeitado" },
  { value: "work.completed", label: "Obra Concluída" },
  { value: "stage.approved", label: "Etapa Aprovada" },
  { value: "stage.rejected", label: "Etapa Rejeitada" },
  { value: "payment.released", label: "Parcela Liberada" },
];

export default function WebhooksPage() {
  const { toast } = useToast();
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [showLogsDialog, setShowLogsDialog] = useState(false);

  const [formData, setFormData] = useState({
    url: "",
    eventos: [] as string[],
  });

  useEffect(() => {
    loadWebhooks();
  }, []);

  async function loadWebhooks() {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/admin/webhooks");
      if (!res.ok) throw new Error("Falha ao carregar webhooks");
      const data = await res.json();
      setWebhooks(data);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar os webhooks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.url || formData.eventos.length === 0) {
      toast({
        title: "Validação",
        description: "Preencha a URL e selecione pelo menos um evento",
        variant: "destructive",
      });
      return;
    }

    try {
      setCreating(true);

      if (editingId) {
        // Update
        const res = await fetch(`/api/v1/admin/webhooks/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (!res.ok) throw new Error("Falha ao atualizar webhook");
        toast({ title: "Sucesso", description: "Webhook atualizado" });
      } else {
        // Create
        const res = await fetch("/api/v1/admin/webhooks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (!res.ok) throw new Error("Falha ao criar webhook");
        const data = await res.json();
        toast({
          title: "Sucesso",
          description: `Webhook criado. Secret: ${data.secret}`,
        });
      }

      setFormData({ url: "", eventos: [] });
      setEditingId(null);
      await loadWebhooks();
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(webhookId: string) {
    if (!confirm("Tem certeza?")) return;

    try {
      const res = await fetch(`/api/v1/admin/webhooks/${webhookId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Falha ao deletar webhook");
      toast({ title: "Sucesso", description: "Webhook deletado" });
      await loadWebhooks();
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  }

  async function handleTest(webhookId: string) {
    try {
      const res = await fetch(`/api/v1/admin/webhooks/${webhookId}/test`, {
        method: "POST",
      });

      if (!res.ok) throw new Error("Falha ao testar webhook");
      const data = await res.json();

      if (data.sucesso) {
        toast({
          title: "Sucesso",
          description: `Webhook respondeu com status ${data.status}`,
        });
      } else {
        toast({
          title: "Falha",
          description: data.erro || "Falha ao testar webhook",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  }

  async function loadLogs(webhookId: string) {
    try {
      const res = await fetch(`/api/v1/admin/webhooks/${webhookId}/logs`);
      if (!res.ok) throw new Error("Falha ao carregar logs");
      const data = await res.json();
      setLogs(data.logs);

      const webhook = webhooks.find((w) => w.webhookId === webhookId);
      setSelectedWebhook(webhook || null);
      setShowLogsDialog(true);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar os logs",
        variant: "destructive",
      });
    }
  }

  function handleEdit(webhook: Webhook) {
    setFormData({
      url: webhook.url,
      eventos: webhook.eventos,
    });
    setEditingId(webhook.webhookId);
  }

  function toggleEvent(event: string) {
    setFormData((prev) => ({
      ...prev,
      eventos: prev.eventos.includes(event)
        ? prev.eventos.filter((e) => e !== event)
        : [...prev.eventos, event],
    }));
  }

  if (loading) {
    return <div className="p-8">Carregando...</div>;
  }

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold">Webhooks</h1>
        <p className="text-gray-600 mt-2">Gerencie integrações externas com webhooks</p>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Editar Webhook" : "Novo Webhook"}</CardTitle>
          <CardDescription>
            Configure uma URL para receber eventos em tempo real
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">URL</label>
              <Input
                type="url"
                placeholder="https://exemplo.com/webhooks"
                value={formData.url}
                onChange={(e) => setFormData((prev) => ({ ...prev, url: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-4">Eventos</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {WEBHOOK_EVENTS.map((event) => (
                  <label key={event.value} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.eventos.includes(event.value)}
                      onChange={() => toggleEvent(event.value)}
                      className="rounded"
                    />
                    <span className="text-sm">{event.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={creating}>
                {editingId ? "Atualizar" : "Criar"}
              </Button>
              {editingId && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setFormData({ url: "", eventos: [] });
                    setEditingId(null);
                  }}
                >
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle>Webhooks Registrados</CardTitle>
          <CardDescription>{webhooks.length} webhook(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {webhooks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nenhum webhook registrado. Crie um novo acima.
            </div>
          ) : (
            <div className="space-y-4">
              {webhooks.map((webhook) => (
                <div
                  key={webhook.webhookId}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                          {webhook.url}
                        </code>
                        <Badge variant={webhook.ativo ? "default" : "secondary"}>
                          {webhook.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {webhook.eventos.map((event) => (
                          <Badge key={event} variant="outline" className="text-xs">
                            {event}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(webhook.criadoEm).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(webhook)}
                    >
                      <Edit2 className="w-4 h-4 mr-1" /> Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTest(webhook.webhookId)}
                    >
                      <TestTube className="w-4 h-4 mr-1" /> Testar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => loadLogs(webhook.webhookId)}
                    >
                      <Eye className="w-4 h-4 mr-1" /> Logs
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(webhook.webhookId)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" /> Deletar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logs Dialog */}
      <Dialog open={showLogsDialog} onOpenChange={setShowLogsDialog}>
        <DialogContent className="max-w-2xl max-h-96 overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Logs do Webhook</DialogTitle>
            <DialogDescription>{selectedWebhook?.url}</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {logs.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Nenhum log disponível</p>
            ) : (
              logs.map((log) => (
                <div
                  key={log.logId}
                  className="border rounded p-3 text-sm space-y-1 bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{log.evento}</span>
                    <Badge
                      variant={
                        log.status && log.status >= 200 && log.status < 300
                          ? "default"
                          : "destructive"
                      }
                    >
                      {log.status || "Pendente"}
                    </Badge>
                  </div>
                  <p className="text-gray-600">
                    {new Date(log.timestamp).toLocaleString("pt-BR")}
                  </p>
                  {log.resposta && (
                    <pre className="bg-white p-2 rounded text-xs overflow-auto max-h-20">
                      {log.resposta}
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
