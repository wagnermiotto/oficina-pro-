"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  adicionarSuperAdminAction,
  removerSuperAdminAction,
} from "../actions/matriz-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface AdminLinha {
  id: string;
  userId: string;
  nome: string;
  email: string;
  desde: string;
}

export function AdministradoresConteudo({
  admins,
  meuUserId,
}: {
  admins: AdminLinha[];
  meuUserId: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [processando, setProcessando] = useState(false);

  async function adicionar() {
    setProcessando(true);
    const resultado = await adicionarSuperAdminAction(email);
    setProcessando(false);
    if (!resultado.ok) {
      toast.error(resultado.erro);
      return;
    }
    toast.success("Administrador adicionado.");
    setEmail("");
    router.refresh();
  }

  async function remover(admin: AdminLinha) {
    setProcessando(true);
    const resultado = await removerSuperAdminAction(admin.userId);
    setProcessando(false);
    if (!resultado.ok) {
      toast.error(resultado.erro);
      return;
    }
    toast.success(`${admin.email} removido da administração.`);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Card className="py-4">
        <CardContent className="flex flex-wrap items-end gap-3 px-4">
          <div className="min-w-64 flex-1 space-y-1.5">
            <Label htmlFor="novo-admin-email">Adicionar administrador por e-mail</Label>
            <Input
              id="novo-admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="pessoa@exemplo.com (precisa já ter conta no sistema)"
            />
          </div>
          <Button onClick={adicionar} disabled={processando || !email.trim()}>
            {processando ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ShieldPlus className="size-4" />
            )}
            Adicionar
          </Button>
        </CardContent>
      </Card>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Desde</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {admins.map((admin) => (
              <TableRow key={admin.id}>
                <TableCell className="font-medium">
                  {admin.nome}
                  {admin.userId === meuUserId ? (
                    <span className="ml-2 text-xs text-muted-foreground">(você)</span>
                  ) : null}
                </TableCell>
                <TableCell>{admin.email}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {admin.desde}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    disabled={processando || admin.userId === meuUserId || admins.length <= 1}
                    onClick={() => remover(admin)}
                    aria-label={`Remover ${admin.email}`}
                    title={
                      admin.userId === meuUserId
                        ? "Você não pode remover a si mesmo."
                        : admins.length <= 1
                          ? "A plataforma precisa de ao menos um administrador."
                          : undefined
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
