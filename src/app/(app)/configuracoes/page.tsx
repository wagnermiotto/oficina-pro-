import type { Metadata } from "next";
import { Suspense } from "react";
import { format } from "date-fns";
import {
  requireOficina,
  requirePermissaoPage,
  temPermissao,
} from "@/shared/lib/session";
import { prisma } from "@/shared/lib/prisma";
import { paraNumero } from "@/shared/utils/moeda";
import { ConfigForm } from "@/modules/configuracoes/components/config-form";
import { TemplatesSection } from "@/modules/ordens/components/templates-section";
import { listarTemplates } from "@/modules/ordens/services/template-service";
import { PermissoesSection } from "@/modules/permissoes/components/permissoes-section";
import { listarPerfis } from "@/modules/permissoes/services/permissoes-service";
import {
  MODULOS_RESERVADOS,
  MODULOS_SISTEMA,
} from "@/shared/permissoes/catalogo";
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

export const metadata: Metadata = { title: "Configurações" };

async function ConteudoConfiguracoes() {
  const ctx = await requireOficina();
  await requirePermissaoPage(ctx, "configuracoes");
  const { db, oficinaId } = ctx;
  // A trilha de auditoria é assunto de governança (mesmo gate de permissões).
  const [verAuditoria, verPermissoes, editarPermissoes] = await Promise.all([
    temPermissao(ctx, "permissoes", "VISUALIZAR"),
    temPermissao(ctx, "permissoes", "VISUALIZAR"),
    temPermissao(ctx, "permissoes", "EDITAR"),
  ]);
  const perfis = verPermissoes ? await listarPerfis(db) : [];
  const catalogoPermissoes = [
    ...Object.entries(MODULOS_SISTEMA).map(([id, def]) => ({
      id,
      rotulo: def.rotulo,
      acoes: [...def.acoes],
      reservado: false,
    })),
    ...Object.entries(MODULOS_RESERVADOS).map(([id, def]) => ({
      id,
      rotulo: def.rotulo,
      acoes: [...def.acoes],
      reservado: true,
    })),
  ];

  const [oficina, config, auditoria, templates] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: oficinaId },
      select: { name: true },
    }),
    db.oficinaConfig.findFirst(),
    db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    listarTemplates(db),
  ]);

  const usuarios =
    auditoria.length > 0
      ? await prisma.user.findMany({
          where: {
            id: {
              in: [
                ...new Set(
                  auditoria
                    .map((registro) => registro.usuarioId)
                    .filter((id): id is string => Boolean(id))
                ),
              ],
            },
          },
          select: { id: true, name: true },
        })
      : [];
  const nomes = new Map(usuarios.map((u) => [u.id, u.name]));

  return (
    <Tabs defaultValue="dados">
      <TabsList>
        <TabsTrigger value="dados">Dados da oficina</TabsTrigger>
        <TabsTrigger value="pacotes">Pacotes de serviço</TabsTrigger>
        {verPermissoes ? (
          <TabsTrigger value="permissoes">Permissões</TabsTrigger>
        ) : null}
        {verAuditoria ? (
          <TabsTrigger value="auditoria">Auditoria</TabsTrigger>
        ) : null}
      </TabsList>

      <TabsContent value="dados" className="pt-3">
        <ConfigForm
          valoresIniciais={{
            nomeOficina: oficina?.name ?? "",
            cnpj: config?.cnpj ?? "",
            razaoSocial: config?.razaoSocial ?? "",
            telefone: config?.telefone ?? "",
            whatsapp: config?.whatsapp ?? "",
            email: config?.email ?? "",
            cep: config?.cep ?? "",
            endereco: config?.endereco ?? "",
            numero: config?.numero ?? "",
            bairro: config?.bairro ?? "",
            cidade: config?.cidade ?? "",
            estado: config?.estado ?? "",
            pixChave: config?.pixChave ?? "",
            pixNomeRecebedor: config?.pixNomeRecebedor ?? "",
            pixCidade: config?.pixCidade ?? "",
            valorHoraPadrao: config ? String(paraNumero(config.valorHoraPadrao)) : "",
            impostoPadraoPercent: config
              ? String(paraNumero(config.impostoPadraoPercent))
              : "",
            garantiaPadraoDias: config ? String(config.garantiaPadraoDias) : "90",
          }}
        />
      </TabsContent>

      <TabsContent value="pacotes" className="pt-3">
        <TemplatesSection
          templates={templates.map((t) => ({
            id: t.id,
            nome: t.nome,
            tipoVeiculo: t.tipoVeiculo,
            itens: t.itens.map((i) => ({ tipo: i.tipo, descricao: i.descricao })),
          }))}
        />
      </TabsContent>

      {verPermissoes ? (
        <TabsContent value="permissoes" className="pt-3">
          <PermissoesSection
            perfis={perfis}
            catalogo={catalogoPermissoes}
            podeEditar={editarPermissoes}
          />
        </TabsContent>
      ) : null}

      {verAuditoria ? (
      <TabsContent value="auditoria" className="pt-3">
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Data</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditoria.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-32 text-center text-muted-foreground"
                  >
                    Nenhum registro de auditoria ainda.
                  </TableCell>
                </TableRow>
              ) : (
                auditoria.map((registro) => (
                  <TableRow key={registro.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {format(registro.createdAt, "dd/MM/yyyy HH:mm:ss")}
                    </TableCell>
                    <TableCell className="text-sm">
                      {registro.usuarioId
                        ? (nomes.get(registro.usuarioId) ?? "Usuário")
                        : "Sistema"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {registro.acao}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {registro.entidade}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {registro.ip ?? "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </TabsContent>
      ) : null}
    </Tabs>
  );
}

export default function ConfiguracoesPage() {
  return (
    <div className="space-y-4">
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-lg" />}>
        <ConteudoConfiguracoes />
      </Suspense>
    </div>
  );
}
