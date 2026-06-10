"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, List, Calendar } from "lucide-react";
import type { Visita } from "@/lib/api";

interface VisitQueueProps {
  visits: Visita[];
  onSelectVisit: (visitaId: string) => void;
}

export function VisitQueue({ visits, onSelectVisit }: VisitQueueProps) {
  const [viewMode, setViewMode] = useState<"calendar" | "list">("list");
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  const visitsByMonth = useMemo(() => {
    const grouped: Record<string, Visita[]> = {};
    visits.forEach((v) => {
      const date = new Date(v.dataAgendada);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(v);
    });
    return grouped;
  }, [visits]);

  const currentMonthKey = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, "0")}`;
  const monthVisits = visitsByMonth[currentMonthKey] || [];

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const handlePrevMonth = () => {
    setSelectedMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1));
  };

  const getVisitsForDay = (day: number) => {
    return monthVisits.filter((v) => new Date(v.dataAgendada).getDate() === day);
  };

  const monthName = selectedMonth.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  if (viewMode === "calendar") {
    const daysInMonth = getDaysInMonth(selectedMonth);
    const firstDay = getFirstDayOfMonth(selectedMonth);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Calendário de Visitas</h3>
          <button
            onClick={() => setViewMode("list")}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-sm"
          >
            <List className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={handlePrevMonth} className="p-1 hover:bg-gray-100 rounded">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h4 className="text-base font-semibold text-gray-900 capitalize">{monthName}</h4>
          <button onClick={handleNextMonth} className="p-1 hover:bg-gray-100 rounded">
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Weekdays Header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"].map((day) => (
            <div key={day} className="text-center text-xs font-semibold text-gray-600 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, i) => {
            const dayVisits = day ? getVisitsForDay(day) : [];
            return (
              <div
                key={i}
                className={`aspect-square rounded-lg border flex flex-col items-center justify-center text-xs font-semibold cursor-pointer transition-all ${
                  day
                    ? dayVisits.length > 0
                      ? "bg-blue-50 border-blue-200 text-gray-900 hover:bg-blue-100"
                      : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                    : "bg-white border-transparent"
                }`}
              >
                {day && (
                  <>
                    <span>{day}</span>
                    {dayVisits.length > 0 && (
                      <span className="text-xs mt-0.5 bg-[#1B4FD8] text-white px-1 rounded">
                        {dayVisits.length}
                      </span>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Day Details */}
        {monthVisits.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Visitas este mês</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {monthVisits.map((visit) => (
                <button
                  key={visit.visitaId}
                  onClick={() => onSelectVisit(visit.visitaId)}
                  className="w-full text-left p-2 rounded-lg bg-gray-50 hover:bg-blue-50 transition-colors text-xs sm:text-sm"
                >
                  <div className="font-semibold text-gray-900">{visit.obra.nome}</div>
                  <div className="text-gray-600">
                    {new Date(visit.dataAgendada).toLocaleDateString("pt-BR")}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Lista de Visitas</h3>
        <button
          onClick={() => setViewMode("calendar")}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-sm"
        >
          <Calendar className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      <div className="space-y-3">
        {visits.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 text-sm">Nenhuma visita agendada</p>
          </div>
        ) : (
          visits.map((visit) => (
            <button
              key={visit.visitaId}
              onClick={() => onSelectVisit(visit.visitaId)}
              className="w-full text-left p-4 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{visit.obra.nome}</h4>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">{visit.obra.endereco}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(visit.dataAgendada).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      visit.status === "AGENDADA"
                        ? "bg-blue-100 text-blue-700"
                        : visit.status === "INICIADA"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-green-100 text-green-700"
                    }`}
                  >
                    {visit.status === "AGENDADA"
                      ? "Agendada"
                      : visit.status === "INICIADA"
                        ? "Iniciada"
                        : "Concluída"}
                  </span>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
