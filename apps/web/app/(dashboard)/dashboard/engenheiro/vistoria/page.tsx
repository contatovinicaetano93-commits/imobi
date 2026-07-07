import type { Metadata } from "next";
import { engenheirosApi, safeArr, type Visita } from "@/lib/api";
import Link from "next/link";
import { MapPin, CalendarClock, CheckCircle2, Clock, Play, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Vistoria — IMOBI" };

const STATUS_CONFIG: Record<Visita["status"], { label: string; cls: string; icon: typeof Clock }> = {
  AGENDADA:  { label: "Agendada",  cls: "bg-blue-100 text-blue-700",   icon: Clock },
  INICIADA:  { label: "Iniciada",  cls: "bg-amber-100 text-amber-700", icon: Play },
  CONCLUIDA: { label: "Concluída", cls: "bg-green-100 text-green-700", icon: CheckCircle2 },
};

export default async function VistoriaPage() {
  const visitas = safeArr<Visita>(
    await engenheirosApi.listarVisitas().catch(() => [] as Visita[]),
  );

  const agendadas  = visitas.filter((v) => v.status === "AGENDADA");
  const iniciadas  = visitas.filter((v) => v.status === "INICIADA");
  const concluidas = visitas.filter((v) => v.status === "CONCLUIDA");

  return (
    <div className="space-y-8 max-w-4xl">
      <div style={{ background: "linear-gradient(135deg, #431407 0%, #7c2d12 100%)", borderRadius: 16, padding: "1.5rem", color: "white" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
          <div style={{ background: "#ea580c22", border: "1px solid #ea580c44", borderRadius: 8, padding: "0.4rem" }}>
            <MapPin size={18} color="#ea580c" />
          </div>
          <div>
            <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Engenheiro</p>
            <h1 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0 }}>Agenda de Vistorias</h1>
          </div>
        </div>
        <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.65)", margin: 0 }}>
          {agendadas.length} agendada(s) · {iniciadas.length} em andamento · {concluidas.length} concluída(s)
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Agendadas",  count: agendadas.length,  color: "#1d4ed8", bg: "#eff6ff" },
          { label: "Em andamento", count: iniciadas.length, color: "#d97706", bg: "#fffbeb" },
          { label: "Concluídas", count: concluidas.length, color: "#16a34a", bg: "#f0fdf4" },
        ].map(({ label, count, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center" style={{ background: bg }}>
            <p className="text-2xl font-bold tabular-nums" style={{ color }}>{count}</p>
            <p className="text-xs font-medium mt-1" style={{ color }}>{label}</p>
          </div>
        ))}
      </div>

      {[
        { title: "Em andamento", items: iniciadas, accent: "#d97706" },
        { title: "Agendadas",    items: agendadas,  accent: "#1d4ed8" },
        { title: "Concluídas",   items: concluidas, accent: "#16a34a" },
      ].map(({ title, items, accent }) => items.length > 0 && (
        <section key={title}>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <CalendarClock size={14} style={{ color: accent }} />
            {title} ({items.length})
          </h2>
          <div className="space-y-3">
            {items.map((v) => {
              const st = STATUS_CONFIG[v.status];
              const StatusIcon = st.icon;
              return (
                <Link
                  key={v.visitaId}
                  href={`/dashboard/engenheiro/${v.visitaId}` as any}
                  className="block bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${st.cls} flex items-center gap-1`}>
                          <StatusIcon size={10} />
                          {st.label}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 truncate">{v.obra.nome}</p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{v.etapaNome}</p>
                      {v.obra.endereco && (
                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                          <MapPin size={10} className="shrink-0" />
                          {v.obra.endereco}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-medium text-gray-600 tabular-nums">
                        {new Date(v.dataAgendada).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                      </p>
                      <p className="text-[10px] text-gray-400 tabular-nums">
                        {new Date(v.dataAgendada).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                      <ArrowRight size={14} className="text-gray-300 mt-2 ml-auto" />
                    </div>
                  </div>
                  {v.observacoes && (
                    <p className="text-xs text-gray-400 mt-3 pt-3 border-t border-gray-50 line-clamp-2">{v.observacoes}</p>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      ))}

      {visitas.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <MapPin className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">Nenhuma vistoria agendada</p>
          <p className="text-xs text-gray-400 mt-1">As vistorias aparecem quando forem atribuídas ao seu perfil.</p>
        </div>
      )}
    </div>
  );
}
