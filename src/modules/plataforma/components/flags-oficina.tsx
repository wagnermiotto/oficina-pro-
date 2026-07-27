"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { salvarRecursoOficinaAction } from "../actions/matriz-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

interface Props {
  oficinaId: string;
  /** Valores efetivos atuais (override da oficina, se houver). */
  flags: { chave: string; valor: string }[];
}

/**
 * Feature flags POR OFICINA (override do plano). Desligar/ligar aqui vale só
 * para esta oficina, independente do plano contratado.
 */
export function FlagsOficina({ oficinaId, flags }: Props) {
  const router = useRouter();
  const [salvando, setSalvando] = useState<string | null>(null);
  const mapa = new Map(flags.map((f) => [f.chave, f.valor]));
  const [maxUsers, setMaxUsers] = useState(mapa.get("max_users") ?? "");

  async function salvar(chave: string, valor: string | null) {
    setSalvando(chave);
    const resultado = await salvarRecursoOficinaAction(oficinaId, chave, valor);
    setSalvando(null);
    if (!resultado.ok) {
      toast.error(resultado.erro);
      return;
    }
    toast.success("Recurso atualizado.");
    router.refresh();
  }

  function ToggleFlag({ chave, rotulo }: { chave: string; rotulo: string }) {
    const valor = mapa.get(chave);
    const ligado = valor === undefined ? true : valor === "true";
    return (
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <Label className="font-medium">{rotulo}</Label>
          <p className="text-xs text-muted-foreground">
            {valor === undefined ? "Padrão do plano" : "Definido para esta oficina"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {salvando === chave ? <Loader2 className="size-4 animate-spin" /> : null}
          <Switch
            checked={ligado}
            onCheckedChange={(c) => salvar(chave, String(Boolean(c)))}
            disabled={salvando !== null}
          />
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recursos desta oficina</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ToggleFlag chave="ia_enabled" rotulo="Inteligência Artificial" />
        <ToggleFlag chave="bi_enabled" rotulo="BI / Relatórios avançados" />
        <div className="flex items-end gap-2 rounded-lg border p-3">
          <div className="flex-1 space-y-1.5">
            <Label>Máx. de usuários (vazio = padrão do plano)</Label>
            <Input
              inputMode="numeric"
              value={maxUsers}
              onChange={(e) => setMaxUsers(e.target.value.replace(/\D/g, ""))}
              placeholder="ex.: 10"
            />
          </div>
          <Button
            variant="outline"
            disabled={salvando !== null}
            onClick={() => salvar("max_users", maxUsers ? maxUsers : null)}
          >
            {salvando === "max_users" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : null}
            Aplicar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
