"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleDollarSign } from "lucide-react";
import { toast } from "sonner";
import { formatarMoeda } from "@/shared/utils/moeda";
import { pagarComissaoAction } from "../actions/financeiro-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface ComissaoLinha {
  id: string;
  mecanico: string;
  osId: string;
  osNumero: number;
  percentual: number;
  valor: number;
  status: string;
  pagaEm: string | null;
}

export function ComissoesTable({ dados }: { dados: ComissaoLinha[] }) {
  const router = useRouter();

  async function pagar(id: string) {
    const resultado = await pagarComissaoAction(id);
    if (!resultado.ok) {
      toast.error(resultado.erro);
      return;
    }
    toast.success("Comissão paga e lançada como despesa.");
    router.refresh();
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Mecânico</TableHead>
            <TableHead>OS</TableHead>
            <TableHead className="text-right">%</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-28" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {dados.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                Nenhuma comissão gerada ainda. Comissões nascem quando uma OS é
                finalizada com mecânico que tem percentual configurado.
              </TableCell>
            </TableRow>
          ) : (
            dados.map((comissao) => (
              <TableRow key={comissao.id}>
                <TableCell className="font-medium">{comissao.mecanico}</TableCell>
                <TableCell>
                  <Link
                    href={`/ordens/${comissao.osId}`}
                    className="font-mono text-destaque hover:underline"
                  >
                    #{String(comissao.osNumero).padStart(4, "0")}
                  </Link>
                </TableCell>
                <TableCell className="text-right font-mono">
                  {comissao.percentual}%
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatarMoeda(comissao.valor)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      comissao.status === "PAGA"
                        ? "bg-chart-5/15 text-chart-5 border-chart-5/30 font-normal"
                        : "bg-destaque/15 text-destaque border-destaque/30 font-normal"
                    }
                  >
                    {comissao.status === "PAGA"
                      ? `Paga${comissao.pagaEm ? ` em ${comissao.pagaEm}` : ""}`
                      : "Pendente"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {comissao.status === "PENDENTE" && (
                    <Button variant="outline" size="sm" onClick={() => pagar(comissao.id)}>
                      <CircleDollarSign className="size-3.5" /> Pagar
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
