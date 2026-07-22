import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { formatarMoeda, paraNumero } from "@/shared/utils/moeda";
import { formatarPlaca } from "@/shared/utils/placa";
import { STATUS_OS_LABEL } from "@/shared/constants/os";
import { SISTEMA_LABEL, URGENCIA_LABEL } from "../schemas/os-schemas";
import type { obterOS } from "../services/os-service";

type OSCompleta = NonNullable<Awaited<ReturnType<typeof obterOS>>>;

interface DadosOficina {
  nome: string;
  telefone?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cnpj?: string | null;
}

const AZUL = "#1e3a5f";
const LARANJA = "#f97316";
const CINZA = "#64748b";
const BORDA = "#e2e8f0";

const estilos = StyleSheet.create({
  pagina: { padding: 32, fontSize: 9, fontFamily: "Helvetica", color: "#0f172a" },
  cabecalho: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 2,
    borderBottomColor: LARANJA,
    paddingBottom: 10,
    marginBottom: 14,
  },
  nomeOficina: { fontSize: 16, fontFamily: "Helvetica-Bold", color: AZUL },
  numeroOS: { fontSize: 14, fontFamily: "Helvetica-Bold", color: LARANJA },
  subtitulo: { color: CINZA, fontSize: 8, marginTop: 2 },
  secao: { marginBottom: 12 },
  tituloSecao: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: AZUL,
    marginBottom: 5,
    textTransform: "uppercase",
  },
  linhaDupla: { flexDirection: "row", gap: 16 },
  bloco: { flex: 1, borderWidth: 1, borderColor: BORDA, borderRadius: 4, padding: 8 },
  rotulo: { color: CINZA, fontSize: 7, textTransform: "uppercase" },
  valorCampo: { fontSize: 9, marginBottom: 4 },
  tabela: { borderWidth: 1, borderColor: BORDA, borderRadius: 4 },
  linhaTabela: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BORDA,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  cabecalhoTabela: { backgroundColor: "#f1f5f9", fontFamily: "Helvetica-Bold" },
  ultimaLinha: { borderBottomWidth: 0 },
  colDescricao: { flex: 3 },
  colPequena: { flex: 1, textAlign: "right" },
  totais: {
    marginTop: 8,
    alignSelf: "flex-end",
    width: 220,
    borderWidth: 1,
    borderColor: BORDA,
    borderRadius: 4,
    padding: 8,
  },
  linhaTotal: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  totalFinal: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: BORDA,
    paddingTop: 4,
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
  },
  rodape: {
    position: "absolute",
    bottom: 24,
    left: 32,
    right: 32,
    borderTopWidth: 1,
    borderTopColor: BORDA,
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    color: CINZA,
    fontSize: 7,
  },
  assinaturas: { flexDirection: "row", gap: 24, marginTop: 40 },
  campoAssinatura: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: "#94a3b8",
    paddingTop: 4,
    textAlign: "center",
    color: CINZA,
  },
});

