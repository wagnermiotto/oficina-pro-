import { redirect } from "next/navigation";
import { getSessao } from "@/shared/lib/session";

export default async function HomePage() {
  const sessao = await getSessao();
  if (!sessao) redirect("/login");
  if (!sessao.session.activeOrganizationId) redirect("/onboarding");
  redirect("/dashboard");
}
