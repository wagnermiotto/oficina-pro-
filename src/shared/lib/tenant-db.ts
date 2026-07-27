import { prisma } from "./prisma";

/**
 * Isolamento multi-tenant na camada de dados.
 *
 * `tenantDb(oficinaId)` devolve um Prisma Client estendido que:
 * - injeta `oficinaId` em todo create/createMany/upsert;
 * - restringe todo read/updateMany/deleteMany ao tenant;
 * - filtra `deletedAt: null` nos reads dos models com soft delete
 *   (a menos que a query mencione `deletedAt` explicitamente);
 * - em findUnique, confere o tenant do resultado;
 * - em update/upsert/delete pontuais, verifica antes se o registro
 *   pertence ao tenant (lança erro se não);
 * - bloqueia acesso a models que não são de tenant (auth: User, Session…)
 *   — para esses, use `prisma` diretamente nos services de auth.
 *
 * O Prisma conecta como role que ignora RLS do Supabase; este módulo é a
 * fronteira de isolamento e tem testes dedicados (tenant-db.test.ts).
 */

const TENANT_MODELS = new Set([
  "OficinaConfig",
  "Cliente",
  "Veiculo",
  "Midia",
  "CheckIn",
  "CheckInAvaria",
  "Servico",
  "CategoriaPeca",
  "Fornecedor",
  "Peca",
  "MovimentacaoEstoque",
  "OrdemServico",
  "OSServico",
  "OSPeca",
  "DiagnosticoItem",
  "OSHistorico",
  "Aprovacao",
  "Garantia",
  "PedidoCompra",
  "PedidoCompraItem",
  "CentroCusto",
  "LancamentoFinanceiro",
  "Comissao",
  "Agendamento",
  "Interacao",
  "FuncionarioPerfil",
  "AuditLog",
  "ContagemEstoque",
  "ContagemItem",
  "PesquisaNps",
  "ChecklistOS",
  "TemplateServico",
  "TemplateServicoItem",
  "PerfilAcesso",
  "PermissaoPerfil",
]);

const SOFT_DELETE_MODELS = new Set([
  "Cliente",
  "Veiculo",
  "Midia",
  "CheckIn",
  "CheckInAvaria",
  "Servico",
  "CategoriaPeca",
  "Fornecedor",
  "Peca",
  "OrdemServico",
  "OSServico",
  "OSPeca",
  "DiagnosticoItem",
  "Garantia",
  "PedidoCompra",
  "PedidoCompraItem",
  "CentroCusto",
  "LancamentoFinanceiro",
  "Agendamento",
  "Interacao",
  "FuncionarioPerfil",
  "ContagemEstoque",
  "ContagemItem",
  "ChecklistOS",
  "TemplateServico",
  "TemplateServicoItem",
  "PerfilAcesso",
]);

const READ_OPS = new Set([
  "findMany",
  "findFirst",
  "findFirstOrThrow",
  "count",
  "aggregate",
  "groupBy",
]);

type WhereInput = Record<string, unknown>;

function mencionaDeletedAt(where: unknown): boolean {
  if (!where || typeof where !== "object") return false;
  const w = where as WhereInput;
  if ("deletedAt" in w) return true;
  for (const chave of ["AND", "OR", "NOT"]) {
    const filho = w[chave];
    if (Array.isArray(filho) && filho.some(mencionaDeletedAt)) return true;
    if (filho && !Array.isArray(filho) && mencionaDeletedAt(filho)) return true;
  }
  return false;
}

export class TenantViolationError extends Error {
  constructor(model: string, operation: string) {
    super(
      `Acesso negado: ${operation} em ${model} fora da oficina ativa (registro inexistente ou de outro tenant).`
    );
    this.name = "TenantViolationError";
  }
}

function criarTenantDb(oficinaId: string) {
  return prisma.$extends({
    name: `tenant:${oficinaId}`,
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!TENANT_MODELS.has(model)) {
            throw new Error(
              `Model ${model} não é multi-tenant. Use o client "prisma" diretamente (somente em services de auth).`
            );
          }

          const a = args as Record<string, unknown>;
          const escopo: WhereInput = { oficinaId };
          const filtroRead: WhereInput[] = [escopo];
          if (
            SOFT_DELETE_MODELS.has(model) &&
            READ_OPS.has(operation) &&
            !mencionaDeletedAt(a.where)
          ) {
            filtroRead.push({ deletedAt: null });
          }

          switch (operation) {
            case "create": {
              a.data = { ...(a.data as WhereInput), oficinaId };
              return query(args);
            }
            case "createMany":
            case "createManyAndReturn": {
              const data = a.data;
              a.data = Array.isArray(data)
                ? data.map((d: WhereInput) => ({ ...d, oficinaId }))
                : { ...(data as WhereInput), oficinaId };
              return query(args);
            }
            case "findMany":
            case "findFirst":
            case "findFirstOrThrow":
            case "count":
            case "aggregate":
            case "groupBy":
            case "updateMany":
            case "deleteMany": {
              a.where = { AND: [...filtroRead, (a.where as WhereInput) ?? {}] };
              return query(args);
            }
            case "findUnique":
            case "findUniqueOrThrow": {
              // Reescreve como findFirst escopado: um pós-check no resultado
              // falharia quando o caller usa `select` sem oficinaId.
              const delegate = (
                prisma as unknown as Record<
                  string,
                  { findFirst(q: unknown): Promise<unknown> }
                >
              )[model.charAt(0).toLowerCase() + model.slice(1)];
              const resultado = await delegate.findFirst({
                ...(a.select ? { select: a.select } : {}),
                ...(a.include ? { include: a.include } : {}),
                ...(a.omit ? { omit: a.omit } : {}),
                where: { AND: [escopo, (a.where as WhereInput) ?? {}] },
              });
              if (!resultado && operation === "findUniqueOrThrow") {
                throw new TenantViolationError(model, operation);
              }
              return resultado;
            }
            case "update":
            case "delete":
            case "upsert": {
              // Verificação prévia: o registro alvo precisa pertencer ao tenant.
              const delegate = (
                prisma as unknown as Record<
                  string,
                  { findFirst(q: unknown): Promise<unknown> }
                >
              )[model.charAt(0).toLowerCase() + model.slice(1)];
              const existente = await delegate.findFirst({
                where: { AND: [escopo, (a.where as WhereInput) ?? {}] },
                select: { id: true },
              });
              if (!existente && operation !== "upsert") {
                throw new TenantViolationError(model, operation);
              }
              if (operation === "upsert") {
                a.create = { ...(a.create as WhereInput), oficinaId };
                if (!existente) {
                  // O where pode casar com registro de OUTRO tenant; nesse
                  // caso o upsert atualizaria dado alheio — bloqueia.
                  const alheio = await delegate.findFirst({
                    where: (a.where as WhereInput) ?? {},
                    select: { id: true },
                  });
                  if (alheio) {
                    throw new TenantViolationError(model, operation);
                  }
                }
              }
              return query(args);
            }
            default:
              return query(args);
          }
        },
      },
    },
  });
}

export type TenantDb = ReturnType<typeof criarTenantDb>;

const cache = new Map<string, TenantDb>();

/** Retorna o client Prisma escopado à oficina. Cacheado por tenant. */
export function tenantDb(oficinaId: string): TenantDb {
  if (!oficinaId) {
    throw new Error("tenantDb exige uma oficinaId não vazia.");
  }
  let db = cache.get(oficinaId);
  if (!db) {
    db = criarTenantDb(oficinaId);
    cache.set(oficinaId, db);
  }
  return db;
}
