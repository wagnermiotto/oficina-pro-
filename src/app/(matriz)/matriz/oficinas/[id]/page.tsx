import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, Car, ClipboardList, Clock, Users } from "lucide-react";
import { requireSuperAdmin } from "@/shared/lib/session";
import {
  detalheOficina,
  listarPlanos,
  statusEfetivo,
} from "@/modules/plataforma/services/matriz-service";
import { OficinaAcoes } from "@/modules/plataforma/components/oficina-acoes";
import { FlagsOficina } from "@/modules/plataforma/components/flags-oficina";
import {
  STATUS_ASSINATURA_BADGE,
  STATUS_ASSINATURA_LABEL,
} from "@/modules/plataforma/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Oficina · Matriz" };

function Metrica({
  icone: Icone,
  rotulo,
  valor,
}: {
  icone: typeof Users;
  rotulo: string;
  valor: string;
}) {
  return (
    <Card className="py-4">
      <CardContent className="flex items-center gap-3 px-4">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icone className="size-4" />
        </div>
        <div>
          <p className="text-lg font-bold leading-tight">{valor}</p>
          <p className="text-xs text-muted-foreground">{rotulo}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function OficinaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSuperAdmin();
  const { id } = await params;
  const [detalhe, planos] = await Promise.all([detalheOficina(id), listarPlanos()]);
  if (!detalhe) notFound();

  const { oficina, metricas, flags } = detalhe;
  const a = oficina.assinatura;
  const efetivo = a ? statusEfetivo(a) : null;
  const config = oficina.config;

  const linhasCadastro: [string, string | null | undefined][] = [
    ["CNPJ", config?.cnpj],
    ["Razão social", config?.razaoSocial],
    ["Responsável", config?.responsavelNome],
    ["CPF do responsável", config?.responsavelCpf],
    ["E-mail", config?.email],
    ["Telefone", config?.telefone],
    ["WhatsApp", config?.whatsapp],
    [
      "Endereço",
      [config?.endereco, config?.numero, config?.bairro].filter(Boolean).join(", ") ||
        null,
    ],
    [
      "Cidade/UF",
      [config?.cidade, config?.estado].filter(Boolean).join("/") || null,
    ],
    ["CEP", config?.cep],
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/matriz/oficinas" aria-label="Voltar">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold tracking-tight">{oficina.name}</h1>
              {efetivo ? (
                <Badge
                  variant="outline"
                  className={cn("font-normal", STATUS_ASSINATURA_BADGE[efetivo])}
                >
                  {STATUS_ASSINATURA_LABEL[efetivo]}
                </Badge>
              ) : (
                <Badge variant="outline" className="font-normal text-muted-foreground">
                  Sem plano
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Criada em {format(oficina.createdAt, "dd/MM/yyyy")}
              {a ? ` · Plano ${a.plano.nome} · vence ${format(a.vencimento, "dd/MM/yyyy")}` : ""}
            </p>
          </div>
        </div>
        <OficinaAcoes
          oficinaId={oficina.id}
          temAssinatura={Boolean(a)}
          planoId={a?.planoId ?? null}
          vencimento={a ? format(a.vencimento, "yyyy-MM-dd") : null}
          planos={planos.filter((p) => p.ativo).map((p) => ({ id: p.id, nome: p.nome }))}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metrica icone={Users} rotulo="Usuários" valor={String(metricas.usuarios)} />
        <Metrica icone={Car} rotulo="Veículos" valor={String(metricas.veiculos)} />
        <Metrica
          icone={ClipboardList}
          rotulo="Ordens de serviço"
          valor={String(metricas.ordens)}
        />
        <Metrica
          icone={Clock}
          rotulo="Último acesso"
          valor={
            metricas.ultimoAcesso
              ? format(metricas.ultimoAcesso, "dd/MM/yyyy HH:mm")
              : "Nunca"
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cadastro</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              {linhasCadastro.map(([rotulo, valor]) => (
                <div key={rotulo} className="flex justify-between gap-4 border-b pb-2 last:border-0">
                  <dt className="text-muted-foreground">{rotulo}</dt>
                  <dd className="text-right font-medium">
                    {valor || <span className="text-muted-foreground">—</span>}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">
              O dono edita os dados cadastrais em Configurações dentro da própria
              oficina; a Matriz controla plano, cobrança e recursos.
            </p>
          </CardContent>
        </Card>

        <FlagsOficina
          oficinaId={oficina.id}
          flags={flags.map((f) => ({ chave: f.chave, valor: f.valor }))}
        />
      </div>
    </div>
  );
}
