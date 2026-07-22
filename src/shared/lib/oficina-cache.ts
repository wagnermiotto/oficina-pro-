import "server-only";
import { prisma } from "./prisma";

/**
 * Cache em memória (TTL 60 s) do nome da oficina exibido no layout.
 * Evita uma consulta ao banco em CADA navegação — o nome quase nunca muda,
 * e quando muda (Configurações) o cache é invalidado explicitamente.
 */

const TTL_MS = 60_000;
const cache = new Map<string, { nome: string; expiraEm: number }>();

export async function obterNomeOficina(oficinaId: string): Promise<string> {
  const agora = Date.now();
  const emCache = cache.get(oficinaId);
  if (emCache && emCache.expiraEm > agora) return emCache.nome;

  const oficina = await prisma.organization.findUnique({
    where: { id: oficinaId },
    select: { name: true },
  });
  const nome = oficina?.name ?? "Minha oficina";
  cache.set(oficinaId, { nome, expiraEm: agora + TTL_MS });
  return nome;
}

export function invalidarNomeOficina(oficinaId: string): void {
  cache.delete(oficinaId);
}
