import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getSessao } from "@/shared/lib/session";
import { tenantDb } from "@/shared/lib/tenant-db";
import { prisma } from "@/shared/lib/prisma";
import { obterOS } from "@/modules/ordens/services/os-service";
import { OSPdf } from "@/modules/ordens/pdf/os-pdf";
import { paraNumero } from "@/shared/utils/moeda";
import { gerarPixCopiaECola } from "@/shared/utils/pix";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessao = await getSessao();
  const oficinaId = sessao?.session.activeOrganizationId;
  if (!oficinaId) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const { id } = await params;
  const [os, oficina] = await Promise.all([
    obterOS(tenantDb(oficinaId), id),
    prisma.organization.findUnique({
      where: { id: oficinaId },
      select: { name: true, config: true },
    }),
  ]);
  if (!os) {
    return NextResponse.json({ erro: "OS não encontrada." }, { status: 404 });
  }

  const totalOS = paraNumero(os.total);
  const pixCodigo =
    oficina?.config?.pixChave && totalOS > 0
      ? gerarPixCopiaECola({
          chave: oficina.config.pixChave,
          nomeRecebedor: oficina.config.pixNomeRecebedor ?? "",
          cidade: oficina.config.pixCidade ?? "",
          valor: totalOS,
          txid: `OS${String(os.numero).padStart(4, "0")}`,
        })
      : null;

  const buffer = await renderToBuffer(
    OSPdf({
      os,
      oficina: {
        nome: oficina?.name ?? "Oficina",
        telefone: oficina?.config?.telefone,
        cidade: oficina?.config?.cidade,
        estado: oficina?.config?.estado,
        cnpj: oficina?.config?.cnpj,
      },
      pixCodigo,
    })
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="os-${String(os.numero).padStart(4, "0")}.pdf"`,
    },
  });
}
