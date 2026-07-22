import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/**
 * Módulo de IA (feature-flag): só ativa quando ANTHROPIC_API_KEY está
 * configurada no .env. Sem a chave, a UI oculta os recursos de IA.
 */

export function iaDisponivel(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const globalForAnthropic = globalThis as unknown as { anthropic?: Anthropic };

function clienteAnthropic(): Anthropic {
  if (!globalForAnthropic.anthropic) {
    globalForAnthropic.anthropic = new Anthropic();
  }
  return globalForAnthropic.anthropic;
}

const MODELO = "claude-opus-4-8";

async function completar(system: string, prompt: string): Promise<string> {
  const cliente = clienteAnthropic();
  const resposta = await cliente.messages.create({
    model: MODELO,
    max_tokens: 2048,
    thinking: { type: "adaptive" },
    system,
    messages: [{ role: "user", content: prompt }],
  });
  return resposta.content
    .filter((bloco): bloco is Anthropic.TextBlock => bloco.type === "text")
    .map((bloco) => bloco.text)
    .join("\n")
    .trim();
}

export interface DadosDiagnosticoIA {
  veiculo: string;
  quilometragem: number | null;
  problemaRelatado: string | null;
  historicoServicos: string[];
}

/** Sugere itens de diagnóstico a partir do problema relatado. */
export async function gerarSugestaoDiagnostico(
  dados: DadosDiagnosticoIA
): Promise<string> {
  const system =
    "Você é um mecânico-chefe experiente de uma oficina brasileira de carros e motos. " +
    "Responda sempre em português do Brasil, de forma objetiva e organizada. " +
    "Sugira hipóteses de diagnóstico plausíveis, itens a inspecionar e urgência, " +
    "mas deixe claro que a confirmação exige inspeção física do veículo.";

  const prompt = [
    `Veículo: ${dados.veiculo}`,
    dados.quilometragem != null
      ? `Quilometragem: ${dados.quilometragem.toLocaleString("pt-BR")} km`
      : null,
    `Problema relatado pelo cliente: ${dados.problemaRelatado ?? "não informado"}`,
    dados.historicoServicos.length > 0
      ? `Histórico recente de serviços: ${dados.historicoServicos.join("; ")}`
      : null,
    "",
    "Liste (1) as hipóteses de diagnóstico mais prováveis em ordem de probabilidade, " +
      "(2) o sistema do veículo de cada uma (motor, freios, suspensão etc.), " +
      "(3) a urgência estimada e (4) o que inspecionar para confirmar. Seja conciso.",
  ]
    .filter((linha): linha is string => linha !== null)
    .join("\n");

  return completar(system, prompt);
}

export interface DadosMensagemIA {
  cliente: string;
  veiculo: string;
  numeroOS: string;
  totalFormatado: string;
  linkAprovacao: string | null;
  itens: string[];
}

/** Gera mensagem de WhatsApp para enviar o orçamento ao cliente. */
export async function gerarMensagemWhatsApp(
  dados: DadosMensagemIA
): Promise<string> {
  const system =
    "Você escreve mensagens de WhatsApp para clientes de uma oficina mecânica brasileira. " +
    "Tom cordial e profissional, direto ao ponto, sem emojis em excesso (no máximo 2). " +
    "Responda apenas com o texto da mensagem, pronto para copiar e colar.";

  const prompt = [
    `Cliente: ${dados.cliente}`,
    `Veículo: ${dados.veiculo}`,
    `OS: ${dados.numeroOS}`,
    `Valor total do orçamento: ${dados.totalFormatado}`,
    dados.itens.length > 0 ? `Itens do orçamento: ${dados.itens.join("; ")}` : null,
    dados.linkAprovacao
      ? `Link de aprovação on-line: ${dados.linkAprovacao}`
      : null,
    "",
    "Escreva a mensagem avisando que o orçamento está pronto e pedindo a aprovação.",
  ]
    .filter((linha): linha is string => linha !== null)
    .join("\n");

  return completar(system, prompt);
}