export function OSPdf({ os, oficina }: { os: OSCompleta; oficina: DadosOficina }) {
  const numero = String(os.numero).padStart(4, "0");
  const subtotal = paraNumero(os.totalServicos) + paraNumero(os.totalPecas);

  return (
    <Document title={`OS ${numero}`}>
      <Page size="A4" style={estilos.pagina}>
        <View style={estilos.cabecalho}>
          <View>
            <Text style={estilos.nomeOficina}>{oficina.nome}</Text>
            <Text style={estilos.subtitulo}>
              {[
                oficina.cnpj ? `CNPJ ${oficina.cnpj}` : null,
                oficina.telefone,
                [oficina.cidade, oficina.estado].filter(Boolean).join("/"),
              ]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={estilos.numeroOS}>OS Nº {numero}</Text>
            <Text style={estilos.subtitulo}>
              Status: {STATUS_OS_LABEL[os.status]}
            </Text>
            <Text style={estilos.subtitulo}>
              Entrada: {os.dataEntrada.toLocaleDateString("pt-BR")}
              {os.dataPrevista
                ? ` · Previsão: ${os.dataPrevista.toLocaleDateString("pt-BR")}`
                : ""}
            </Text>
          </View>
        </View>

        <View style={[estilos.secao, estilos.linhaDupla]}>
          <View style={estilos.bloco}>
            <Text style={estilos.rotulo}>Cliente</Text>
            <Text style={estilos.valorCampo}>{os.cliente.nome}</Text>
            <Text style={estilos.rotulo}>Contato</Text>
            <Text style={estilos.valorCampo}>
              {os.cliente.whatsapp ?? os.cliente.telefone ?? "—"}
            </Text>
          </View>
          <View style={estilos.bloco}>
            <Text style={estilos.rotulo}>Veículo</Text>
            <Text style={estilos.valorCampo}>
              {[os.veiculo.marca, os.veiculo.modelo].filter(Boolean).join(" ")} ·{" "}
              {formatarPlaca(os.veiculo.placa)}
            </Text>
            <Text style={estilos.rotulo}>Problema relatado</Text>
            <Text style={estilos.valorCampo}>{os.descricaoProblema ?? "—"}</Text>
          </View>
        </View>

        {os.diagnostico.length > 0 ? (
          <View style={estilos.secao}>
            <Text style={estilos.tituloSecao}>Diagnóstico técnico</Text>
            <View style={estilos.tabela}>
              <View style={[estilos.linhaTabela, estilos.cabecalhoTabela]}>
                <Text style={{ flex: 1 }}>Sistema</Text>
                <Text style={estilos.colDescricao}>Descrição</Text>
                <Text style={estilos.colPequena}>Urgência</Text>
              </View>
              {os.diagnostico.map((item, i) => (
                <View
                  key={item.id}
                  style={[
                    estilos.linhaTabela,
                    ...(i === os.diagnostico.length - 1 ? [estilos.ultimaLinha] : []),
                  ]}
                >
                  <Text style={{ flex: 1 }}>{SISTEMA_LABEL[item.sistema]}</Text>
                  <Text style={estilos.colDescricao}>{item.descricao}</Text>
                  <Text style={estilos.colPequena}>
                    {URGENCIA_LABEL[item.urgencia]}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {os.servicosOS.length > 0 ? (
          <View style={estilos.secao}>
            <Text style={estilos.tituloSecao}>Serviços</Text>
            <View style={estilos.tabela}>
              <View style={[estilos.linhaTabela, estilos.cabecalhoTabela]}>
                <Text style={estilos.colDescricao}>Descrição</Text>
                <Text style={estilos.colPequena}>Situação</Text>
                <Text style={estilos.colPequena}>Valor</Text>
              </View>
              {os.servicosOS.map((item, i) => (
                <View
                  key={item.id}
                  style={[
                    estilos.linhaTabela,
                    ...(i === os.servicosOS.length - 1 ? [estilos.ultimaLinha] : []),
                  ]}
                >
                  <Text style={estilos.colDescricao}>{item.descricao}</Text>
                  <Text style={estilos.colPequena}>
                    {item.status === "RECUSADO"
                      ? "Recusado"
                      : item.status === "APROVADO"
                        ? "Aprovado"
                        : "Pendente"}
                  </Text>
                  <Text style={estilos.colPequena}>
                    {formatarMoeda(paraNumero(item.valor))}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {os.pecasOS.length > 0 ? (
          <View style={estilos.secao}>
            <Text style={estilos.tituloSecao}>Peças</Text>
            <View style={estilos.tabela}>
              <View style={[estilos.linhaTabela, estilos.cabecalhoTabela]}>
                <Text style={estilos.colDescricao}>Descrição</Text>
                <Text style={estilos.colPequena}>Qtd.</Text>
                <Text style={estilos.colPequena}>Unitário</Text>
                <Text style={estilos.colPequena}>Total</Text>
              </View>
              {os.pecasOS.map((item, i) => (
                <View
                  key={item.id}
                  style={[
                    estilos.linhaTabela,
                    ...(i === os.pecasOS.length - 1 ? [estilos.ultimaLinha] : []),
                  ]}
                >
                  <Text style={estilos.colDescricao}>{item.descricao}</Text>
                  <Text style={estilos.colPequena}>
                    {paraNumero(item.quantidade)}
                  </Text>
                  <Text style={estilos.colPequena}>
                    {formatarMoeda(paraNumero(item.valorUnitario))}
                  </Text>
                  <Text style={estilos.colPequena}>
                    {formatarMoeda(
                      paraNumero(item.valorUnitario) * paraNumero(item.quantidade)
                    )}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={estilos.totais}>
          <View style={estilos.linhaTotal}>
            <Text>Serviços</Text>
            <Text>{formatarMoeda(paraNumero(os.totalServicos))}</Text>
          </View>
          <View style={estilos.linhaTotal}>
            <Text>Peças</Text>
            <Text>{formatarMoeda(paraNumero(os.totalPecas))}</Text>
          </View>
          <View style={estilos.linhaTotal}>
            <Text>Subtotal</Text>
            <Text>{formatarMoeda(subtotal)}</Text>
          </View>
          <View style={estilos.linhaTotal}>
            <Text>Desconto</Text>
            <Text>− {formatarMoeda(paraNumero(os.descontoValor))}</Text>
          </View>
          <View style={estilos.linhaTotal}>
            <Text>Impostos ({paraNumero(os.impostoPercent)}%)</Text>
            <Text>
              {formatarMoeda(
                paraNumero(os.total) -
                  (subtotal - Math.min(paraNumero(os.descontoValor), subtotal))
              )}
            </Text>
          </View>
          <View style={estilos.totalFinal}>
            <Text>TOTAL</Text>
            <Text>{formatarMoeda(paraNumero(os.total))}</Text>
          </View>
        </View>

        <View style={estilos.assinaturas}>
          <Text style={estilos.campoAssinatura}>Responsável pela oficina</Text>
          <Text style={estilos.campoAssinatura}>{os.cliente.nome}</Text>
        </View>

        <View style={estilos.rodape} fixed>
          <Text>
            Garantia: {os.garantiaDias} dias após a entrega.
          </Text>
          <Text>
            Documento gerado em {new Date().toLocaleDateString("pt-BR")} — OficinaPro
          </Text>
        </View>
      </Page>
    </Document>
  );
}
