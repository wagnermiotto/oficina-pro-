"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Loader2, Lock, Plus, Save, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import {
  criarPerfilAction,
  duplicarPerfilAction,
  excluirPerfilAction,
  salvarMatrizPerfilAction,
} from "../actions/permissoes-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface PerfilLinha {
  id: string;
  nome: string;
  descricao: string | null;
  sistema: boolean;
  chave: string | null;
  qtdFuncionarios: number;
  permissoes: { modulo: string; acao: string }[];
}

export interface ModuloCatalogo {
  id: string;
  rotulo: string;
  acoes: string[];
  reservado: boolean;
}

const ACOES_BASE = ["VISUALIZAR", "CRIAR", "EDITAR", "EXCLUIR"];

const ROTULO_ACAO: Record<string, string> = {
  VISUALIZAR: "Visualizar",
  VISUALIZAR_TODAS: "Ver todas as OS",
  CRIAR: "Criar",
  EDITAR: "Editar",
  EXCLUIR: "Excluir",
  MOVIMENTAR: "Movimentar",
  MUDAR_STATUS: "Mudar status",
  ENVIAR_APROVACAO: "Enviar ao cliente",
  VER_VALORES: "Ver valores",
  EXPORTAR: "Exportar",
  ENVIAR: "Enviar",
};

interface Props {
  perfis: PerfilLinha[];
  catalogo: ModuloCatalogo[];
  podeEditar: boolean;
}

