"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import type { StatusOS } from "@prisma/client";
import { DataTable } from "@/shared/components/data-table";
import { formatarMoeda } from "@/shared/utils/moeda";
import { formatarPlaca } from "@/shared/utils/placa";
import {
  FLUXO_STATUS_OS,
  STATUS_OS_BADGE,
  STATUS_OS_LABEL,
} from "@/shared/constants/os";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface OSLinha {
  id: string;
  numero: number;
  cliente: string;
  veiculo: string;
  status: StatusOS;
  dataEntrada: string;
  dataPrevista: string | null;
  /** null quando o usuário não tem ordens.VER_VALORES (coluna omitida). */
  total: number | null;
}

const colunas: ColumnDef<OSLinha, unknown>[] = [
  {
    accessorKey: "numero",
    header: "Nº",
    cell: ({ row }) => (
      <span className="font-mono font-semibold">
        #{String(row.original.numero).padStart(4, "0")}
      </span>
    ),
  },
  {
    accessorKey: "cliente",
    header: "Cliente / Veículo",
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.cliente}</p>
        <p className="text-xs text-muted-foreground">{row.original.veiculo}</p>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className={cn("font-normal", STATUS_OS_BADGE[row.original.status])}
      >
        {STATUS_OS_LABEL[row.original.status]}
      </Badge>
    ),
  },
  {
    accessorKey: "dataEntrada",
    header: "Entrada",
    cell: ({ row }) => (
      <div className="text-sm">
        <p>{row.original.dataEntrada}</p>
        {row.original.dataPrevista ? (
          <p className="text-xs text-muted-foreground">
            Prev.: {row.original.dataPrevista}
          </p>
        ) : null}
      </div>
    ),
  },
  {
    accessorKey: "total",
    header: () => <span className="block text-right">Total</span>,
    cell: ({ row }) => (
      <span className="block text-right font-mono">
        {row.original.total === null ? "—" : formatarMoeda(row.original.total)}
      </span>
    ),
  },
];

export function OrdensTable({
  dados,
  mostrarTotal = true,
}: {
  dados: OSLinha[];
  mostrarTotal?: boolean;
}) {
  const router = useRouter();
  const visiveis = mostrarTotal
    ? colunas
    : colunas.filter((c) => ("accessorKey" in c ? c.accessorKey !== "total" : true));
  return (
    <DataTable
      columns={visiveis}
      data={dados}
      mensagemVazia="Nenhuma ordem de serviço encontrada."
      onRowClick={(linha) => router.push(`/ordens/${linha.id}`)}
    />
  );
}

export function FiltroStatusOS() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const atual = searchParams.get("status") ?? "TODOS";

  function aplicar(valor: string) {
    const params = new URLSearchParams(searchParams);
    if (valor === "TODOS") {
      params.delete("status");
    } else {
      params.set("status", valor);
    }
    params.delete("pagina");
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <Select value={atual} onValueChange={aplicar}>
      <SelectTrigger className="w-52">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="TODOS">Todos os status</SelectItem>
        {[...FLUXO_STATUS_OS, "CANCELADO" as StatusOS].map((status) => (
          <SelectItem key={status} value={status}>
            {STATUS_OS_LABEL[status]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export { formatarPlaca };
