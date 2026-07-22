import type { Metadata } from "next";
import { Suspense } from "react";
import { format, isBefore, startOfDay } from "date-fns";
import { requireOficina } from "@/shared/lib/session";
import {
  listarGarantias,
  listarHistorico,
  listarLembretes,
} from "@/modules/crm/services/crm-service";
import { CRMConteudo } from "@/modules/crm/components/crm-conteudo";
import { formatarPlaca } from "@/shared/utils/placa";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "CRM" };

async function ConteudoCRM() {
  const { db } = await requireOficina();
  const hoje = startOfDay(new Date());

  const [lembretes, historico, garantias, clientes] = await Promise.all([
    listarLembretes(db),
    listarHistorico(db),
    listarGarantias(db),
    db.cliente.findMany({
      orderBy: { nome: "asc" },
      take: 500,
      select: { id: true, nome: true },
    }),
  ]);

  return (
    <CRMConteudo
      lembretes={lembretes.map((lembrete) => ({
        id: lembrete.id,
        cliente: lembrete.cliente.nome,
        clienteId: lembrete.cliente.id,
        contato: lembrete.cliente.whatsapp ?? lembrete.cliente.telefone,
        mensagem: lembrete.mensagem,
        tipo: lembrete.tipo,
        quando: format(lembrete.proximoContato!, "dd/MM/yyyy"),
        atrasado: isBefore(lembrete.proximoContato!, hoje),
      }))}
      historico={historico.map((interacao) => ({
        id: interacao.id,
        cliente: interacao.cliente.nome,
        clienteId: interacao.cliente.id,
        tipo: interacao.tipo,
        mensagem: interacao.mensagem,
        data: format(interacao.dataContato, "dd/MM/yyyy HH:mm"),
      }))}
      garantias={garantias.map((garantia) => ({
        id: garantia.id,
        descricao: garantia.descricao,
        cliente: garantia.ordemServico.cliente.nome,
        veiculo: `${garantia.ordemServico.veiculo.modelo ?? ""} ${formatarPlaca(garantia.ordemServico.veiculo.placa)}`.trim(),
        osId: garantia.ordemServico.id,
        osNumero: garantia.ordemServico.numero,
        validadeAte: format(garantia.validadeAte, "dd/MM/yyyy"),
        vigente: garantia.vigente,
        diasRestantes: garantia.diasRestantes,
      }))}
      clientes={clientes}
    />
  );
}

export default function CRMPage() {
  return (
    <div className="space-y-4">
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-lg" />}>
        <ConteudoCRM />
      </Suspense>
    </div>
  );
}
