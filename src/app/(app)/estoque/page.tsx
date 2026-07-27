import type { Metadata } from "next";
import { Suspense } from "react";
import { format } from "date-fns";
import Link from "next/link";
import { AlertTriangle, Boxes, CircleDollarSign } from "lucide-react";
import { requireOficina, requirePermissaoPage } from "@/shared/lib/session";
import {
  listarPecas,
  listarMovimentacoes,
  listarCategorias,
  resumoEstoque,
  curvaAbc,
} from "@/modules/estoque/services/estoque-service";
import { listarContagens } from "@/modules/estoque/services/contagem-service";
import { listarFornecedores } from "@/modules/compras/services/compras-service";
import { PecasTable } from "@/modules/estoque/components/pecas-table";
import { PecaDialog } from "@/modules/estoque/components/peca-dialog";
import { MovimentacaoDialog } from "@/modules/estoque/components/movimentacao-dialog";
import { CurvaAbcTable } from "@/modules/estoque/components/curva-abc-table";
import { ContagensSection } from "@/modules/estoque/components/contagens-section";
import {
  TIPO_MOVIMENTACAO_BADGE,
  TIPO_MOVIMENTACAO_LABEL,
} from "@/modules/estoque/schemas/estoque-schemas";
import { KpiCard } from "@/modules/dashboard/components/kpi-card";
import { BuscaInput } from "@/shared/components/busca-input";
import { Paginacao } from "@/shared/components/paginacao";
import { formatarMoeda, paraNumero } from "@/shared/utils/moeda";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Estoque" };

interface Props {
  searchParams: Promise<{ busca?: string; pagina?: string; filtro?: string }>;
}

async function ConteudoEstoque({ searchParams }: Props) {
  const ctx = await requireOficina();
  await requirePermissaoPage(ctx, "estoque");
  const { db } = ctx;
  const params = await searchParams;
  const pagina = Math.max(1, Number(params.pagina) || 1);

  const [resumo, pecas, movimentacoes, categorias, fornecedores, curva, contagens] =
    await Promise.all([
      resumoEstoque(db),
      listarPecas(db, {
        busca: params.busca,
        pagina,
        somenteBaixo: params.filtro === "baixo",
      }),
      listarMovimentacoes(db, { pagina: 1 }),
      listarCategorias(db),
      listarFornecedores(db),
      curvaAbc(db),
      listarContagens(db, { pagina: 1 }),
    ]);

  const opcoesCategorias = categorias.map((c) => ({ id: c.id, nome: c.nome }));
  const opcoesFornecedores = fornecedores.map((f) => ({ id: f.id, nome: f.nome }));
  const pecasOpcao = pecas.itens.map((p) => ({
    id: p.id,
    nome: p.nome,
    quantidade: paraNumero(p.quantidade),
    unidade: p.unidade,
  }));

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard titulo="Itens ativos" valor={String(resumo.totalItens)} icone={Boxes} />
        <KpiCard
          titulo="Abaixo do mínimo"
          valor={String(resumo.abaixoMinimo)}
          icone={AlertTriangle}
          alerta={resumo.abaixoMinimo > 0}
          descricao={
            resumo.abaixoMinimo > 0 ? "Reposição recomendada" : "Tudo em dia"
          }
        />
        <KpiCard
          titulo="Valor do estoque (custo)"
          valor={formatarMoeda(resumo.valorCusto)}
          icone={CircleDollarSign}
        />
      </div>

      <Tabs defaultValue="pecas">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="pecas">Peças</TabsTrigger>
            <TabsTrigger value="movimentacoes">Movimentações</TabsTrigger>
            <TabsTrigger value="curva-abc">Curva ABC</TabsTrigger>
            <TabsTrigger value="contagens">Contagens</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <MovimentacaoDialog pecas={pecasOpcao} />
            <PecaDialog
              categorias={opcoesCategorias}
              fornecedores={opcoesFornecedores}
            />
          </div>
        </div>

        <TabsContent value="pecas" className="space-y-4 pt-3">
          <div className="flex flex-wrap items-center gap-3">
            <Suspense>
              <BuscaInput placeholder="Buscar por nome, código ou marca..." />
            </Suspense>
            <Link
              href={params.filtro === "baixo" ? "/estoque" : "/estoque?filtro=baixo"}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm transition-colors",
                params.filtro === "baixo"
                  ? "border-destructive/40 bg-destructive/10 text-destructive"
                  : "text-muted-foreground hover:bg-accent"
              )}
            >
              <AlertTriangle className="mr-1 inline size-3.5" />
              Somente abaixo do mínimo
            </Link>
          </div>
          <PecasTable
            dados={pecas.itens.map((p) => ({
              id: p.id,
              nome: p.nome,
              codigo: p.codigo,
              codigoBarras: p.codigoBarras,
              marca: p.marca,
              unidade: p.unidade,
              categoria: p.categoria?.nome ?? null,
              categoriaId: p.categoriaId,
              fornecedorId: p.fornecedorId,
              precoCusto: paraNumero(p.precoCusto),
              precoVenda: paraNumero(p.precoVenda),
              quantidade: paraNumero(p.quantidade),
              estoqueMinimo: paraNumero(p.estoqueMinimo),
              localizacao: p.localizacao,
            }))}
            categorias={opcoesCategorias}
            fornecedores={opcoesFornecedores}
          />
          <Paginacao
            pagina={pagina}
            totalPaginas={pecas.totalPaginas}
            totalRegistros={pecas.total}
          />
        </TabsContent>

        <TabsContent value="movimentacoes" className="pt-3">
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Data</TableHead>
                  <TableHead>Peça</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Qtd.</TableHead>
                  <TableHead>Origem / motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movimentacoes.itens.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-32 text-center text-muted-foreground"
                    >
                      Nenhuma movimentação registrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  movimentacoes.itens.map((mov) => (
                    <TableRow key={mov.id}>
                      <TableCell className="text-sm">
                        {format(mov.createdAt, "dd/MM/yyyy HH:mm")}
                      </TableCell>
                      <TableCell className="font-medium">{mov.peca.nome}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "font-normal",
                            TIPO_MOVIMENTACAO_BADGE[mov.tipo]
                          )}
                        >
                          {TIPO_MOVIMENTACAO_LABEL[mov.tipo]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {mov.tipo === "SAIDA" ? "−" : "+"}
                        {Math.abs(paraNumero(mov.quantidade))} {mov.peca.unidade}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {mov.ordemServico ? (
                          <Link
                            href={`/ordens/${mov.ordemServico.id}`}
                            className="text-destaque hover:underline"
                          >
                            OS #{String(mov.ordemServico.numero).padStart(4, "0")}
                          </Link>
                        ) : (
                          (mov.motivo ?? "—")
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="curva-abc" className="pt-3">
          <CurvaAbcTable curva={curva} />
        </TabsContent>

        <TabsContent value="contagens" className="pt-3">
          <ContagensSection
            categorias={opcoesCategorias}
            contagens={contagens.itens.map((c) => ({
              id: c.id,
              numero: c.numero,
              status: c.status,
              categoria: c.categoria?.nome ?? null,
              qtdItens: c._count.itens,
              createdAt: c.createdAt,
              concluidaEm: c.concluidaEm,
            }))}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}

export default function EstoquePage(props: Props) {
  return (
    <div className="space-y-6">
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-lg" />}>
        <ConteudoEstoque {...props} />
      </Suspense>
    </div>
  );
}
