/**
 * Catálogo de módulos e ações do RBAC — fonte única para UI, validação zod e
 * seeds. Permissões são persistidas como pares (modulo, acao) em
 * PermissaoPerfil; este catálogo define o que é válido.
 *
 * Notas de mapeamento:
 * - Check-in usa ordens.CRIAR / ordens.VISUALIZAR (é a porta de entrada da OS).
 * - Templates de pacote usam configuracoes.EDITAR (a UI vive em Configurações).
 * - ordens não tem EXCLUIR: cancelamento é transição de status (MUDAR_STATUS).
 * - ordens.VISUALIZAR = apenas as próprias OS (mecanicoId do usuário);
 *   ordens.VISUALIZAR_TODAS ⇒ implica VISUALIZAR (normalizado em getPermissoes).
 * - O "Cliente" final NÃO entra no RBAC: é atendido pelas rotas públicas por
 *   token (/portal, /aprovacao, /nps), sem login.
 * - Autorização de domínio vem SÓ daqui + PerfilAcesso; Member.role (Better
 *   Auth) e FuncionarioPerfil.cargo não são consultados para autorizar.
 */

export const MODULOS_SISTEMA = {
  dashboard: {
    rotulo: "Dashboard",
    acoes: ["VISUALIZAR"],
  },
  ordens: {
    rotulo: "Ordens de Serviço",
    acoes: [
      "VISUALIZAR",
      "VISUALIZAR_TODAS",
      "CRIAR",
      "EDITAR",
      "MUDAR_STATUS",
      "ENVIAR_APROVACAO",
      "VER_VALORES",
    ],
  },
  agenda: {
    rotulo: "Agenda",
    acoes: ["VISUALIZAR", "CRIAR", "EDITAR", "EXCLUIR"],
  },
  clientes: {
    rotulo: "Clientes",
    acoes: ["VISUALIZAR", "CRIAR", "EDITAR", "EXCLUIR"],
  },
  veiculos: {
    rotulo: "Veículos",
    acoes: ["VISUALIZAR", "CRIAR", "EDITAR", "EXCLUIR"],
  },
  estoque: {
    rotulo: "Estoque",
    acoes: ["VISUALIZAR", "CRIAR", "EDITAR", "EXCLUIR", "MOVIMENTAR"],
  },
  compras: {
    rotulo: "Compras",
    acoes: ["VISUALIZAR", "CRIAR", "EDITAR", "EXCLUIR"],
  },
  financeiro: {
    rotulo: "Financeiro",
    acoes: ["VISUALIZAR", "CRIAR", "EDITAR", "EXCLUIR"],
  },
  relatorios: {
    rotulo: "Relatórios e BI",
    acoes: ["VISUALIZAR", "EXPORTAR"],
  },
  crm: {
    rotulo: "CRM",
    acoes: ["VISUALIZAR", "CRIAR", "EDITAR"],
  },
  equipe: {
    rotulo: "Equipe",
    acoes: ["VISUALIZAR", "EDITAR"],
  },
  configuracoes: {
    rotulo: "Configurações",
    acoes: ["VISUALIZAR", "EDITAR"],
  },
  permissoes: {
    rotulo: "Perfis e Permissões",
    acoes: ["VISUALIZAR", "EDITAR"],
  },
} as const;

/**
 * Módulos reservados: aceitos na validação e exibidos desabilitados na UI
 * ("em breve"); nenhuma tela/action os consulta ainda. Quando o módulo real
 * for construído, o enforcement acende sem migração de dados.
 */
export const MODULOS_RESERVADOS = {
  rh: {
    rotulo: "RH (em breve)",
    acoes: ["VISUALIZAR", "CRIAR", "EDITAR", "EXCLUIR"],
  },
  whatsapp: {
    rotulo: "WhatsApp (em breve)",
    acoes: ["VISUALIZAR", "ENVIAR"],
  },
} as const;

export type ModuloSistema = keyof typeof MODULOS_SISTEMA;
export type ModuloReservado = keyof typeof MODULOS_RESERVADOS;
export type Modulo = ModuloSistema | ModuloReservado;

/** Chave achatada de permissão, ex.: "ordens.VISUALIZAR_TODAS". */
export type ChavePermissao = `${Modulo}.${string}`;

const TODOS_MODULOS: Record<string, { rotulo: string; acoes: readonly string[] }> = {
  ...MODULOS_SISTEMA,
  ...MODULOS_RESERVADOS,
};

/** O par (modulo, acao) existe no catálogo? */
export function permissaoValida(modulo: string, acao: string): boolean {
  const def = TODOS_MODULOS[modulo];
  return Boolean(def && (def.acoes as readonly string[]).includes(acao));
}

/** Lista achatada de todas as permissões válidas (p/ seeds e validação). */
export function todasPermissoes(): { modulo: string; acao: string }[] {
  return Object.entries(TODOS_MODULOS).flatMap(([modulo, def]) =>
    def.acoes.map((acao) => ({ modulo, acao }))
  );
}

export function chave(modulo: string, acao: string): ChavePermissao {
  return `${modulo}.${acao}` as ChavePermissao;
}
