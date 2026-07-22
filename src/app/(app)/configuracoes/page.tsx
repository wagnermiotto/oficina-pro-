import type { Metadata } from "next";
import { EmConstrucao } from "@/shared/components/em-construcao";

export const metadata: Metadata = { title: "Configurações" };

export default function Page() {
  return <EmConstrucao modulo="Configurações" fase={7} />;
}
