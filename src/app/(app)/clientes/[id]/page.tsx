import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Bike,
  Car,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
} from "lucide-react";
import { requireOficina, requirePermissaoPage } from "@/shared/lib/session";
import { obterCliente } from "@/modules/clientes/services/clientes-service";
import { listarClientesParaSelecao } from "@/modules/veiculos/services/veiculos-service";
import { ClienteDialog } from "@/modules/clientes/components/cliente-dialog";
import { VeiculoDialog } from "@/modules/veiculos/components/veiculo-dialog";
import { formatarCpfCnpj } from "@/shared/utils/documento";
import { formatarPlaca } from "@/shared/utils/placa";
import { formatarMoeda } from "@/shared/utils/moeda";
import { STATUS_OS_BADGE, STATUS_OS_LABEL } from "@/shared/constants/os";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Detalhes do cliente" };

export default async function ClienteDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireOficina();
  await requirePermissaoPage(ctx, "clientes");
  const { db } = ctx;
  const { id } = await params;
  const [cliente, clientesSelecao] = await Promise.all([
    obterCliente(db, id),
    listarClientesParaSelecao(db),
  ]);
  if (!cliente) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/clientes" aria-label="Voltar">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-xl font-bold tracking-tight">{cliente.nome}</h2>
            <p className="text-sm text-muted-foreground">
              {cliente.tipo === "JURIDICA" ? "Pessoa Jurídica" : "Pessoa Física"}
              {cliente.cpfCnpj ? ` · ${formatarCpfCnpj(cliente.cpfCnpj)}` : ""}
            </p>
          </div>
        </div>
        <ClienteDialog
          clienteId={cliente.id}
          valoresIniciais={{
            tipo: cliente.tipo,
            nome: cliente.nome,
            cpfCnpj: cliente.cpfCnpj ?? "",
            telefone: cliente.telefone ?? "",
            whatsapp: cliente.whatsapp ?? "",
            dataNascimento: cliente.dataNascimento
              ? cliente.dataNascimento.toISOString().slice(0, 10)
              : "",
            email: cliente.email ?? "",
            cep: cliente.cep ?? "",
            endereco: cliente.endereco ?? "",
            numero: cliente.numero ?? "",
            complemento: cliente.complemento ?? "",
            bairro: cliente.bairro ?? "",
            cidade: cliente.cidade ?? "",
            estado: cliente.estado ?? "",
            observacoes: cliente.observacoes ?? "",
          }}
          trigger={<Button variant="outline">Editar cliente</Button>}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Contato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="flex items-center gap-2">
              <Phone className="size-4 text-muted-foreground" />
              {cliente.telefone ?? "—"}
            </p>
            <p className="flex items-center gap-2">
              <MessageCircle className="size-4 text-muted-foreground" />
              {cliente.whatsapp ?? "—"}
            </p>
            <p className="flex items-center gap-2">
              <Mail className="size-4 text-muted-foreground" />
              {cliente.email ?? "—"}
            </p>
            <Separator className="my-3" />
            <p className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span>
                {[
                  [cliente.endereco, cliente.numero].filter(Boolean).join(", "),
                  cliente.bairro,
                  [cliente.cidade, cliente.estado].filter(Boolean).join("/"),
                  cliente.cep,
                ]
                  .filter(Boolean)
                  .join(" · ") || "Endereço não informado"}
              </span>
            </p>
            {cliente.observacoes ? (
              <>
                <Separator className="my-3" />
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {cliente.observacoes}
                </p>
              </>
            ) : null}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Veículos ({cliente._count.veiculos})</CardTitle>
              <CardDescription>Frota vinculada a este cliente</CardDescription>
            </div>
            <VeiculoDialog
              clientes={clientesSelecao.map((c) => ({ id: c.id, nome: c.nome }))}
              valoresIniciais={{ clienteId: cliente.id }}
              clienteFixo
              trigger={<Button variant="outline" size="sm">Adicionar veículo</Button>}
            />
          </CardHeader>
          <CardContent>
            {cliente.veiculos.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhum veículo cadastrado.
              </p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {cliente.veiculos.map((veiculo) => (
                  <li key={veiculo.id}>
                    <Link
                      href={`/veiculos/${veiculo.id}`}
                      className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
                    >
                      <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/20">
                        {veiculo.tipo === "MOTO" ? (
                          <Bike className="size-5" />
                        ) : (
                          <Car className="size-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {[veiculo.marca, veiculo.modelo].filter(Boolean).join(" ") ||
                            "Veículo"}
                        </p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {formatarPlaca(veiculo.placa)}
                          {veiculo.ano ? ` · ${veiculo.ano}` : ""}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de ordens de serviço</CardTitle>
          <CardDescription>Últimas 10 ordens deste cliente</CardDescription>
        </CardHeader>
        <CardContent>
          {cliente.ordens.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhuma ordem de serviço registrada.
            </p>
          ) : (
            <ul className="divide-y">
              {cliente.ordens.map((os) => (
                <li key={os.id} className="flex items-center gap-4 py-3">
                  <span className="font-mono text-sm">
                    #{String(os.numero).padStart(4, "0")}
                  </span>
                  <span className="flex-1 truncate text-sm text-muted-foreground">
                    {os.veiculo.modelo ?? ""} · {formatarPlaca(os.veiculo.placa)}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn("font-normal", STATUS_OS_BADGE[os.status])}
                  >
                    {STATUS_OS_LABEL[os.status]}
                  </Badge>
                  <span className="font-mono text-sm">{formatarMoeda(os.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
