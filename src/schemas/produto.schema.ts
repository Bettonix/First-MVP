import { z } from "zod";

export const CATEGORIAS_PRODUTO = [
  "Espetinhos",
  "Bebidas",
  "Acompanhamentos",
  "Sobremesas",
  "Combos",
  "Outros",
] as const;

export const produtoSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(100),
  preco: z.coerce.number().min(0.01, "Preço de venda inválido"),
  precoCusto: z.coerce.number().min(0, "Preço de custo inválido").default(0),
  categoria: z.string().min(1, "Selecione uma categoria").default("Outros"),
  isFavorito: z.boolean().default(true),
  estoqueAtual: z.coerce.number().int().default(0),
});

export type ProdutoFormData = z.infer<typeof produtoSchema>;
