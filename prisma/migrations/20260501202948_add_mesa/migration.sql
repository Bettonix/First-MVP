-- CreateTable
CREATE TABLE "Mesa" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mesa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Mesa_tenant_id_idx" ON "Mesa"("tenant_id");
