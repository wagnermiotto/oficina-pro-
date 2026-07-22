import type { Metadata } from "next";
import { EmConstrucao } from "@/shared/components/em-construcao";

export const metadata: Metadata = { title: "Clientes" };

export default function Page() {
  return <EmConstrucao modulo="Clientes" fase={2} />;
}
