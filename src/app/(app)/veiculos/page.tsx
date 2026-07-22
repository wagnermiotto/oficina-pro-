import type { Metadata } from "next";
import { EmConstrucao } from "@/shared/components/em-construcao";

export const metadata: Metadata = { title: "Veículos" };

export default function Page() {
  return <EmConstrucao modulo="Veículos" fase={2} />;
}
