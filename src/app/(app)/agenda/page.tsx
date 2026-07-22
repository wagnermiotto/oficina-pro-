import type { Metadata } from "next";
import { EmConstrucao } from "@/shared/components/em-construcao";

export const metadata: Metadata = { title: "Agenda" };

export default function Page() {
  return <EmConstrucao modulo="Agenda" fase={6} />;
}
