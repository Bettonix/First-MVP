-- AlterTable
ALTER TABLE "Produto" ALTER COLUMN "gerenciar_estoque" SET DEFAULT false;

-- AlterTable
ALTER TABLE "Vendedor" ADD COLUMN     "onboarding_step" INTEGER NOT NULL DEFAULT 0;
