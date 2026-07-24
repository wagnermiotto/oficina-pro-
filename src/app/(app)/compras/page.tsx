import type { Metadata } from "next";
import { Suspense } from "react";
import { format } from "date-fns";
import { requireOficina } from "@/shared/lib/session";
import {
  listarFornecedores,
  listarPedidos,
  sugerirPedidos,
} from "@/modules/compras/services/compras-service";
import { PedidosTable } from "@/modules/compras/components/pedidos-table";
import { PedidoDialog } from "@/modules/compras/components/pedido-dialog";
import { SugestaoPedidoButton } from "@/modules/compras/components/sugestao-pedido-button";
import { FornecedoresSection } from "@/modules/compras/components/fornecedores-section";
import { Paginacao } from "@/shared/components/paginacao";
import { paraNumero } from "@/shared/utils/moeda";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export const metadata: Metadata = { title: "Compras" };

interface Props {
  searchParams: Promise<{ pagina?: string }>;
}

async function ConteudoCompras({ searchParams }: Props) {
  const { db } = await requireOficina();
  const params = await searchParams;
  const pagina = Math.max(1, Number(params.pagina) || 1);

  const [pedidos, fornecedores, pecas, sugestoes] = await Promise.all([
    listarPedidos(db, { pagina }),
    listarFornecedores(db),
    db.peca.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, precoCusto: true },
    }),
    sugerirPedidos(db),
  ]);

  const fornecedoresOpcao = fornecedores.map((f) => ({ id: f.id, nome: f.nome }));
  const pecasOpcao = pecas.map((p) => ({
    id: p.id,
    nome: p.nome,
    precoCusto: paraNumero(p.precoCusto),
  }));

  return (
    <Tabs defaultValue="pedidos">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabsList>
          <TabsTrigger value="pedidos">Pedidos de compra</TabsTrigger>
          <TabsTrigger value="fornecedores">Fornecedores</TabsTrigger>
        </TabsList>
        <div className="flex gap-2">
          <SugestaoPedidoButton
            sugestoes={sugestoes}
            fornecedores={fornecedoresOpcao}
            pecas={pecasOpcao}
          />
          <PedidoDialog fornecedores={fornecedoresOpcao} pecas={pecasOpcao} />
        </div>
      </div>

      <TabsContent value="pedidos" className="space-y-4 pt-3">
        <PedidosTable
          dados={pedidos.itens.map((pedido) => ({
            id: pedido.id,
            numero: pedido.numero,
            fornecedor: pedido.fornecedor?.nome ?? null,
            status: pedido.status,
            total: paraNumero(pedido.total),
            criadoEm: format(pedido.createdAt, "dd/MM/yyyy"),
            itens: pedido.itens.length,
            notaFiscal: pedido.notaFiscal,
          }))}
        />
        <Paginacao
          pagina={pagina}
          totalPaginas={pedidos.totalPaginas}
          totalRegistros={pedidos.total}
        />
      </TabsContent>

      <TabsContent value="fornecedores" className="pt-3">
        <FornecedoresSection
          dados={fornecedores.map((f) => ({
            id: f.id,
            nome: f.nome,
            cnpj: f.cnpj,
            telefone: f.telefone,
            email: f.email,
            pedidos: f._count.pedidosCompra,
            pecas: f._count.pecas,
          }))}
        />
      </TabsContent>
    </Tabs>
  );
}

export default function ComprasPage(props: Props) {
  return (
    <div className="space-y-6">
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-lg" />}>
        <ConteudoCompras {...props} />
      </Suspense>
    </div>
  );
}
