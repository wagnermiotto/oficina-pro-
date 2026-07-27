import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";
import { getSessao, temPermissaoDireta } from "@/shared/lib/session";
import { tenantDb } from "@/shared/lib/tenant-db";
import { gerarCSV, numeroCSV } from "@/shared/utils/csv";
import { formatarPlaca } from "@/shared/utils/placa";
import { paraNumero } from "@/shared/utils/moeda";
import { listarLancamentosParaExportar } from "@/modules/financeiro/services/financeiro-service";
import { STATUS_OS_LABEL } from "@/shared/constants/os";

function parseData(texto: string | null): Date | undefined {
  if (!texto) return undefined;
  const data = new Date(`${texto}T12:00:00`);
  return Number.isNaN(data.getTime()) ? undefined : data;
}

/**
 * Exporta relatórios em CSV (Excel-compatível).
 * ?tipo=lancamentos|ordens|estoque|clientes&de=YYYY-MM-DD&ate=YYYY-MM-DD
 */
export async function GET(request: NextRequest) {
  const sessao = await getSessao();
  const oficinaId = sessao?.session.activeOrganizationId;
  if (!oficinaId) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }
  const autorizado = await temPermissaoDireta(
    oficinaId,
    sessao.user.id,
    "relatorios",
    "EXPORTAR"
  );
  if (!autorizado) {
    return NextResponse.json({ erro: "Sem permissão." }, { status: 403 });
  }
  const db = tenantDb(oficinaId);

  const url = request.nextUrl;
  const tipo = url.searchParams.get("tipo") ?? "lancamentos";
  const de = parseData(url.searchParams.get("de"));
  const ate = parseData(url.searchParams.get("ate"));

  let csv: string;
  let nomeArquivo: string;

  switch (tipo) {
    case "lancamentos": {
      const lancamentos = await listarLancamentosParaExportar(db, { de, ate });
      csv = gerarCSV(
        ["Tipo", "Descrição", "Valor (R$)", "Status", "Vencimento", "Pago em", "Forma", "Vínculo"],
        lancamentos.map((l) => [
          l.tipo === "RECEITA" ? "Receita" : "Despesa",
          l.descricao,
          numeroCSV(paraNumero(l.valor)),
          l.status,
          l.vencimento ? format(l.vencimento, "dd/MM/yyyy") : "",
          l.pagoEm ? format(l.pagoEm, "dd/MM/yyyy") : "",
          l.formaPagamento ?? "",
          l.ordemServico
            ? `OS ${l.ordemServico.numero}`
            : (l.cliente?.nome ?? l.fornecedor?.nome ?? ""),
        ])
      );
      nomeArquivo = "financeiro";
      break;
    }
    case "ordens": {
      const ordens = await db.ordemServico.findMany({
        where: {
          ...(de || ate
            ? {
                dataEntrada: {
                  ...(de ? { gte: de } : {}),
                  ...(ate ? { lte: ate } : {}),
                },
              }
            : {}),
        },
        orderBy: { numero: "asc" },
        take: 5000,
        include: {
          cliente: { select: { nome: true } },
          veiculo: { select: { placa: true, marca: true, modelo: true } },
        },
      });
      csv = gerarCSV(
        ["Nº", "Cliente", "Veículo", "Placa", "Status", "Entrada", "Total (R$)"],
        ordens.map((os) => [
          os.numero,
          os.cliente.nome,
          [os.veiculo.marca, os.veiculo.modelo].filter(Boolean).join(" "),
          formatarPlaca(os.veiculo.placa),
          STATUS_OS_LABEL[os.status],
          format(os.dataEntrada, "dd/MM/yyyy"),
          numeroCSV(paraNumero(os.total)),
        ])
      );
      nomeArquivo = "ordens-de-servico";
      break;
    }
    case "estoque": {
      const pecas = await db.peca.findMany({
        where: { ativo: true },
        orderBy: { nome: "asc" },
        take: 5000,
        include: {
          categoria: { select: { nome: true } },
          fornecedor: { select: { nome: true } },
        },
      });
      csv = gerarCSV(
        ["Peça", "Código", "Categoria", "Fornecedor", "Saldo", "Unidade", "Mínimo", "Custo (R$)", "Venda (R$)", "Localização"],
        pecas.map((p) => [
          p.nome,
          p.codigo ?? "",
          p.categoria?.nome ?? "",
          p.fornecedor?.nome ?? "",
          paraNumero(p.quantidade),
          p.unidade,
          paraNumero(p.estoqueMinimo),
          numeroCSV(paraNumero(p.precoCusto)),
          numeroCSV(paraNumero(p.precoVenda)),
          p.localizacao ?? "",
        ])
      );
      nomeArquivo = "estoque";
      break;
    }
    case "clientes": {
      const clientes = await db.cliente.findMany({
        orderBy: { nome: "asc" },
        take: 5000,
        include: { _count: { select: { veiculos: true, ordens: true } } },
      });
      csv = gerarCSV(
        ["Nome", "Tipo", "CPF/CNPJ", "Telefone", "WhatsApp", "E-mail", "Cidade", "UF", "Veículos", "Ordens"],
        clientes.map((c) => [
          c.nome,
          c.tipo === "JURIDICA" ? "PJ" : "PF",
          c.cpfCnpj ?? "",
          c.telefone ?? "",
          c.whatsapp ?? "",
          c.email ?? "",
          c.cidade ?? "",
          c.estado ?? "",
          c._count.veiculos,
          c._count.ordens,
        ])
      );
      nomeArquivo = "clientes";
      break;
    }
    default:
      return NextResponse.json({ erro: "Tipo de relatório inválido." }, { status: 400 });
  }

  const dataHoje = format(new Date(), "yyyy-MM-dd");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nomeArquivo}-${dataHoje}.csv"`,
    },
  });
}
