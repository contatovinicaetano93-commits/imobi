import type { Metadata } from "next";
import { engenheiroObraApi, type Licenca } from "@/lib/api";
import { FileCheck2, ShieldCheck, AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Checklist — IMOBI" };

const STATUS_CONFIG: Record<Licenca["status"], { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  VALIDA:   { label: "Válida",   cls: "bg-green-100 text-green-700",  icon: CheckCircle2 },
  VENCENDO: { label: "Vencendo", cls: "bg-amber-100 text-amber-700",  icon: AlertTriangle },
  PENDENTE: { label: "Pendente", cls: "bg-gray-100 text-gray-600",    icon: Clock },
  VENCIDA:  { label: "Vencida",  cls: "bg-red-100 text-red-700",      icon: XCircle },
};

export default async function ChecklistPage() {
  const licencas = await engenheiroObraApi.licencas().catch(() => [] as Licenca[]);

  const construcao    = licencas.filter((l) => l.categoria === "CONSTRUCAO");
  const operacionais  = licencas.filter((l) => l.categoria === "OPERACIONAL");
  const atencao       = licencas.filter((l) => l.status === "VENCENDO" || l.status === "VENCIDA");

  const totalValidas  = licencas.filter((l) => l.status === "VALIDA").length;
  const totalPendentes = licencas.filter((l) => l.status === "PENDENTE").length;

  return (
    <div className="space-y-8 max-w-4xl">
      <div style={{ background: "linear-gradient(135deg, #431407 0%, #7c2d12 100%)", borderRadius: 16, padding: "1.5rem", color: "white" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
          <div style={{ background: "#ea580c22", border: "1px solid #ea580c44", borderRadius: 8, padding: "0.4rem" }}>
            <FileCheck2 size={18} color="#ea580c" />
          </div>
          <div>
            <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Engenheiro</p>
            <h1 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0 }}>Checklist Documental</h1>
          </div>
        </div>
        <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.65)", margin: 0 }}>
          ART, alvarás, licenças e regularização das obras sob sua responsabilidade
        </p>
      </div>

      {atencao.length > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">{atencao.length} item(ns) exigindo atenção</p>
            <p className="text-xs text-amber-600 mt-0.5">Licenças vencidas ou prestes a vencer precisam de renovação imediata.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total",      count: licencas.length,   color: "#6b7280", bg: "#f9fafb" },
          { label: "Válidas",    count: totalValidas,       color: "#16a34a", bg: "#f0fdf4" },
          { label: "Pendentes",  count: totalPendentes,     color: "#6b7280", bg: "#f9fafb" },
          { label: "Atenção",    count: atencao.length,     color: "#d97706", bg: "#fffbeb" },
        ].map(({ label, count, color, bg }) => (
          <div key={label} className="rounded-2xl border border-gray-100 p-4 text-center" style={{ background: bg }}>
            <p className="text-2xl font-bold tabular-nums" style={{ color }}>{count}</p>
            <p className="text-xs font-medium mt-1" style={{ color }}>{label}</p>
          </div>
        ))}
      </div>

      {[
        { title: "Licenças de Construção", icon: FileCheck2, items: construcao, color: "#ea580c" },
        { title: "Licenças Operacionais",  icon: ShieldCheck, items: operacionais, color: "#1d4ed8" },
      ].map(({ title, icon: Icon, items, color }) => (
        <section key={title}>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Icon size={14} style={{ color }} />
            {title} ({items.length})
          </h2>
          {items.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
              <p className="text-sm text-gray-400">Nenhuma licença nesta categoria</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="divide-y divide-gray-50">
                {items.map((lic) => {
                  const st = STATUS_CONFIG[lic.status];
                  const StatusIcon = st.icon;
                  return (
                    <div key={lic.id} className="flex items-center gap-3 px-5 py-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{lic.nome}</p>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">
                          {lic.orgao}
                          {lic.numero ? ` · Nº ${lic.numero}` : ""}
                          {lic.obraNome ? ` · ${lic.obraNome}` : ""}
                        </p>
                      </div>
                      {lic.validade && (
                        <p className="hidden sm:block text-xs text-gray-400 tabular-nums shrink-0">
                          Validade: {new Date(lic.validade).toLocaleDateString("pt-BR")}
                        </p>
                      )}
                      <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${st.cls}`}>
                        <StatusIcon size={10} />
                        {st.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      ))}

      {licencas.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <FileCheck2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">Nenhuma licença registrada</p>
          <p className="text-xs text-gray-400 mt-1">As licenças aparecem quando obras forem vinculadas ao seu perfil.</p>
        </div>
      )}
    </div>
  );
}
