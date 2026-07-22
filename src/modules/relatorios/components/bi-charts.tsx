"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Medal } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatarMoeda } from "@/shared/utils/moeda";
import type { ResumoBI } from "../services/bi-service";

const configMensal = {
  receitas: { label: "Receitas", color: "var(--chart-5)" },
  despesas: { label: "Despesas", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function BIConteudo({ resumo }: { resumo: ResumoBI }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Receitas × despesas — últimos 6 meses</CardTitle>
          <CardDescription>Valores efetivamente pagos/recebidos</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={configMensal} className="h-64 w-full">
            <BarChart data={resumo.mensal}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="mes" tickLine={false} axisLine={false} />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={70}
                tickFormatter={(v: number) =>
                  v >= 1000 ? `R$ ${(v / 1000).toFixed(0)}k` : `R$ ${v}`
                }
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name, item) => (
                      <div className="flex w-full items-center justify-between gap-4">
                        <span className="flex items-center gap-1.5">
                          <span
                            className="size-2.5 rounded-[2px]"
                            style={{ background: item.color }}
                          />
                          {configMensal[name as keyof typeof configMensal]?.label}
                        </span>
                        <span className="font-mono font-medium">
                          {formatarMoeda(Number(value))}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <Bar dataKey="receitas" fill="var(--chart-5)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="despesas" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Serviços mais vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            {resumo.topServicos.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Sem dados ainda.
              </p>
            ) : (
              <ol className="space-y-2">
                {resumo.topServicos.map((servico, indice) => (
                  <li key={servico.nome} className="flex items-center gap-3 text-sm">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-bold text-primary">
                      {indice + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{servico.nome}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {servico.quantidade}×
                    </span>
                    <span className="shrink-0 font-mono text-xs">
                      {formatarMoeda(servico.total)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Peças mais utilizadas</CardTitle>
          </CardHeader>
          <CardContent>
            {resumo.topPecas.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Sem dados ainda.
              </p>
            ) : (
              <ol className="space-y-2">
                {resumo.topPecas.map((peca, indice) => (
                  <li key={peca.nome} className="flex items-center gap-3 text-sm">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-bold text-primary">
                      {indice + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{peca.nome}</span>
                    <span className="shrink-0 font-mono text-xs">
                      {peca.quantidade} un
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ranking de mecânicos</CardTitle>
            <CardDescription>Por receita em OS finalizadas</CardDescription>
          </CardHeader>
          <CardContent>
            {resumo.rankingMecanicos.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Sem OS finalizadas com mecânico atribuído.
              </p>
            ) : (
              <ol className="space-y-2">
                {resumo.rankingMecanicos.map((mecanico, indice) => (
                  <li key={mecanico.nome} className="flex items-center gap-3 text-sm">
                    <Medal
                      className={
                        indice === 0
                          ? "size-4 shrink-0 text-destaque"
                          : "size-4 shrink-0 text-muted-foreground"
                      }
                    />
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {mecanico.nome}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {mecanico.ordens} OS
                    </span>
                    <span className="shrink-0 font-mono text-xs">
                      {formatarMoeda(mecanico.receita)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
