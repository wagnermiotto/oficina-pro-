import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { STATUS_OS_BADGE, STATUS_OS_LABEL } from "@/shared/constants/os";
import { formatarMoeda } from "@/shared/utils/moeda";
import { cn } from "@/lib/utils";
import type { OSResumida } from "../types";

export function OSRecentes({ ordens }: { ordens: OSResumida[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ordens recentes</CardTitle>
        <CardDescription>Últimas entradas na oficina</CardDescription>
      </CardHeader>
      <CardContent>
        {ordens.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma ordem de serviço ainda. Crie a primeira em{" "}
            <Link href="/ordens" className="text-destaque hover:underline">
              Ordens de Serviço
            </Link>
            .
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="hidden md:table-cell">Veículo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordens.map((os) => (
                <TableRow key={os.id}>
                  <TableCell className="font-mono text-xs">
                    #{String(os.numero).padStart(4, "0")}
                  </TableCell>
                  <TableCell className="max-w-40 truncate font-medium">
                    {os.cliente}
                  </TableCell>
                  <TableCell className="hidden max-w-48 truncate text-muted-foreground md:table-cell">
                    {os.veiculo}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn("font-normal", STATUS_OS_BADGE[os.status])}
                    >
                      {STATUS_OS_LABEL[os.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatarMoeda(os.total)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
