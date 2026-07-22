import type { StatusOS } from "@prisma/client";

export const STATUS_OS_LABEL: Record<StatusOS, string> = {
  RECEBIDO: "Recebido",
  DIAGNOSTICO: "Em diagnóstico",
  AGUARDANDO_APROVACAO: "Aguardando aprovação",
  APROVADO: "Aprovado",
  EM_EXECUCAO: "Em execução",
  AGUARDANDO_PECAS: "Aguardando peças",
  CONCLUIDO: "Concluído",
  ENTREGUE: "Entregue",
  FINALIZADO: "Finalizado",
  CANCELADO: "Cancelado",
};

/** Ordem canônica do fluxo (para kanban, filtros e gráficos). */
export const FLUXO_STATUS_OS: StatusOS[] = [
  "RECEBIDO",
  "DIAGNOSTICO",
  "AGUARDANDO_APROVACAO",
  "APROVADO",
  "EM_EXECUCAO",
  "AGUARDANDO_PECAS",
  "CONCLUIDO",
  "ENTREGUE",
  "FINALIZADO",
];

/** Status em que o veículo ainda está fisicamente na oficina. */
export const STATUS_OS_ATIVOS: StatusOS[] = [
  "RECEBIDO",
  "DIAGNOSTICO",
  "AGUARDANDO_APROVACAO",
  "APROVADO",
  "EM_EXECUCAO",
  "AGUARDANDO_PECAS",
  "CONCLUIDO",
];

/** Classe de cor do badge por status (tokens do tema). */
export const STATUS_OS_BADGE: Record<StatusOS, string> = {
  RECEBIDO: "bg-secondary text-secondary-foreground",
  DIAGNOSTICO: "bg-chart-3/15 text-chart-3 border-chart-3/30",
  AGUARDANDO_APROVACAO: "bg-destaque/15 text-destaque border-destaque/30",
  APROVADO: "bg-chart-2/15 text-chart-2 border-chart-2/30",
  EM_EXECUCAO: "bg-chart-2/15 text-chart-2 border-chart-2/30",
  AGUARDANDO_PECAS: "bg-destaque/15 text-destaque border-destaque/30",
  CONCLUIDO: "bg-chart-5/15 text-chart-5 border-chart-5/30",
  ENTREGUE: "bg-chart-5/15 text-chart-5 border-chart-5/30",
  FINALIZADO: "bg-muted text-muted-foreground",
  CANCELADO: "bg-destructive/10 text-destructive border-destructive/30",
};
