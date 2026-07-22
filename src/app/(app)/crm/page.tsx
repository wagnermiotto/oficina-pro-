import type { Metadata } from "next";
import { EmConstrucao } from "@/shared/components/em-construcao";

export const metadata: Metadata = { title: "CRM" };

export default function Page() {
  return <EmConstrucao modulo="CRM" fase={6} />;
}
