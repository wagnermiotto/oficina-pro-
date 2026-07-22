"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
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
import { FLUXO_STATUS_OS, STATUS_OS_LABEL } from "@/shared/constants/os";
import type { ResumoDashboard } from "../types";

const config = {
  quantidade: { label: "Ordens", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function StatusChart({
  dados,
}: {
  dados: ResumoDashboard["osPorStatus"];
}) {
  const porStatus = new Map(dados.map((d) => [d.status, d.quantidade]));
  const linhas = FLUXO_STATUS_OS.map((status) => ({
    nome: STATUS_OS_LABEL[status],
    quantidade: porStatus.get(status) ?? 0,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ordens por status</CardTitle>
        <CardDescription>Situação atual do fluxo de trabalho</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-64 w-full">
          <BarChart data={linhas} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid horizontal={false} strokeDasharray="3 3" />
            <XAxis type="number" hide />
            <YAxis
              dataKey="nome"
              type="category"
              tickLine={false}
              axisLine={false}
              width={150}
              tick={{ fontSize: 12 }}
            />
            <ChartTooltip content={<ChartTooltipContent hideLabel={false} />} />
            <Bar
              dataKey="quantidade"
              fill="var(--chart-2)"
              radius={[0, 4, 4, 0]}
              barSize={16}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
