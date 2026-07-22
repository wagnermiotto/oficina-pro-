"use client";

import { useState } from "react";
import { Boxes, Download, Users, Wallet, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";
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

const ICONES: Record<string, LucideIcon> = {
  lancamentos: Wallet,
  ordens: Wrench,
  estoque: Boxes,
  clientes: Users,
};

interface RelatorioCardProps {
  titulo: string;
  descricao: string;
  tipo: string;
  comPeriodo?: boolean;
}

export function RelatorioCard({
  titulo,
  descricao,
  tipo,
  comPeriodo = true,
}: RelatorioCardProps) {
  const Icone = ICONES[tipo] ?? Download;
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");

  const params = new URLSearchParams({ tipo });
  if (de) params.set("de", de);
  if (ate) params.set("ate", ate);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/20">
            <Icone className="size-5" />
          </div>
          <div>
            <CardTitle>{titulo}</CardTitle>
            <CardDescription>{descricao}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {comPeriodo && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>De</Label>
              <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Até</Label>
              <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
            </div>
          </div>
        )}
        <Button asChild variant="outline" className="w-full">
          <a href={`/relatorios/exportar?${params.toString()}`} download>
            <Download className="size-4" /> Exportar CSV (Excel)
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
