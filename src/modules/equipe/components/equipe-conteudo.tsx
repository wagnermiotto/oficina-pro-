"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Cargo } from "@prisma/client";
import { Loader2, Pencil, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { formatarMoeda } from "@/shared/utils/moeda";
import {
  salvarPerfilAction,
  type PerfilFormValues,
} from "../actions/equipe-actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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

export const CARGO_LABEL: Record<Cargo, string> = {
  ADMIN: "Administrador",
  GERENTE: "Gerente",
  RECEPCIONISTA: "Recepcionista",
  MECANICO: "Mecânico",
  FINANCEIRO: "Financeiro",
  ESTOQUISTA: "Estoquista",
};

export interface MembroLinha {
  userId: string;
  nome: string;
  email: string;
  cargo: Cargo | null;
  especialidade: string | null;
  comissaoPercent: number;
  salario: number | null;
  telefone: string | null;
  ativo: boolean;
  osFinalizadas: number;
  receitaGerada: number;
}

function PerfilDialog({
  membro,
  aberto,
  onFechar,
}: {
  membro: MembroLinha | null;
  aberto: boolean;
  onFechar: () => void;
}) {
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);
  const [valores, setValores] = useState<PerfilFormValues>({
    cargo: membro?.cargo ?? "MECANICO",
    especialidade: membro?.especialidade ?? "",
    comissaoPercent: membro ? String(membro.comissaoPercent) : "",
    salario: membro?.salario != null ? String(membro.salario) : "",
    telefone: membro?.telefone ?? "",
    ativo: membro?.ativo ?? true,
  });

  async function salvar() {
    if (!membro) return;
    setSalvando(true);
    const resultado = await salvarPerfilAction(membro.userId, valores);
    setSalvando(false);
    if (!resultado.ok) {
      toast.error(resultado.erro);
      return;
    }
    toast.success("Perfil atualizado.");
    onFechar();
    router.refresh();
  }

  if (!membro) return null;

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Perfil de {membro.nome}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Cargo</Label>
              <Select
                value={valores.cargo}
                onValueChange={(v) =>
                  setValores((a) => ({ ...a, cargo: v as Cargo }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CARGO_LABEL).map(([valor, label]) => (
                    <SelectItem key={valor} value={valor}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Especialidade</Label>
              <Input
                value={valores.especialidade ?? ""}
                onChange={(e) =>
                  setValores((a) => ({ ...a, especialidade: e.target.value }))
                }
                placeholder="Ex.: injeção eletrônica"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Comissão (%)</Label>
              <Input
                value={String(valores.comissaoPercent ?? "")}
                onChange={(e) =>
                  setValores((a) => ({ ...a, comissaoPercent: e.target.value }))
                }
                inputMode="decimal"
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Salário (R$)</Label>
              <Input
                value={String(valores.salario ?? "")}
                onChange={(e) =>
                  setValores((a) => ({ ...a, salario: e.target.value }))
                }
                inputMode="decimal"
                placeholder="—"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input
                value={valores.telefone ?? ""}
                onChange={(e) =>
                  setValores((a) => ({ ...a, telefone: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border p-3">
            <Checkbox
              checked={valores.ativo}
              onCheckedChange={(v) =>
                setValores((a) => ({ ...a, ativo: Boolean(v) }))
              }
              id="perfil-ativo"
            />
            <Label htmlFor="perfil-ativo" className="font-normal">
              Funcionário ativo
            </Label>
          </div>
          <div className="flex justify-end">
            <Button onClick={salvar} disabled={salvando}>
              {salvando && <Loader2 className="size-4 animate-spin" />}
              Salvar perfil
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function EquipeConteudo({ membros }: { membros: MembroLinha[] }) {
  const [editando, setEditando] = useState<MembroLinha | null>(null);

  return (
    <div className="space-y-4">
      <Card className="py-4">
        <CardContent className="flex items-center gap-3 px-4 text-sm text-muted-foreground">
          <UserPlus className="size-5 shrink-0 text-destaque" />
          <p>
            Novos membros entram pela tela de cadastro e são vinculados à
            oficina pelo administrador. O convite por e-mail será habilitado ao
            configurar RESEND_API_KEY no servidor.
          </p>
        </CardContent>
      </Card>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Membro</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead className="text-right">Comissão</TableHead>
              <TableHead className="text-right">OS finalizadas</TableHead>
              <TableHead className="text-right">Receita gerada</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {membros.map((membro) => (
              <TableRow key={membro.userId}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="size-8">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {membro.nome
                          .split(" ")
                          .map((parte) => parte[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {membro.nome}
                        {!membro.ativo && (
                          <Badge variant="outline" className="ml-2 font-normal">
                            Inativo
                          </Badge>
                        )}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {membro.email}
                        {membro.especialidade ? ` · ${membro.especialidade}` : ""}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {membro.cargo ? (
                    <Badge variant="secondary">{CARGO_LABEL[membro.cargo]}</Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      Sem perfil
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {membro.comissaoPercent > 0 ? `${membro.comissaoPercent}%` : "—"}
                </TableCell>
                <TableCell className="text-right">{membro.osFinalizadas}</TableCell>
                <TableCell className="text-right font-mono">
                  {formatarMoeda(membro.receitaGerada)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditando(membro)}
                    aria-label={`Editar perfil de ${membro.nome}`}
                  >
                    <Pencil className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <PerfilDialog
        key={editando?.userId ?? "nenhum"}
        membro={editando}
        aberto={Boolean(editando)}
        onFechar={() => setEditando(null)}
      />
    </div>
  );
}