export function PermissoesSection({ perfis, catalogo, podeEditar }: Props) {
  const router = useRouter();
  const [perfilId, setPerfilId] = useState(perfis[0]?.id ?? "");
  const [salvando, setSalvando] = useState(false);
  const [novoAberto, setNovoAberto] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [duplicando, setDuplicando] = useState(false);

  const perfil = useMemo(
    () => perfis.find((p) => p.id === perfilId) ?? perfis[0],
    [perfis, perfilId]
  );

  const [selecao, setSelecao] = useState<Set<string>>(
    () => new Set(perfil?.permissoes.map((p) => `${p.modulo}.${p.acao}`) ?? [])
  );
  const [origemSelecao, setOrigemSelecao] = useState(perfil?.id ?? "");
  if (perfil && origemSelecao !== perfil.id) {
    setOrigemSelecao(perfil.id);
    setSelecao(new Set(perfil.permissoes.map((p) => `${p.modulo}.${p.acao}`)));
  }

  if (!perfil) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum perfil encontrado. Recarregue a página.
      </p>
    );
  }

  const travado = perfil.chave === "PROPRIETARIO";
  const editavel = podeEditar && !travado;

  function alternar(chave: string, marcado: boolean) {
    setSelecao((atual) => {
      const proxima = new Set(atual);
      if (marcado) proxima.add(chave);
      else proxima.delete(chave);
      return proxima;
    });
  }

  async function salvar() {
    setSalvando(true);
    const permissoes = [...selecao].map((c) => {
      const [modulo, ...resto] = c.split(".");
      return { modulo, acao: resto.join(".") };
    });
    const resultado = await salvarMatrizPerfilAction(perfil.id, permissoes);
    setSalvando(false);
    if (!resultado.ok) {
      toast.error(resultado.erro);
      return;
    }
    toast.success(`Permissões de "${perfil.nome}" salvas.`);
    router.refresh();
  }

  async function criarNovo() {
    if (novoNome.trim().length < 2) {
      toast.error("Informe o nome do perfil.");
      return;
    }
    setSalvando(true);
    const resultado = duplicando
      ? await duplicarPerfilAction(perfil.id, novoNome)
      : await criarPerfilAction({ nome: novoNome, permissoes: [] });
    setSalvando(false);
    if (!resultado.ok) {
      toast.error(resultado.erro);
      return;
    }
    toast.success(`Perfil "${novoNome}" criado.`);
    setNovoAberto(false);
    setNovoNome("");
    if (resultado.id) setPerfilId(resultado.id);
    router.refresh();
  }

  async function excluir() {
    setSalvando(true);
    const resultado = await excluirPerfilAction(perfil.id);
    setSalvando(false);
    if (!resultado.ok) {
      toast.error(resultado.erro);
      return;
    }
    toast.success(`Perfil "${perfil.nome}" excluído.`);
    setPerfilId(perfis.find((p) => p.id !== perfil.id)?.id ?? "");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="perfil-select">Perfil</Label>
          <Select value={perfil.id} onValueChange={setPerfilId}>
            <SelectTrigger id="perfil-select" className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {perfis.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nome}
                  {p.sistema ? " (padrão)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {podeEditar ? (
          <div className="flex flex-wrap gap-2">
            <Dialog open={novoAberto} onOpenChange={setNovoAberto}>
              <DialogTrigger asChild>
                <Button variant="outline" onClick={() => setDuplicando(false)}>
                  <Plus className="size-4" /> Novo perfil
                </Button>
              </DialogTrigger>
              <DialogTrigger asChild>
                <Button variant="outline" onClick={() => setDuplicando(true)}>
                  <Copy className="size-4" /> Duplicar &quot;{perfil.nome}&quot;
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {duplicando ? `Duplicar "${perfil.nome}"` : "Novo perfil"}
                  </DialogTitle>
                  <DialogDescription>
                    {duplicando
                      ? "A cópia nasce com a mesma matriz de permissões e pode ser ajustada."
                      : "O perfil nasce sem permissões — marque a matriz e salve."}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-1.5">
                  <Label htmlFor="novo-perfil-nome">Nome</Label>
                  <Input
                    id="novo-perfil-nome"
                    value={novoNome}
                    onChange={(e) => setNovoNome(e.target.value)}
                    placeholder="Ex.: Supervisor, Lavador, Consultor..."
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setNovoAberto(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={criarNovo} disabled={salvando}>
                    {salvando ? <Loader2 className="size-4 animate-spin" /> : null}
                    Criar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            {!perfil.sistema ? (
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={excluir}
                disabled={salvando || perfil.qtdFuncionarios > 0}
                title={
                  perfil.qtdFuncionarios > 0
                    ? "Reatribua os funcionários antes de excluir."
                    : undefined
                }
              >
                <Trash2 className="size-4" /> Excluir
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            {travado ? <Lock className="size-4" /> : null}
            {perfil.nome}
            <Badge variant="outline" className="font-normal">
              <Users className="mr-1 size-3" />
              {perfil.qtdFuncionarios} funcionário
              {perfil.qtdFuncionarios === 1 ? "" : "s"}
            </Badge>
          </CardTitle>
          {editavel ? (
            <Button onClick={salvar} disabled={salvando}>
              {salvando ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Salvar permissões
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-3">
          {travado ? (
            <p className="text-sm text-muted-foreground">
              O perfil Proprietário tem acesso total e não pode ser alterado.
            </p>
          ) : null}
          {perfil.descricao ? (
            <p className="text-sm text-muted-foreground">{perfil.descricao}</p>
          ) : null}
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="min-w-44">Módulo</TableHead>
                  {ACOES_BASE.map((acao) => (
                    <TableHead key={acao} className="text-center">
                      {ROTULO_ACAO[acao]}
                    </TableHead>
                  ))}
                  <TableHead>Ações especiais</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {catalogo.map((modulo) => {
                  const especiais = modulo.acoes.filter(
                    (a) => !ACOES_BASE.includes(a)
                  );
                  return (
                    <TableRow
                      key={modulo.id}
                      className={modulo.reservado ? "opacity-50" : undefined}
                    >
                      <TableCell className="font-medium">
                        {modulo.rotulo}
                        {modulo.reservado ? (
                          <Badge variant="outline" className="ml-2 text-xs font-normal">
                            em breve
                          </Badge>
                        ) : null}
                      </TableCell>
                      {ACOES_BASE.map((acao) => {
                        const existe = modulo.acoes.includes(acao);
                        const chave = `${modulo.id}.${acao}`;
                        return (
                          <TableCell key={acao} className="text-center">
                            {existe ? (
                              <Checkbox
                                checked={selecao.has(chave)}
                                disabled={!editavel}
                                onCheckedChange={(v) => alternar(chave, Boolean(v))}
                                aria-label={`${modulo.rotulo}: ${ROTULO_ACAO[acao]}`}
                              />
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell>
                        {especiais.length === 0 ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-x-4 gap-y-1">
                            {especiais.map((acao) => {
                              const chave = `${modulo.id}.${acao}`;
                              return (
                                <label
                                  key={acao}
                                  className="flex items-center gap-1.5 text-sm"
                                >
                                  <Checkbox
                                    checked={selecao.has(chave)}
                                    disabled={!editavel}
                                    onCheckedChange={(v) =>
                                      alternar(chave, Boolean(v))
                                    }
                                    aria-label={`${modulo.rotulo}: ${ROTULO_ACAO[acao] ?? acao}`}
                                  />
                                  {ROTULO_ACAO[acao] ?? acao}
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
