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

const config = {
  oficinas: { label: "Oficinas", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function PlanoChart({
  dados,
}: {
  dados: { nome: string; oficinas: number }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Oficinas por plano</CardTitle>
        <CardDescription>Distribuição da base por plano contratado</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-56 w-full">
          <BarChart data={dados} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid horizontal={false} strokeDasharray="3 3" />
            <XAxis type="number" allowDecimals={false} hide />
            <YAxis
              dataKey="nome"
              type="category"
              tickLine={false}
              axisLine={false}
              width={100}
              tick={{ fontSize: 12 }}
            />
            <ChartTooltip content={<ChartTooltipContent hideLabel={false} />} />
            <Bar dataKey="oficinas" fill="var(--chart-1)" radius={[0, 4, 4, 0]} barSize={18} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
