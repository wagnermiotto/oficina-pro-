"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import {
  criarOficinaMatrizAction,
  type NovaOficinaFormValues,
} from "../actions/matriz-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Textarea } from "@/components/ui/textarea";

interface Props {
  planos: { id: string; nome: string }[];
}

function Campo({
  rotulo,
  children,
  className,
}: {
  rotulo: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label>{rotulo}</Label>
      {children}
    </div>
  );
}

export function NovaOficinaForm({ planos }: Props) {
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);
  const [credenciais, setCredenciais] = useState<{
    email: string;
    senha: string | null;
    oficinaId: string;
  } | null>(null);

  const emUmMes = new Date();
  emUmMes.setDate(emUmMes.getDate() + 30);

  const [v, setV] = useState<NovaOficinaFormValues>({
    nome: "",
    emailDono: "",
    planoId: planos[0]?.id ?? "",
    vencimento: emUmMes.toISOString().slice(0, 10),
    statusInicial: "ATIVO",
    iaEnabled: true,
    biEnabled: true,
  });

  function campo<K extends keyof NovaOficinaFormValues>(chave: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setV((a) => ({ ...a, [chave]: e.target.value }));
  }

  async function salvar() {
    setSalvando(true);
    const resultado = await criarOficinaMatrizAction(v);
    setSalvando(false);
    if (!resultado.ok) {
      toast.error(resultado.erro);
      return;
    }
    toast.success("Oficina criada com sucesso.");
    setCredenciais({
      email: resultado.emailDono ?? v.emailDono,
      senha: resultado.senhaProvisoria ?? null,
      oficinaId: resultado.oficinaId ?? "",
    });
  }

  async function copiarCredenciais() {
    if (!credenciais) return;
    const texto = credenciais.senha
      ? `Acesso ao OficinaPro\nE-mail: ${credenciais.email}\nSenha provisória: ${credenciais.senha}\n(Troque a senha após o primeiro acesso.)`
      : `Acesso ao OficinaPro\nE-mail: ${credenciais.email} (conta já existente)`;
    await navigator.clipboard.writeText(texto);
    toast.success("Credenciais copiadas.");
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Dados da empresa</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Campo rotulo="Nome da oficina *">
            <Input value={v.nome} onChange={campo("nome")} placeholder="Oficina do João" />
          </Campo>
          <Campo rotulo="Razão social">
            <Input value={v.razaoSocial ?? ""} onChange={campo("razaoSocial")} />
          </Campo>
          <Campo rotulo="CNPJ">
            <Input value={v.cnpj ?? ""} onChange={campo("cnpj")} placeholder="00.000.000/0000-00" />
          </Campo>
          <Campo rotulo="Telefone">
            <Input value={v.telefone ?? ""} onChange={campo("telefone")} />
          </Campo>
          <Campo rotulo="WhatsApp">
            <Input value={v.whatsapp ?? ""} onChange={campo("whatsapp")} />
          </Campo>
          <Campo rotulo="CEP">
            <Input value={v.cep ?? ""} onChange={campo("cep")} />
          </Campo>
          <Campo rotulo="Endereço" className="sm:col-span-2">
            <Input value={v.endereco ?? ""} onChange={campo("endereco")} />
          </Campo>
          <Campo rotulo="Número">
            <Input value={v.numero ?? ""} onChange={campo("numero")} />
          </Campo>
          <Campo rotulo="Bairro">
            <Input value={v.bairro ?? ""} onChange={campo("bairro")} />
          </Campo>
          <Campo rotulo="Cidade">
            <Input value={v.cidade ?? ""} onChange={campo("cidade")} />
          </Campo>
          <Campo rotulo="UF">
            <Input value={v.estado ?? ""} onChange={campo("estado")} maxLength={2} placeholder="SP" />
          </Campo>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Responsável (dono da oficina)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <Campo rotulo="Nome do responsável">
            <Input value={v.responsavelNome ?? ""} onChange={campo("responsavelNome")} />
          </Campo>
          <Campo rotulo="CPF">
            <Input value={v.responsavelCpf ?? ""} onChange={campo("responsavelCpf")} />
          </Campo>
          <Campo rotulo="E-mail de acesso *">
            <Input
              type="email"
              value={v.emailDono}
              onChange={campo("emailDono")}
              placeholder="dono@oficina.com.br"
            />
          </Campo>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plano e limites</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <Campo rotulo="Plano *">
            <Select
              value={v.planoId}
              onValueChange={(planoId) => setV((a) => ({ ...a, planoId }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {planos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>
          <Campo rotulo="Primeiro vencimento *">
            <Input
              type="date"
              value={v.vencimento}
              onChange={campo("vencimento")}
            />
          </Campo>
          <Campo rotulo="Status inicial">
            <Select
              value={v.statusInicial ?? "ATIVO"}
              onValueChange={(s) =>
                setV((a) => ({ ...a, statusInicial: s as "ATIVO" | "PENDENTE" }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ATIVO">Ativo (pago)</SelectItem>
                <SelectItem value="PENDENTE">Pendente (em teste)</SelectItem>
              </SelectContent>
            </Select>
          </Campo>
          <Campo rotulo="Máx. de usuários (vazio = padrão do plano)">
            <Input
              inputMode="numeric"
              value={v.maxUsers != null ? String(v.maxUsers) : ""}
              onChange={(e) =>
                setV((a) => ({
                  ...a,
                  maxUsers: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
            />
          </Campo>
          <div className="flex items-end gap-6 sm:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={v.iaEnabled ?? true}
                onCheckedChange={(c) => setV((a) => ({ ...a, iaEnabled: Boolean(c) }))}
              />
              IA habilitada
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={v.biEnabled ?? true}
                onCheckedChange={(c) => setV((a) => ({ ...a, biEnabled: Boolean(c) }))}
              />
              BI habilitado
            </label>
          </div>
          <Campo rotulo="Observações" className="sm:col-span-3">
            <Textarea
              value={v.observacoes ?? ""}
              onChange={campo("observacoes")}
              rows={2}
            />
          </Campo>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={salvar} disabled={salvando}>
          {salvando ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Criar oficina
        </Button>
      </div>

      <Dialog
        open={Boolean(credenciais)}
        onOpenChange={(aberto) => {
          if (!aberto) {
            setCredenciais(null);
            router.push("/matriz/oficinas");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Oficina criada</DialogTitle>
            <DialogDescription>
              {credenciais?.senha
                ? "Anote/copie AGORA a senha provisória — ela não será exibida novamente. Envie ao dono e peça para trocar no primeiro acesso."
                : "O e-mail informado já tinha conta no sistema; ele foi vinculado como dono desta oficina com a senha que já usa."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 rounded-lg border bg-muted/40 p-4 font-mono text-sm">
            <p>E-mail: {credenciais?.email}</p>
            {credenciais?.senha ? <p>Senha provisória: {credenciais.senha}</p> : null}
          </div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={copiarCredenciais}>
              <Copy className="size-4" /> Copiar credenciais
            </Button>
            <Button
              onClick={() => {
                setCredenciais(null);
                router.push("/matriz/oficinas");
              }}
            >
              <Check className="size-4" /> Concluído
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
