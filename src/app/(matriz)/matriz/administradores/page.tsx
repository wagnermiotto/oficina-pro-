import type { Metadata } from "next";
import { format } from "date-fns";
import { requireSuperAdmin } from "@/shared/lib/session";
import { listarAdministradores } from "@/modules/plataforma/services/matriz-service";
import { AdministradoresConteudo } from "@/modules/plataforma/components/administradores-conteudo";

export const metadata: Metadata = { title: "Administradores · Matriz" };

export default async function AdministradoresPage() {
  const ctx = await requireSuperAdmin();
  const admins = await listarAdministradores();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Administradores da plataforma</h1>
        <p className="text-sm text-muted-foreground">
          Quem pode acessar a Matriz. Para quem não está nesta lista, a Matriz
          simplesmente não existe (404).
        </p>
      </div>
      <AdministradoresConteudo
        meuUserId={ctx.usuario.id}
        admins={admins.map((a) => ({
          id: a.id,
          userId: a.userId,
          nome: a.nome,
          email: a.email,
          desde: format(a.desde, "dd/MM/yyyy"),
        }))}
      />
    </div>
  );
}
