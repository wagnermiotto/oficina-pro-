"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { formatarCpfCnpj, formatarCEP, formatarTelefone } from "@/shared/utils/documento";
import {
  salvarConfigAction,
  type ConfigFormValues,
} from "../actions/config-actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ConfigForm({ valoresIniciais }: { valoresIniciais: ConfigFormValues }) {
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);
  const [valores, setValores] = useState<ConfigFormValues>(valoresIniciais);

  function campo<K extends keyof ConfigFormValues>(
    chave: K,
    valor: ConfigFormValues[K]
  ) {
    setValores((v) => ({ ...v, [chave]: valor }));
  }

  async function salvar() {
    setSalvando(true);
    const resultado = await salvarConfigAction(valores);
    setSalvando(false);
    if (!resultado.ok) {
      toast.error(resultado.erro);
      return;
    }
    toast.success("Configurações salvas.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Dados da oficina</CardTitle>
          <CardDescription>
            Aparecem nos PDFs de OS e na página pública de aprovação.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Nome da oficina *</Label>
              <Input
                value={valores.nomeOficina}
                onChange={(e) => campo("nomeOficina", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Razão social</Label>
              <Input
                value={valores.razaoSocial ?? ""}
                onChange={(e) => campo("razaoSocial", e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>CNPJ</Label>
              <Input
                value={valores.cnpj ?? ""}
                onChange={(e) => campo("cnpj", formatarCpfCnpj(e.target.value))}
                placeholder="00.000.000/0000-00"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input
                value={valores.telefone ?? ""}
                onChange={(e) => campo("telefone", formatarTelefone(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>WhatsApp</Label>
              <Input
                value={valores.whatsapp ?? ""}
                onChange={(e) => campo("whatsapp", formatarTelefone(e.target.value))}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-[8rem_1fr_5rem]">
            <div className="space-y-1.5">
              <Label>CEP</Label>
              <Input
                value={valores.cep ?? ""}
                onChange={(e) => campo("cep", formatarCEP(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Endereço</Label>
              <Input
                value={valores.endereco ?? ""}
                onChange={(e) => campo("endereco", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nº</Label>
              <Input
                value={valores.numero ?? ""}
                onChange={(e) => campo("numero", e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_5rem]">
            <div className="space-y-1.5">
              <Label>Bairro</Label>
              <Input
                value={valores.bairro ?? ""}
                onChange={(e) => campo("bairro", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Cidade</Label>
              <Input
                value={valores.cidade ?? ""}
                onChange={(e) => campo("cidade", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>UF</Label>
              <Input
                maxLength={2}
                value={valores.estado ?? ""}
                onChange={(e) => campo("estado", e.target.value.toUpperCase())}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recebimento por PIX</CardTitle>
          <CardDescription>
            Preencha para gerar o “PIX copia e cola” automático em cada OS — sem
            taxa e sem cadastro em gateway.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>Chave PIX</Label>
            <Input
              value={valores.pixChave ?? ""}
              onChange={(e) => campo("pixChave", e.target.value)}
              placeholder="CPF/CNPJ, e-mail, telefone ou chave aleatória"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Nome do recebedor</Label>
              <Input
                value={valores.pixNomeRecebedor ?? ""}
                onChange={(e) => campo("pixNomeRecebedor", e.target.value)}
                maxLength={25}
                placeholder="Como aparece na conta (máx. 25)"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Cidade do recebedor</Label>
              <Input
                value={valores.pixCidade ?? ""}
                onChange={(e) => campo("pixCidade", e.target.value)}
                maxLength={15}
                placeholder="Ex.: SAO PAULO (máx. 15)"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Padrões operacionais</CardTitle>
          <CardDescription>Valores sugeridos em novas ordens de serviço.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Valor da hora (R$)</Label>
            <Input
              value={String(valores.valorHoraPadrao ?? "")}
              onChange={(e) => campo("valorHoraPadrao", e.target.value)}
              inputMode="decimal"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Imposto padrão (%)</Label>
            <Input
              value={String(valores.impostoPadraoPercent ?? "")}
              onChange={(e) => campo("impostoPadraoPercent", e.target.value)}
              inputMode="decimal"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Garantia padrão (dias)</Label>
            <Input
              value={String(valores.garantiaPadraoDias ?? "")}
              onChange={(e) => campo("garantiaPadraoDias", e.target.value)}
              inputMode="numeric"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={salvar} disabled={salvando}>
          {salvando ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Salvar configurações
        </Button>
      </div>
    </div>
  );
}
