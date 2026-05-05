-- AlterTable
ALTER TABLE "Produto" ADD COLUMN     "estoque_minimo" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "gerenciar_estoque" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Vendedor" ADD COLUMN     "metodosPagamento" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "nicho" TEXT NOT NULL DEFAULT 'outros',
ADD COLUMN     "pin_gerente" TEXT;

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'GERENTE',
ADD COLUMN     "vendedor_id" TEXT;

-- CreateTable
CREATE TABLE "Comanda" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "mesa_id" BIGINT NOT NULL,
    "name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ABERTA',
    "total_centavos" INTEGER NOT NULL DEFAULT 0,
    "itens" JSONB,
    "aberta_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechada_em" TIMESTAMP(3),

    CONSTRAINT "Comanda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimentacaoEstoque" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "produto_id" BIGINT NOT NULL,
    "tipo" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "quantidade_anterior" INTEGER NOT NULL,
    "motivo" TEXT NOT NULL DEFAULT '',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimentacaoEstoque_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Comanda_tenant_id_status_idx" ON "Comanda"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "Comanda_mesa_id_idx" ON "Comanda"("mesa_id");

-- CreateIndex
CREATE INDEX "MovimentacaoEstoque_tenant_id_produto_id_idx" ON "MovimentacaoEstoque"("tenant_id", "produto_id");

-- CreateIndex
CREATE INDEX "Venda_tenant_id_metodoPagto_idx" ON "Venda"("tenant_id", "metodoPagto");

-- CreateIndex
CREATE INDEX "profiles_vendedor_id_idx" ON "profiles"("vendedor_id");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "Vendedor"("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comanda" ADD CONSTRAINT "Comanda_mesa_id_fkey" FOREIGN KEY ("mesa_id") REFERENCES "Mesa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoEstoque" ADD CONSTRAINT "MovimentacaoEstoque_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "Produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
