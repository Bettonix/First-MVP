-- AlterTable
ALTER TABLE "Produto" ADD COLUMN     "ativo" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "Produto_tenant_id_ativo_idx" ON "Produto"("tenant_id", "ativo");
