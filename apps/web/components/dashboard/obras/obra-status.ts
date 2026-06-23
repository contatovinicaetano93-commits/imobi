export const STATUS_LABEL: Record<string, string> = {
  EM_EXECUCAO: "Em andamento",
  EM_ANDAMENTO: "Em andamento",
  PLANEJAMENTO: "Planejamento",
  CONCLUIDA: "Concluída",
  PAUSADA: "Pausada",
  CANCELADA: "Cancelada",
};

export const STATUS_BADGE: Record<string, string> = {
  EM_EXECUCAO: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  EM_ANDAMENTO: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  PLANEJAMENTO: "bg-gray-100 text-gray-600 ring-1 ring-gray-200",
  CONCLUIDA: "bg-green-50 text-green-700 ring-1 ring-green-200",
  PAUSADA: "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200",
  CANCELADA: "bg-red-50 text-red-600 ring-1 ring-red-200",
};

export const STATUS_PROGRESS_COLOR: Record<string, string> = {
  EM_EXECUCAO: "bg-[#1B4FD8]",
  EM_ANDAMENTO: "bg-[#1B4FD8]",
  PLANEJAMENTO: "bg-gray-400",
  CONCLUIDA: "bg-[#16a34a]",
  PAUSADA: "bg-yellow-400",
  CANCELADA: "bg-red-400",
};

export const OBRA_STATUS_OPTIONS = [
  { value: "todas", label: "Todos os status" },
  { value: "PLANEJAMENTO", label: "Planejamento" },
  { value: "EM_EXECUCAO", label: "Em andamento" },
  { value: "PAUSADA", label: "Pausada" },
  { value: "CONCLUIDA", label: "Concluída" },
  { value: "CANCELADA", label: "Cancelada" },
] as const;
