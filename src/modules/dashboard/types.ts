import type { StatusOS } from "@prisma/client";

export interface ResumoDashboard {
  veiculosNaOficina: number;
  ordensAbertas: number;
  aguardandoAprovacao: number;
  aguardandoPecas: number;
  receitaDia: number;
  receitaMes: number;
  despesaMes: number;
  lucroMes: number;
  ticketMedioMes: number;
  estoqueBaixo: number;
  agendamentosHoje: AgendamentoDia[];
  osPorStatus: { status: StatusOS; quantidade: number }[];
  fluxoDiario: PontoFluxo[];
  osRecentes: OSResumida[];
}

export interface AgendamentoDia {
  id: string;
  titulo: string;
  horario: string;
  tipo: string;
  cliente: string | null;
}

export interface PontoFluxo {
  dia: string;
  receitas: number;
  despesas: number;
}

export interface OSResumida {
  id: string;
  numero: number;
  cliente: string;
  veiculo: string;
  status: StatusOS;
  total: number;
  dataEntrada: string;
}
