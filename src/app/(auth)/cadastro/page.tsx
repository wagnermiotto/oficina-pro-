import type { Metadata } from "next";
import { CadastroForm } from "@/modules/auth/components/cadastro-form";

export const metadata: Metadata = { title: "Criar conta" };

export default function CadastroPage() {
  return <CadastroForm />;
}
