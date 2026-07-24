import "server-only";
import { startOfDay } from "date-fns";
import type { TenantDb } from "@/shared/lib/tenant-db";
import type { InteracaoInput } from "../schemas/crm-schemas";

/** Meses após a última OS entregue para sugerir uma revisão. */
const MESES_REVISAO = 6;

export interface LembreteAutomatico {
  tipo: "aniversario" | "revisao";
  clienteId: string;
  cliente: string;
  contato: string | null;
  detalhe: string;
  quando: Date;
}

/**
 * Lembretes gerados por regra (sem cadastro manual): aniversários dos próximos
 * 7 dias e clientes com a última OS entregue há ~6 meses (revisão sugerida).
 */
export async function lembretesAutomaticos(
  db: TenantDb
): Promise<LembreteAutomatico[]> {
  const hoje = startOfDay(new Date());
  // Janela de revisão: última OS entregue entre 6 e 18 meses atrás (cliente
  // "sumido" há tempo suficiente para lembrar, mas ainda recente para reativar).
  const agora = new Date();
  const fimRevisao = new Date(agora);
  fimRevisao.setMonth(fimRevisao.getMonth() - MESES_REVISAO);
  const inicioRevisao = new Date(agora);
  inicioRevisao.setMonth(inicioRevisao.getMonth() - 18);

  const [clientes, ordens] = await Promise.all([
    db.cliente.findMany({
      where: { dataNascimento: { not: null } },
      select: {
        id: true,
        nome: true,
        telefone: true,
        whatsapp: true,
        dataNascimento: true,
      },
    }),
    // Última OS entregue por cliente, dentro da janela de revisão.
    db.ordemServico.findMany({
      where: {
        status: { in: ["ENTREGUE", "FINALIZADO"] },
        dataConclusao: { gte: inicioRevisao, lte: fimRevisao },
      },
      orderBy: { dataConclusao: "desc" },
      select: {
        id: true,
        numero: true,
        dataConclusao: true,
        cliente: {
          select: { id: true, nome: true, telefone: true, whatsapp: true },
        },
        veiculo: { select: { placa: true, modelo: true } },
      },
    }),
  ]);

  const lembretes: LembreteAutomatico[] = [];

  // Aniversários: mês/dia dentro dos próximos 7 dias.
  for (const c of clientes) {
    if (!c.dataNascimento) continue;
    const nasc = c.dataNascimento;
    const proximo = new Date(hoje.getFullYear(), nasc.getMonth(), nasc.getDate());
    if (proximo < hoje) proximo.setFullYear(hoje.getFullYear() + 1);
    const dias = Math.round((proximo.getTime() - hoje.getTime()) / 86_400_000);
    if (dias <= 7) {
      lembretes.push({
        tipo: "aniversario",
        clienteId: c.id,
        cliente: c.nome,
        contato: c.whatsapp ?? c.telefone,
        detalhe:
          dias === 0
            ? "Faz aniversário hoje 🎂"
            : `Faz aniversário em ${dias} dia${dias === 1 ? "" : "s"} 🎂`,
        quando: proximo,
      });
    }
  }

  // Revisão: uma sugestão por cliente (a OS mais recente já vem ordenada desc).
  const jaSugerido = new Set<string>();
  for (const os of ordens) {
    if (jaSugerido.has(os.cliente.id)) continue;
    jaSugerido.add(os.cliente.id);
    lembretes.push({
      tipo: "revisao",
      clienteId: os.cliente.id,
      cliente: os.cliente.nome,
      contato: os.cliente.whatsapp ?? os.cliente.telefone,
      detalhe: `Revisão sugerida — última OS #${String(os.numero).padStart(4, "0")} (${os.veiculo.modelo ?? "veículo"} ${os.veiculo.placa}) há ~${MESES_REVISAO} meses`,
      quando: os.dataConclusao ?? hoje,
    });
  }

  return lembretes.sort((a, b) => a.quando.getTime() - b.quando.getTime());
}

export async function listarLembretes(db: TenantDb) {
  return db.interacao.findMany({
    where: { proximoContato: { not: null } },
    orderBy: { proximoContato: "asc" },
    take: 100,
    include: {
      cliente: {
        select: { id: true, nome: true, telefone: true, whatsapp: true },
      },
    },
  });
}

export async function listarHistorico(db: TenantDb) {
  return db.interacao.findMany({
    orderBy: { dataContato: "desc" },
    take: 100,
    include: { cliente: { select: { id: true, nome: true } } },
  });
}

export async function criarInteracao(
  db: TenantDb,
  oficinaId: string,
  usuarioId: string,
  dados: InteracaoInput
) {
  return db.interacao.create({
    data: {
      oficinaId,
      clienteId: dados.clienteId,
      tipo: dados.tipo,
      mensagem: dados.mensagem,
      proximoContato: dados.proximoContato ?? null,
      usuarioId,
    },
  });
}

/** Marca o lembrete como tratado (remove o próximo contato). */
export async function concluirLembrete(db: TenantDb, id: string) {
  const interacao = await db.interacao.findUnique({ where: { id } });
  if (!interacao) throw new Error("Lembrete não encontrado.");
  return db.interacao.update({
    where: { id },
    data: { proximoContato: null },
  });
}

export async function listarGarantias(db: TenantDb) {
  const hoje = startOfDay(new Date());
  const garantias = await db.garantia.findMany({
    orderBy: { validadeAte: "asc" },
    take: 200,
    include: {
      ordemServico: {
        select: {
          id: true,
          numero: true,
          cliente: { select: { nome: true } },
          veiculo: { select: { placa: true, modelo: true } },
        },
      },
    },
  });
  return garantias.map((garantia) => ({
    ...garantia,
    vigente: garantia.validadeAte >= hoje,
    diasRestantes: Math.ceil(
      (garantia.validadeAte.getTime() - hoje.getTime()) / 86_400_000
    ),
  }));
}
