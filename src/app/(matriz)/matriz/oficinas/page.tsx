import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import type { StatusAssinatura } from "@prisma/client";
import { requireSuperAdmin } from "@/shared/lib/session";
import { listarOficinas, statusEfetivo } from "@/modules/plataforma/services/matriz-service";
import { listarPlanos } from "@/modules/plataforma/services/matriz-service";
import { OficinaAcoes } from "@/modules/plataforma/components/oficina-acoes";
import { STATUS_ASSINATURA_BADGE, STATUS_ASSINATURA_LABEL } from "@/modules/plataforma/constants";
import { BuscaInput } from "@/shared/components/busca-input";
import { Paginacao } from "@/shared/components/paginacao";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Oficinas · Matriz" };

interface Props {
  searchParams: Promise<{ busca?: string; status?: string; pagina?: string }>;
}

async function Conteudo({ searchParams }: Props) {
  await requireSuperAdmin();
  const params = await searchParams;
  const pagina = Math.max(1, Number(params.pagina) || 1);
  const status = params.status as StatusAssinatura | undefined;

  const [oficinas, planos] = await Promise.all([
    listarOficinas({ busca: params.busca, status, pagina }),
    listarPlanos(),
  ]);
  const planosOpcao = planos.map((p) => ({ id: p.id, nome: p.nome }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Oficinas</h1>
          <p className="text-sm text-muted-foreground">
            {oficinas.total} oficina(s) na plataforma. Gerencie plano, vencimento e cobrança.
          </p>
        </div>
        <Button asChild>
          <Link href="/matriz/oficinas/nova">
            <Plus className="size-4" /> Nova oficina
          </Link>
        </Button>
      </div>

      <Suspense>
        <BuscaInput placeholder="Buscar oficina pelo nome..." />
      </Suspense>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Oficina</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead className="text-right">Usuários / OS</TableHead>
              <TableHead className="text-right">Cobrança</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {oficinas.itens.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  Nenhuma oficina encontrada.
                </TableCell>
              </TableRow>
            ) : (
              oficinas.itens.map((of) => {
                const a = of.assinatura;
                const efetivo = a ? statusEfetivo(a) : null;
                return (
                  <TableRow key={of.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/matriz/oficinas/${of.id}`}
                        className="hover:text-destaque hover:underline"
                      >
                        {of.name}
                      </Link>
                    </TableCell>
                    <TableCell>{a?.plano.nome ?? <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>
                      {efetivo ? (
                        <Badge variant="outline" className={cn("font-normal", STATUS_ASSINATURA_BADGE[efetivo])}>
                          {STATUS_ASSINATURA_LABEL[efetivo]}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="font-normal text-muted-foreground">
                          Sem plano
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {a ? format(a.vencimento, "dd/MM/yyyy") : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {of._count.members} / {of._count.ordensServico}
                    </TableCell>
                    <TableCell className="text-right">
                      <OficinaAcoes
                        oficinaId={of.id}
                        temAssinatura={Boolean(a)}
                        planoId={a?.planoId ?? null}
                        vencimento={a ? format(a.vencimento, "yyyy-MM-dd") : null}
                        planos={planosOpcao}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Paginacao
        pagina={pagina}
        totalPaginas={oficinas.totalPaginas}
        totalRegistros={oficinas.total}
      />
    </div>
  );
}

export default function OficinasMatrizPage(props: Props) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-lg" />}>
      <Conteudo {...props} />
    </Suspense>
  );
}
