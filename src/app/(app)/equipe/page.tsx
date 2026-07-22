import type { Metadata } from "next";
import { EmConstrucao } from "@/shared/components/em-construcao";

export const metadata: Metadata = { title: "Equipe" };

export default function Page() {
  return <EmConstrucao modulo="Equipe" fase={7} />;
}
