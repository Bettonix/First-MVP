-- AlterTable
ALTER TABLE "Vendedor" ADD COLUMN     "cnpj_cpf" TEXT,
ADD COLUMN     "logo_url" TEXT,
ADD COLUMN     "mensagem_recibo" TEXT DEFAULT 'Obrigado pela preferência! Volte sempre.',
ADD COLUMN     "telefone" TEXT;
