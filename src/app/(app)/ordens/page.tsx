import type { Metadata } from "next";
import { EmConstrucao } from "@/shared/components/em-construcao";

export const metadata: Metadata = { title: "Ordens de Serviço" };

export default function Page() {
  return <EmConstrucao modulo="Ordens de Serviço" fase={3} />;
}
