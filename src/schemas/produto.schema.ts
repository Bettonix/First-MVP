import { z } from "zod";

export const produtoSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(100),
  preco: z.coerce.number().min(0.01, "Preço inválido"), // Float format for input, convert to cents in action
  isFavorito: z.boolean().default(true),
  estoqueAtual: z.coerce.number().int().min(0).default(0),
});

export type ProdutoFormData = z.infer<typeof produtoSchema>;
