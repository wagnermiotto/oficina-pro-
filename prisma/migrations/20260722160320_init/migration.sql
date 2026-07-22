-- CreateEnum
CREATE TYPE "TipoPessoa" AS ENUM ('FISICA', 'JURIDICA');

-- CreateEnum
CREATE TYPE "TipoVeiculo" AS ENUM ('CARRO', 'MOTO');

-- CreateEnum
CREATE TYPE "Combustivel" AS ENUM ('GASOLINA', 'ETANOL', 'FLEX', 'DIESEL', 'GNV', 'ELETRICO', 'HIBRIDO');

-- CreateEnum
CREATE TYPE "Cambio" AS ENUM ('MANUAL', 'AUTOMATICO', 'CVT', 'AUTOMATIZADO');

-- CreateEnum
CREATE TYPE "TipoMidia" AS ENUM ('FOTO', 'VIDEO', 'DOCUMENTO', 'ASSINATURA');

-- CreateEnum
CREATE TYPE "NivelCombustivel" AS ENUM ('VAZIO', 'QUARTO', 'MEIO', 'TRES_QUARTOS', 'CHEIO');

-- CreateEnum
CREATE TYPE "TipoAvaria" AS ENUM ('RISCO', 'AMASSADO', 'QUEBRADO', 'TRINCADO', 'FALTANDO', 'OUTRO');

-- CreateEnum
CREATE TYPE "TipoMovimentacao" AS ENUM ('ENTRADA', 'SAIDA', 'AJUSTE');

