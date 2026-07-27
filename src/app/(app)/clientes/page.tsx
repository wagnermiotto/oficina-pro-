import type { Metadata } from "next";
import { Suspense } from "react";
import { requireOficina, requirePermissaoPage } from "@/shared/lib/session";
import { listarClientes } from "@/modules/clientes/services/clientes-service";
import { ClientesTable } from "@/modules/clientes/components/clientes-table";
import { ClienteDialog } from "@/modules/clientes/components/cliente-dialog";
import { BuscaInput } from "@/shared/components/busca-input";
import { Paginacao } from "@/shared/components/paginacao";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Clientes" };

interface Props {
  searchParams: Promise<{ busca?: string; pagina?: string }>;
}

async function ListaClientes({ searchParams }: Props) {
  const ctx = await requireOficina();
  await requirePermissaoPage(ctx, "clientes");
  const { db } = ctx;
  const params = await searchParams;
  const pagina = Math.max(1, Number(params.pagina) || 1);
  const { itens, total, totalPaginas } = await listarClientes(db, {
    busca: params.busca,
    pagina,
  });

  return (
    <>
      <ClientesTable
        dados={itens.map((c) => ({
          id: c.id,
          tipo: c.tipo,
          nome: c.nome,
          cpfCnpj: c.cpfCnpj,
          telefone: c.telefone,
          whatsapp: c.whatsapp,
          email: c.email,
          cidade: c.cidade,
          estado: c.estado,
          veiculos: c._count.veiculos,
          ordens: c._count.ordens,
        }))}
      />
      <Paginacao pagina={pagina} totalPaginas={totalPaginas} totalRegistros={total} />
    </>
  );
}

export default function ClientesPage(props: Props) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Suspense>
          <BuscaInput placeholder="Buscar por nome, CPF/CNPJ, telefone..." />
        </Suspense>
        <ClienteDialog />
      </div>
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-lg" />}>
        <ListaClientes {...props} />
      </Suspense>
    </div>
  );
}
