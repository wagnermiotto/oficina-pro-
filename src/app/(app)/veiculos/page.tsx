import type { Metadata } from "next";
import { Suspense } from "react";
import { requireOficina } from "@/shared/lib/session";
import {
  listarVeiculos,
  listarClientesParaSelecao,
} from "@/modules/veiculos/services/veiculos-service";
import { VeiculosTable } from "@/modules/veiculos/components/veiculos-table";
import { VeiculoDialog } from "@/modules/veiculos/components/veiculo-dialog";
import { BuscaInput } from "@/shared/components/busca-input";
import { Paginacao } from "@/shared/components/paginacao";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Veículos" };

interface Props {
  searchParams: Promise<{ busca?: string; pagina?: string }>;
}

async function ListaVeiculos({ searchParams }: Props) {
  const { db } = await requireOficina();
  const params = await searchParams;
  const pagina = Math.max(1, Number(params.pagina) || 1);
  const [{ itens, total, totalPaginas }, clientes] = await Promise.all([
    listarVeiculos(db, { busca: params.busca, pagina }),
    listarClientesParaSelecao(db),
  ]);

  return (
    <>
      <div className="flex justify-end">
        <VeiculoDialog clientes={clientes.map((c) => ({ id: c.id, nome: c.nome }))} />
      </div>
      <VeiculosTable
        dados={itens.map((v) => ({
          id: v.id,
          tipo: v.tipo,
          placa: v.placa,
          marca: v.marca,
          modelo: v.modelo,
          ano: v.ano,
          cor: v.cor,
          quilometragem: v.quilometragem,
          clienteId: v.cliente.id,
          clienteNome: v.cliente.nome,
          ordens: v._count.ordens,
          checkIns: v._count.checkIns,
        }))}
      />
      <Paginacao pagina={pagina} totalPaginas={totalPaginas} totalRegistros={total} />
    </>
  );
}

export default function VeiculosPage(props: Props) {
  return (
    <div className="space-y-4">
      <Suspense>
        <BuscaInput placeholder="Buscar por placa, marca, modelo ou cliente..." />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-lg" />}>
        <ListaVeiculos {...props} />
      </Suspense>
    </div>
  );
}
