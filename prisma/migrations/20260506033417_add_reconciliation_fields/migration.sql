-- AlterTable
ALTER TABLE "Produto" ADD COLUMN     "last_inconsistency" TIMESTAMP(3),
ADD COLUMN     "needs_reconciliation" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Produto_tenant_id_needs_reconciliation_idx" ON "Produto"("tenant_id", "needs_reconciliation");
