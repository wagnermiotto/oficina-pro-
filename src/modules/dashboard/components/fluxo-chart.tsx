"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
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
import type { PontoFluxo } from "../types";

const config = {
  receitas: { label: "Receitas", color: "var(--chart-5)" },
  despesas: { label: "Despesas", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function FluxoChart({ dados }: { dados: PontoFluxo[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Fluxo de caixa</CardTitle>
        <CardDescription>Receitas × despesas pagas nos últimos 14 dias</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-64 w-full">
          <AreaChart data={dados} margin={{ left: 8, right: 8 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="dia"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={24}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={70}
              tickFormatter={(v: number) =>
                v >= 1000 ? `R$ ${(v / 1000).toFixed(1)}k` : `R$ ${v}`
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
                        {config[name as keyof typeof config]?.label ?? name}
                      </span>
                      <span className="font-mono font-medium">
                        {formatarMoeda(Number(value))}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <defs>
              <linearGradient id="fillReceitas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-5)" stopOpacity={0.5} />
                <stop offset="95%" stopColor="var(--chart-5)" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="fillDespesas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.5} />
                <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <Area
              dataKey="receitas"
              type="monotone"
              fill="url(#fillReceitas)"
              stroke="var(--chart-5)"
              strokeWidth={2}
            />
            <Area
              dataKey="despesas"
              type="monotone"
              fill="url(#fillDespesas)"
              stroke="var(--chart-1)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
