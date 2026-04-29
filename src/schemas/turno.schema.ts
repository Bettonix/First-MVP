import { z } from "zod";

export const abrirTurnoSchema = z.object({
  valorInicial: z.coerce.number().min(0, "Valor não pode ser negativo"),
});

export const movimentacaoSchema = z.object({
  tipo: z.enum(['ENTRADA', 'SAIDA']),
  valor: z.coerce.number().min(0.01, "Valor inválido"),
  motivo: z.string().min(3, "Motivo muito curto"),
});

export const fecharTurnoSchema = z.object({
  valorFinalInformado: z.coerce.number().min(0, "Valor não pode ser negativo"),
});
