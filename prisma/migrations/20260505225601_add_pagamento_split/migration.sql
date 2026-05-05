-- CreateTable
CREATE TABLE "Pagamento" (
    "id" BIGSERIAL NOT NULL,
    "venda_id" BIGINT NOT NULL,
    "metodo" TEXT NOT NULL,
    "valor_centavos" INTEGER NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pagamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Pagamento_venda_id_idx" ON "Pagamento"("venda_id");

-- AddForeignKey
ALTER TABLE "Pagamento" ADD CONSTRAINT "Pagamento_venda_id_fkey" FOREIGN KEY ("venda_id") REFERENCES "Venda"("id") ON DELETE CASCADE ON UPDATE CASCADE;
