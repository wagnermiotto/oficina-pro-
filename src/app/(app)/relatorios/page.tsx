import type { Metadata } from "next";
import { EmConstrucao } from "@/shared/components/em-construcao";

export const metadata: Metadata = { title: "Relatórios" };

export default function Page() {
  return <EmConstrucao modulo="Relatórios" fase={5} />;
}
