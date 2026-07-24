import type { StatusAssinatura } from "@prisma/client";

export const STATUS_ASSINATURA_LABEL: Record<StatusAssinatura, string> = {
  ATIVO: "Ativo",
  PENDENTE: "Pendente",
  ATRASADO: "Atrasado",
  BLOQUEADO: "Bloqueado",
  SUSPENSO: "Suspenso",
  CANCELADO: "Cancelado",
};

export const STATUS_ASSINATURA_BADGE: Record<StatusAssinatura, string> = {
  ATIVO: "bg-chart-5/15 text-chart-5 border-chart-5/30",
  PENDENTE: "bg-chart-2/15 text-chart-2 border-chart-2/30",
  ATRASADO: "bg-destaque/15 text-destaque border-destaque/30",
  BLOQUEADO: "bg-destructive/10 text-destructive border-destructive/30",
  SUSPENSO: "bg-destructive/10 text-destructive border-destructive/30",
  CANCELADO: "bg-muted text-muted-foreground border-border",
};

/** Status que o Super Admin pode aplicar manualmente. */
export const STATUS_ASSINATURA_MANUAL: StatusAssinatura[] = [
  "ATIVO",
  "PENDENTE",
  "ATRASADO",
  "BLOQUEADO",
  "SUSPENSO",
  "CANCELADO",
];
