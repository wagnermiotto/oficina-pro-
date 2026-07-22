import type { Metadata } from "next";
import { Suspense } from "react";
import { format } from "date-fns";
import type { StatusOS } from "@prisma/client";
import { requireOficina } from "@/shared/lib/session";
import { listarOS, listarMecanicos } from "@/modules/ordens/services/os-service";
import {
  FiltroStatusOS,
  OrdensTable,
} from "@/modules/ordens/components/ordens-table";
import { OSDialog } from "@/modules/ordens/components/os-dialog";
import { BuscaInput } from "@/shared/components/busca-input";
import { Paginacao } from "@/shared/components/paginacao";
import { Skeleton } from "@/components/ui/skeleton";
import { paraNumero } from "@/shared/utils/moeda";
import { formatarPlaca } from "@/shared/utils/placa";

export const metadata: Metadata = { title: "Ordens de Serviço" };

const STATUS_VALIDOS = new Set([
  "RECEBIDO",
  "DIAGNOSTICO",
  "AGUARDANDO_APROVACAO",
  "APROVADO",
  "EM_EXECUCAO",
  "AGUARDANDO_PECAS",
  "CONCLUIDO",
  "ENTREGUE",
  "FINALIZADO",
  "CANCELADO",
]);

interface Props {
  searchParams: Promise<{ busca?: string; pagina?: string; status?: string }>;
}

async function ListaOrdens({ searchParams }: Props) {
  const { db } = await requireOficina();
  const params = await searchParams;
  const pagina = Math.max(1, Number(params.pagina) || 1);
  const status = STATUS_VALIDOS.has(params.status ?? "")
    ? (params.status as StatusOS)
    : undefined;

  const [{ itens, total, totalPaginas }, mecanicos, clientes] = await Promise.all([
    listarOS(db, { busca: params.busca, status, pagina }),
    listarMecanicos(db),
    db.cliente.findMany({
      orderBy: { nome: "asc" },
      take: 500,
      select: {
        id: true,
        nome: true,
        veiculos: {
          where: { deletedAt: null },
          select: { id: true, placa: true, marca: true, modelo: true },
        },
      },
    }),
  ]);

  return (
    <>
      <div className="flex justify-end">
        <OSDialog
          clientes={clientes}
          mecanicos={mecanicos.map((m) => ({ userId: m.userId, nome: m.nome }))}
        />
      </div>
      <OrdensTable
        dados={itens.map((os) => ({
          id: os.id,
          numero: os.numero,
          cliente: os.cliente.nome,
          veiculo: `${[os.veiculo.marca, os.veiculo.modelo].filter(Boolean).join(" ")} · ${formatarPlaca(os.veiculo.placa)}`,
          status: os.status,
          dataEntrada: format(os.dataEntrada, "dd/MM/yyyy"),
          dataPrevista: os.dataPrevista
            ? format(os.dataPrevista, "dd/MM/yyyy")
            : null,
          total: paraNumero(os.total),
        }))}
      />
      <Paginacao pagina={pagina} totalPaginas={totalPaginas} totalRegistros={total} />
    </>
  );
}

export default function OrdensPage(props: Props) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Suspense>
          <BuscaInput placeholder="Buscar por número, cliente ou placa..." />
          <FiltroStatusOS />
        </Suspense>
      </div>
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-lg" />}>
        <ListaOrdens {...props} />
      </Suspense>
    </div>
  );
}
