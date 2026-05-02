-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendedor" (
    "tenant_id" TEXT NOT NULL,
    "authId" TEXT NOT NULL,
    "nomeLoja" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vendedor_pkey" PRIMARY KEY ("tenant_id")
);

-- CreateTable
CREATE TABLE "Turno" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ABERTO',
    "valorInicialCentavos" INTEGER NOT NULL DEFAULT 0,
    "valorFinalCentavos" INTEGER,
    "abertoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechadoEm" TIMESTAMP(3),

    CONSTRAINT "Turno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimentacaoFinanceira" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "turnoId" BIGINT NOT NULL,
    "tipo" TEXT NOT NULL,
    "valorCentavos" INTEGER NOT NULL,
    "motivo" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimentacaoFinanceira_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Produto" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "precoCentavos" INTEGER NOT NULL,
    "precoCustoCentavos" INTEGER NOT NULL DEFAULT 0,
    "categoria" TEXT NOT NULL DEFAULT 'Outros',
    "estoqueAtual" INTEGER NOT NULL DEFAULT 0,
    "estoqueInicial" INTEGER NOT NULL DEFAULT 0,
    "isFavorito" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Produto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venda" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "turnoId" BIGINT NOT NULL,
    "totalCentavos" INTEGER NOT NULL,
    "metodoPagto" TEXT NOT NULL,
    "pixId" TEXT,
    "itens" JSONB NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Venda_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Vendedor_authId_key" ON "Vendedor"("authId");

-- CreateIndex
CREATE INDEX "Vendedor_authId_idx" ON "Vendedor"("authId");

-- CreateIndex
CREATE INDEX "Turno_tenant_id_status_idx" ON "Turno"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "MovimentacaoFinanceira_tenant_id_turnoId_idx" ON "MovimentacaoFinanceira"("tenant_id", "turnoId");

-- CreateIndex
CREATE INDEX "Produto_tenant_id_isFavorito_idx" ON "Produto"("tenant_id", "isFavorito");

-- CreateIndex
CREATE INDEX "Venda_tenant_id_turnoId_criadoEm_idx" ON "Venda"("tenant_id", "turnoId", "criadoEm");

-- AddForeignKey
ALTER TABLE "MovimentacaoFinanceira" ADD CONSTRAINT "MovimentacaoFinanceira_turnoId_fkey" FOREIGN KEY ("turnoId") REFERENCES "Turno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venda" ADD CONSTRAINT "Venda_turnoId_fkey" FOREIGN KEY ("turnoId") REFERENCES "Turno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