-- CreateEnum
CREATE TYPE "StatusOS" AS ENUM ('RECEBIDO', 'DIAGNOSTICO', 'AGUARDANDO_APROVACAO', 'APROVADO', 'EM_EXECUCAO', 'AGUARDANDO_PECAS', 'CONCLUIDO', 'ENTREGUE', 'FINALIZADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "StatusItemOS" AS ENUM ('PENDENTE', 'APROVADO', 'RECUSADO');

-- CreateEnum
CREATE TYPE "SistemaVeiculo" AS ENUM ('MOTOR', 'FREIOS', 'SUSPENSAO', 'DIRECAO', 'TRANSMISSAO', 'ELETRICA', 'INJECAO', 'AR_CONDICIONADO', 'PNEUS', 'LATARIA', 'PINTURA', 'ESCAPAMENTO', 'OUTRO');

-- CreateEnum
CREATE TYPE "Urgencia" AS ENUM ('BAIXA', 'MEDIA', 'ALTA', 'CRITICA');

-- CreateEnum
CREATE TYPE "StatusAprovacao" AS ENUM ('PENDENTE', 'APROVADA', 'PARCIAL', 'RECUSADA', 'EXPIRADA');

-- CreateEnum
CREATE TYPE "TipoGarantia" AS ENUM ('SERVICO', 'PECA');

-- CreateEnum
CREATE TYPE "StatusPedidoCompra" AS ENUM ('SOLICITACAO', 'COTACAO', 'PEDIDO', 'RECEBIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "TipoLancamento" AS ENUM ('RECEITA', 'DESPESA');

-- CreateEnum
CREATE TYPE "FormaPagamento" AS ENUM ('PIX', 'DINHEIRO', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'BOLETO', 'TRANSFERENCIA', 'OUTRO');

-- CreateEnum
CREATE TYPE "StatusLancamento" AS ENUM ('PENDENTE', 'PAGO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "StatusComissao" AS ENUM ('PENDENTE', 'PAGA');

-- CreateEnum
CREATE TYPE "TipoAgendamento" AS ENUM ('ENTRADA', 'REVISAO', 'TROCA_OLEO', 'ENTREGA', 'RETORNO', 'ORCAMENTO', 'OUTRO');

-- CreateEnum
CREATE TYPE "StatusAgendamento" AS ENUM ('AGENDADO', 'CONFIRMADO', 'CONCLUIDO', 'CANCELADO', 'FALTOU');

-- CreateEnum
CREATE TYPE "TipoInteracao" AS ENUM ('LIGACAO', 'WHATSAPP', 'EMAIL', 'PRESENCIAL', 'LEMBRETE', 'OBSERVACAO');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    "activeOrganizationId" TEXT,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "inviterId" TEXT NOT NULL,

    CONSTRAINT "invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oficina_config" (
    "id" UUID NOT NULL,
    "oficinaId" TEXT NOT NULL,
    "cnpj" TEXT,
    "razaoSocial" TEXT,
    "telefone" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "cep" TEXT,
    "endereco" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "logoUrl" TEXT,
    "valorHoraPadrao" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "impostoPadraoPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "garantiaPadraoDias" INTEGER NOT NULL DEFAULT 90,
    "proximoNumeroOS" INTEGER NOT NULL DEFAULT 1,
    "proximoNumeroPedido" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "oficina_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cliente" (
    "id" UUID NOT NULL,
    "oficinaId" TEXT NOT NULL,
    "tipo" "TipoPessoa" NOT NULL DEFAULT 'FISICA',
    "nome" TEXT NOT NULL,
    "cpfCnpj" TEXT,
    "telefone" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "cep" TEXT,
    "endereco" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "veiculo" (
    "id" UUID NOT NULL,
    "oficinaId" TEXT NOT NULL,
    "clienteId" UUID NOT NULL,
    "tipo" "TipoVeiculo" NOT NULL DEFAULT 'CARRO',
    "placa" TEXT NOT NULL,
    "marca" TEXT,
    "modelo" TEXT,
    "ano" INTEGER,
    "anoModelo" INTEGER,
    "cor" TEXT,
    "chassi" TEXT,
    "renavam" TEXT,
    "numeroMotor" TEXT,
    "quilometragem" INTEGER,
    "combustivel" "Combustivel",
    "cambio" "Cambio",
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "veiculo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "midia" (
    "id" UUID NOT NULL,
    "oficinaId" TEXT NOT NULL,
    "tipo" "TipoMidia" NOT NULL DEFAULT 'FOTO',
    "url" TEXT NOT NULL,
    "nome" TEXT,
    "entidade" TEXT NOT NULL,
    "entidadeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "midia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "check_in" (
    "id" UUID NOT NULL,
    "oficinaId" TEXT NOT NULL,
    "veiculoId" UUID NOT NULL,
    "clienteId" UUID NOT NULL,
    "ordemServicoId" UUID,
    "quilometragem" INTEGER,
    "nivelCombustivel" "NivelCombustivel",
    "chaveReserva" BOOLEAN NOT NULL DEFAULT false,
    "estepe" BOOLEAN NOT NULL DEFAULT false,
    "macaco" BOOLEAN NOT NULL DEFAULT false,
    "triangulo" BOOLEAN NOT NULL DEFAULT false,
    "objetosDeixados" TEXT,
    "observacoes" TEXT,
    "assinaturaUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "check_in_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "check_in_avaria" (
    "id" UUID NOT NULL,
    "oficinaId" TEXT NOT NULL,
    "checkInId" UUID NOT NULL,
    "local" TEXT NOT NULL,
    "tipo" "TipoAvaria" NOT NULL DEFAULT 'OUTRO',
    "descricao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "check_in_avaria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servico" (
    "id" UUID NOT NULL,
    "oficinaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "precoBase" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tempoEstimadoMin" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "servico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categoria_peca" (
    "id" UUID NOT NULL,
    "oficinaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "categoria_peca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fornecedor" (
    "id" UUID NOT NULL,
    "oficinaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "fornecedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "peca" (
    "id" UUID NOT NULL,
    "oficinaId" TEXT NOT NULL,
    "codigo" TEXT,
    "codigoBarras" TEXT,
    "nome" TEXT NOT NULL,
    "marca" TEXT,
    "unidade" TEXT NOT NULL DEFAULT 'un',
    "categoriaId" UUID,
    "fornecedorId" UUID,
    "precoCusto" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "precoVenda" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "quantidade" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "estoqueMinimo" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "localizacao" TEXT,
    "lote" TEXT,
    "validade" TIMESTAMP(3),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "peca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimentacao_estoque" (
    "id" UUID NOT NULL,
    "oficinaId" TEXT NOT NULL,
    "pecaId" UUID NOT NULL,
    "tipo" "TipoMovimentacao" NOT NULL,
    "quantidade" DECIMAL(12,3) NOT NULL,
    "custoUnitario" DECIMAL(12,2),
    "motivo" TEXT,
    "ordemServicoId" UUID,
    "pedidoCompraId" UUID,
    "usuarioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimentacao_estoque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordem_servico" (
    "id" UUID NOT NULL,
    "oficinaId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "clienteId" UUID NOT NULL,
    "veiculoId" UUID NOT NULL,
    "mecanicoId" TEXT,
    "status" "StatusOS" NOT NULL DEFAULT 'RECEBIDO',
    "dataEntrada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataPrevista" TIMESTAMP(3),
    "dataConclusao" TIMESTAMP(3),
    "dataEntrega" TIMESTAMP(3),
    "descricaoProblema" TEXT,
    "observacoesInternas" TEXT,
    "garantiaDias" INTEGER NOT NULL DEFAULT 90,
    "descontoValor" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "impostoPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "totalServicos" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalPecas" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tempoEstimadoMin" INTEGER,
    "tempoExecutadoMin" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ordem_servico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "os_servico" (
    "id" UUID NOT NULL,
    "oficinaId" TEXT NOT NULL,
    "ordemServicoId" UUID NOT NULL,
    "servicoId" UUID,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tempoEstimadoMin" INTEGER,
    "status" "StatusItemOS" NOT NULL DEFAULT 'PENDENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "os_servico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "os_peca" (
    "id" UUID NOT NULL,
    "oficinaId" TEXT NOT NULL,
    "ordemServicoId" UUID NOT NULL,
    "pecaId" UUID,
    "descricao" TEXT NOT NULL,
    "quantidade" DECIMAL(12,3) NOT NULL DEFAULT 1,
    "valorUnitario" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "StatusItemOS" NOT NULL DEFAULT 'PENDENTE',
    "baixaEfetuada" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "os_peca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnostico_item" (
    "id" UUID NOT NULL,
    "oficinaId" TEXT NOT NULL,
    "ordemServicoId" UUID NOT NULL,
    "sistema" "SistemaVeiculo" NOT NULL DEFAULT 'OUTRO',
    "descricao" TEXT NOT NULL,
    "urgencia" "Urgencia" NOT NULL DEFAULT 'MEDIA',
    "valorEstimado" DECIMAL(12,2),
    "tempoEstimadoMin" INTEGER,
    "recomendacao" TEXT,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "diagnostico_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "os_historico" (
    "id" UUID NOT NULL,
    "oficinaId" TEXT NOT NULL,
    "ordemServicoId" UUID NOT NULL,
    "statusAnterior" "StatusOS",
    "statusNovo" "StatusOS" NOT NULL,
    "usuarioId" TEXT,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "os_historico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aprovacao" (
    "id" UUID NOT NULL,
    "oficinaId" TEXT NOT NULL,
    "ordemServicoId" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "status" "StatusAprovacao" NOT NULL DEFAULT 'PENDENTE',
    "nomeAprovador" TEXT,
    "ipAprovador" TEXT,
    "userAgent" TEXT,
    "assinaturaUrl" TEXT,
    "respondidoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aprovacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "garantia" (
    "id" UUID NOT NULL,
    "oficinaId" TEXT NOT NULL,
    "ordemServicoId" UUID NOT NULL,
    "tipo" "TipoGarantia" NOT NULL DEFAULT 'SERVICO',
    "descricao" TEXT NOT NULL,
    "validadeAte" TIMESTAMP(3) NOT NULL,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "garantia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedido_compra" (
    "id" UUID NOT NULL,
    "oficinaId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "fornecedorId" UUID,
    "status" "StatusPedidoCompra" NOT NULL DEFAULT 'SOLICITACAO',
    "notaFiscal" TEXT,
    "observacoes" TEXT,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "recebidoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "pedido_compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedido_compra_item" (
    "id" UUID NOT NULL,
    "oficinaId" TEXT NOT NULL,
    "pedidoCompraId" UUID NOT NULL,
    "pecaId" UUID,
    "descricao" TEXT NOT NULL,
    "quantidade" DECIMAL(12,3) NOT NULL DEFAULT 1,
    "custoUnitario" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "pedido_compra_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "centro_custo" (
    "id" UUID NOT NULL,
    "oficinaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "centro_custo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lancamento_financeiro" (
    "id" UUID NOT NULL,
    "oficinaId" TEXT NOT NULL,
    "tipo" "TipoLancamento" NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "formaPagamento" "FormaPagamento",
    "status" "StatusLancamento" NOT NULL DEFAULT 'PENDENTE',
    "vencimento" TIMESTAMP(3),
    "pagoEm" TIMESTAMP(3),
    "centroCustoId" UUID,
    "ordemServicoId" UUID,
    "clienteId" UUID,
    "fornecedorId" UUID,
    "pedidoCompraId" UUID,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "lancamento_financeiro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comissao" (
    "id" UUID NOT NULL,
    "oficinaId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "ordemServicoId" UUID NOT NULL,
    "percentual" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "valor" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "StatusComissao" NOT NULL DEFAULT 'PENDENTE',
    "pagaEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comissao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agendamento" (
    "id" UUID NOT NULL,
    "oficinaId" TEXT NOT NULL,
    "clienteId" UUID,
    "veiculoId" UUID,
    "mecanicoId" TEXT,
    "ordemServicoId" UUID,
    "tipo" "TipoAgendamento" NOT NULL DEFAULT 'OUTRO',
    "titulo" TEXT NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fim" TIMESTAMP(3),
    "status" "StatusAgendamento" NOT NULL DEFAULT 'AGENDADO',
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "agendamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interacao" (
    "id" UUID NOT NULL,
    "oficinaId" TEXT NOT NULL,
    "clienteId" UUID NOT NULL,
    "tipo" "TipoInteracao" NOT NULL DEFAULT 'OBSERVACAO',
    "mensagem" TEXT NOT NULL,
    "dataContato" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "proximoContato" TIMESTAMP(3),
    "usuarioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "interacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "funcionario_perfil" (
    "id" UUID NOT NULL,
    "oficinaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "especialidade" TEXT,
    "comissaoPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "salario" DECIMAL(12,2),
    "telefone" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "funcionario_perfil_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" UUID NOT NULL,
    "oficinaId" TEXT,
    "usuarioId" TEXT,
    "acao" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidadeId" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "antes" JSONB,
    "depois" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "organization_slug_key" ON "organization"("slug");

-- CreateIndex
CREATE INDEX "member_userId_idx" ON "member"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "member_organizationId_userId_key" ON "member"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "invitation_organizationId_idx" ON "invitation"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "oficina_config_oficinaId_key" ON "oficina_config"("oficinaId");

-- CreateIndex
CREATE INDEX "cliente_oficinaId_nome_idx" ON "cliente"("oficinaId", "nome");

-- CreateIndex
CREATE INDEX "cliente_oficinaId_cpfCnpj_idx" ON "cliente"("oficinaId", "cpfCnpj");

-- CreateIndex
CREATE INDEX "veiculo_oficinaId_placa_idx" ON "veiculo"("oficinaId", "placa");

-- CreateIndex
CREATE INDEX "veiculo_oficinaId_clienteId_idx" ON "veiculo"("oficinaId", "clienteId");

-- CreateIndex
CREATE INDEX "midia_oficinaId_entidade_entidadeId_idx" ON "midia"("oficinaId", "entidade", "entidadeId");

-- CreateIndex
CREATE UNIQUE INDEX "check_in_ordemServicoId_key" ON "check_in"("ordemServicoId");

-- CreateIndex
CREATE INDEX "check_in_oficinaId_veiculoId_idx" ON "check_in"("oficinaId", "veiculoId");

-- CreateIndex
CREATE INDEX "check_in_avaria_oficinaId_checkInId_idx" ON "check_in_avaria"("oficinaId", "checkInId");

-- CreateIndex
CREATE INDEX "servico_oficinaId_nome_idx" ON "servico"("oficinaId", "nome");

-- CreateIndex
CREATE INDEX "categoria_peca_oficinaId_idx" ON "categoria_peca"("oficinaId");

-- CreateIndex
CREATE INDEX "fornecedor_oficinaId_nome_idx" ON "fornecedor"("oficinaId", "nome");

-- CreateIndex
CREATE INDEX "peca_oficinaId_nome_idx" ON "peca"("oficinaId", "nome");

-- CreateIndex
CREATE INDEX "peca_oficinaId_codigo_idx" ON "peca"("oficinaId", "codigo");

-- CreateIndex
CREATE INDEX "movimentacao_estoque_oficinaId_pecaId_idx" ON "movimentacao_estoque"("oficinaId", "pecaId");

-- CreateIndex
CREATE INDEX "movimentacao_estoque_oficinaId_createdAt_idx" ON "movimentacao_estoque"("oficinaId", "createdAt");

-- CreateIndex
CREATE INDEX "ordem_servico_oficinaId_status_idx" ON "ordem_servico"("oficinaId", "status");

-- CreateIndex
CREATE INDEX "ordem_servico_oficinaId_clienteId_idx" ON "ordem_servico"("oficinaId", "clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "ordem_servico_oficinaId_numero_key" ON "ordem_servico"("oficinaId", "numero");

-- CreateIndex
CREATE INDEX "os_servico_oficinaId_ordemServicoId_idx" ON "os_servico"("oficinaId", "ordemServicoId");

-- CreateIndex
CREATE INDEX "os_peca_oficinaId_ordemServicoId_idx" ON "os_peca"("oficinaId", "ordemServicoId");

-- CreateIndex
CREATE INDEX "diagnostico_item_oficinaId_ordemServicoId_idx" ON "diagnostico_item"("oficinaId", "ordemServicoId");

-- CreateIndex
CREATE INDEX "os_historico_oficinaId_ordemServicoId_idx" ON "os_historico"("oficinaId", "ordemServicoId");

-- CreateIndex
CREATE UNIQUE INDEX "aprovacao_token_key" ON "aprovacao"("token");

-- CreateIndex
CREATE INDEX "aprovacao_oficinaId_ordemServicoId_idx" ON "aprovacao"("oficinaId", "ordemServicoId");

-- CreateIndex
CREATE INDEX "garantia_oficinaId_validadeAte_idx" ON "garantia"("oficinaId", "validadeAte");

-- CreateIndex
CREATE INDEX "pedido_compra_oficinaId_status_idx" ON "pedido_compra"("oficinaId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "pedido_compra_oficinaId_numero_key" ON "pedido_compra"("oficinaId", "numero");

-- CreateIndex
CREATE INDEX "pedido_compra_item_oficinaId_pedidoCompraId_idx" ON "pedido_compra_item"("oficinaId", "pedidoCompraId");

-- CreateIndex
CREATE INDEX "centro_custo_oficinaId_idx" ON "centro_custo"("oficinaId");

-- CreateIndex
CREATE INDEX "lancamento_financeiro_oficinaId_tipo_status_idx" ON "lancamento_financeiro"("oficinaId", "tipo", "status");

-- CreateIndex
CREATE INDEX "lancamento_financeiro_oficinaId_vencimento_idx" ON "lancamento_financeiro"("oficinaId", "vencimento");

-- CreateIndex
CREATE INDEX "comissao_oficinaId_usuarioId_idx" ON "comissao"("oficinaId", "usuarioId");

-- CreateIndex
CREATE INDEX "agendamento_oficinaId_inicio_idx" ON "agendamento"("oficinaId", "inicio");

-- CreateIndex
CREATE INDEX "interacao_oficinaId_clienteId_idx" ON "interacao"("oficinaId", "clienteId");

-- CreateIndex
CREATE INDEX "interacao_oficinaId_proximoContato_idx" ON "interacao"("oficinaId", "proximoContato");

-- CreateIndex
CREATE UNIQUE INDEX "funcionario_perfil_oficinaId_userId_key" ON "funcionario_perfil"("oficinaId", "userId");

-- CreateIndex
CREATE INDEX "audit_log_oficinaId_entidade_entidadeId_idx" ON "audit_log"("oficinaId", "entidade", "entidadeId");

-- CreateIndex
CREATE INDEX "audit_log_oficinaId_createdAt_idx" ON "audit_log"("oficinaId", "createdAt");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member" ADD CONSTRAINT "member_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member" ADD CONSTRAINT "member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oficina_config" ADD CONSTRAINT "oficina_config_oficinaId_fkey" FOREIGN KEY ("oficinaId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cliente" ADD CONSTRAINT "cliente_oficinaId_fkey" FOREIGN KEY ("oficinaId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "veiculo" ADD CONSTRAINT "veiculo_oficinaId_fkey" FOREIGN KEY ("oficinaId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "veiculo" ADD CONSTRAINT "veiculo_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "midia" ADD CONSTRAINT "midia_oficinaId_fkey" FOREIGN KEY ("oficinaId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_in" ADD CONSTRAINT "check_in_oficinaId_fkey" FOREIGN KEY ("oficinaId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_in" ADD CONSTRAINT "check_in_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "veiculo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_in" ADD CONSTRAINT "check_in_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_in" ADD CONSTRAINT "check_in_ordemServicoId_fkey" FOREIGN KEY ("ordemServicoId") REFERENCES "ordem_servico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_in_avaria" ADD CONSTRAINT "check_in_avaria_oficinaId_fkey" FOREIGN KEY ("oficinaId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_in_avaria" ADD CONSTRAINT "check_in_avaria_checkInId_fkey" FOREIGN KEY ("checkInId") REFERENCES "check_in"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servico" ADD CONSTRAINT "servico_oficinaId_fkey" FOREIGN KEY ("oficinaId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categoria_peca" ADD CONSTRAINT "categoria_peca_oficinaId_fkey" FOREIGN KEY ("oficinaId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fornecedor" ADD CONSTRAINT "fornecedor_oficinaId_fkey" FOREIGN KEY ("oficinaId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "peca" ADD CONSTRAINT "peca_oficinaId_fkey" FOREIGN KEY ("oficinaId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "peca" ADD CONSTRAINT "peca_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categoria_peca"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "peca" ADD CONSTRAINT "peca_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "fornecedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacao_estoque" ADD CONSTRAINT "movimentacao_estoque_oficinaId_fkey" FOREIGN KEY ("oficinaId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacao_estoque" ADD CONSTRAINT "movimentacao_estoque_pecaId_fkey" FOREIGN KEY ("pecaId") REFERENCES "peca"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacao_estoque" ADD CONSTRAINT "movimentacao_estoque_ordemServicoId_fkey" FOREIGN KEY ("ordemServicoId") REFERENCES "ordem_servico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacao_estoque" ADD CONSTRAINT "movimentacao_estoque_pedidoCompraId_fkey" FOREIGN KEY ("pedidoCompraId") REFERENCES "pedido_compra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordem_servico" ADD CONSTRAINT "ordem_servico_oficinaId_fkey" FOREIGN KEY ("oficinaId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordem_servico" ADD CONSTRAINT "ordem_servico_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordem_servico" ADD CONSTRAINT "ordem_servico_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "veiculo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "os_servico" ADD CONSTRAINT "os_servico_oficinaId_fkey" FOREIGN KEY ("oficinaId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "os_servico" ADD CONSTRAINT "os_servico_ordemServicoId_fkey" FOREIGN KEY ("ordemServicoId") REFERENCES "ordem_servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "os_servico" ADD CONSTRAINT "os_servico_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "servico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "os_peca" ADD CONSTRAINT "os_peca_oficinaId_fkey" FOREIGN KEY ("oficinaId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "os_peca" ADD CONSTRAINT "os_peca_ordemServicoId_fkey" FOREIGN KEY ("ordemServicoId") REFERENCES "ordem_servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "os_peca" ADD CONSTRAINT "os_peca_pecaId_fkey" FOREIGN KEY ("pecaId") REFERENCES "peca"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnostico_item" ADD CONSTRAINT "diagnostico_item_oficinaId_fkey" FOREIGN KEY ("oficinaId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnostico_item" ADD CONSTRAINT "diagnostico_item_ordemServicoId_fkey" FOREIGN KEY ("ordemServicoId") REFERENCES "ordem_servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "os_historico" ADD CONSTRAINT "os_historico_oficinaId_fkey" FOREIGN KEY ("oficinaId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "os_historico" ADD CONSTRAINT "os_historico_ordemServicoId_fkey" FOREIGN KEY ("ordemServicoId") REFERENCES "ordem_servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aprovacao" ADD CONSTRAINT "aprovacao_oficinaId_fkey" FOREIGN KEY ("oficinaId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aprovacao" ADD CONSTRAINT "aprovacao_ordemServicoId_fkey" FOREIGN KEY ("ordemServicoId") REFERENCES "ordem_servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "garantia" ADD CONSTRAINT "garantia_oficinaId_fkey" FOREIGN KEY ("oficinaId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "garantia" ADD CONSTRAINT "garantia_ordemServicoId_fkey" FOREIGN KEY ("ordemServicoId") REFERENCES "ordem_servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_compra" ADD CONSTRAINT "pedido_compra_oficinaId_fkey" FOREIGN KEY ("oficinaId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_compra" ADD CONSTRAINT "pedido_compra_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "fornecedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_compra_item" ADD CONSTRAINT "pedido_compra_item_oficinaId_fkey" FOREIGN KEY ("oficinaId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_compra_item" ADD CONSTRAINT "pedido_compra_item_pedidoCompraId_fkey" FOREIGN KEY ("pedidoCompraId") REFERENCES "pedido_compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_compra_item" ADD CONSTRAINT "pedido_compra_item_pecaId_fkey" FOREIGN KEY ("pecaId") REFERENCES "peca"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "centro_custo" ADD CONSTRAINT "centro_custo_oficinaId_fkey" FOREIGN KEY ("oficinaId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamento_financeiro" ADD CONSTRAINT "lancamento_financeiro_oficinaId_fkey" FOREIGN KEY ("oficinaId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamento_financeiro" ADD CONSTRAINT "lancamento_financeiro_centroCustoId_fkey" FOREIGN KEY ("centroCustoId") REFERENCES "centro_custo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamento_financeiro" ADD CONSTRAINT "lancamento_financeiro_ordemServicoId_fkey" FOREIGN KEY ("ordemServicoId") REFERENCES "ordem_servico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamento_financeiro" ADD CONSTRAINT "lancamento_financeiro_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamento_financeiro" ADD CONSTRAINT "lancamento_financeiro_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "fornecedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamento_financeiro" ADD CONSTRAINT "lancamento_financeiro_pedidoCompraId_fkey" FOREIGN KEY ("pedidoCompraId") REFERENCES "pedido_compra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comissao" ADD CONSTRAINT "comissao_oficinaId_fkey" FOREIGN KEY ("oficinaId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comissao" ADD CONSTRAINT "comissao_ordemServicoId_fkey" FOREIGN KEY ("ordemServicoId") REFERENCES "ordem_servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamento" ADD CONSTRAINT "agendamento_oficinaId_fkey" FOREIGN KEY ("oficinaId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamento" ADD CONSTRAINT "agendamento_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamento" ADD CONSTRAINT "agendamento_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "veiculo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamento" ADD CONSTRAINT "agendamento_ordemServicoId_fkey" FOREIGN KEY ("ordemServicoId") REFERENCES "ordem_servico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interacao" ADD CONSTRAINT "interacao_oficinaId_fkey" FOREIGN KEY ("oficinaId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interacao" ADD CONSTRAINT "interacao_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funcionario_perfil" ADD CONSTRAINT "funcionario_perfil_oficinaId_fkey" FOREIGN KEY ("oficinaId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_oficinaId_fkey" FOREIGN KEY ("oficinaId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
