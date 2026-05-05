"use server";

import { z } from 'zod';
import { revalidateTag, revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getTenantIdOrRedirect } from '@/lib/auth';
import { RegistrarVendaUseCase } from '@/core/application/use-cases/registrar-venda.use-case';
import { PrismaVendaRepository } from '@/core/infrastructure/repositories/prisma-venda.repository';

const METODOS_VALIDOS = ['PIX', 'DINHEIRO', 'CARTAO_CREDITO', 'CARTAO_DEBITO'] as const;

const cartItemSchema = z.object({
  produtoId: z.coerce.bigint(),
  nome: z.string().min(1),
  quantidade: z.number().int().positive(),
  precoCentavos: z.number().int().positive(),
});

const splitPagamentoSchema = z.object({
  metodo: z.enum(METODOS_VALIDOS),
  valorCentavos: z.number().int().positive(),
});

const registrarVendaSchema = z.object({
  cart: z.array(cartItemSchema).min(1),
  pagamentos: z.array(splitPagamentoSchema).min(1),
});

export type RegistrarVendaInput = z.infer<typeof registrarVendaSchema>;

export interface VendaDetalhe {
  id: string;
  totalCentavos: number;
  metodoPagto: string;
  criadoEm: string;
  itens: Array<{ produtoId: string; nome: string; quantidade: number; precoCentavos: number }>;
  pagamentos?: Array<{ metodo: string; valorCentavos: number }>;
}

export async function getHistoricoVendas(date: string): Promise<VendaDetalhe[]> {
  const tenantId = await getTenantIdOrRedirect();
  const d = new Date(date);
  const start = new Date(d); start.setHours(0, 0, 0, 0);
  const end   = new Date(d); end.setHours(23, 59, 59, 999);

  const vendas = await prisma.venda.findMany({
    where: { tenantId, criadoEm: { gte: start, lte: end } },
    orderBy: { criadoEm: 'desc' },
    select: {
      id: true,
      totalCentavos: true,
      metodoPagto: true,
      criadoEm: true,
      itens: true,
      pagamentos: { select: { metodo: true, valorCentavos: true } },
    },
  });

  return vendas.map((v) => ({
    id: v.id.toString(),
    totalCentavos: v.totalCentavos,
    metodoPagto: v.metodoPagto,
    criadoEm: v.criadoEm.toISOString(),
    itens: v.itens as VendaDetalhe['itens'],
    pagamentos: v.pagamentos,
  }));
}

export async function registrarVenda(data: RegistrarVendaInput) {
  const result = registrarVendaSchema.safeParse(data);

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    const msg = firstIssue
      ? `Dados inválidos: ${firstIssue.path.join('.')} — ${firstIssue.message}`
      : 'Validação de dados falhou.';
    return { success: false as const, error: msg };
  }

  try {
    const tenantId = await getTenantIdOrRedirect();

    const vendaRepository = new PrismaVendaRepository();
    const registrarVendaUseCase = new RegistrarVendaUseCase(vendaRepository);

    const output = await registrarVendaUseCase.execute({
      tenantId,
      cart: result.data.cart,
      pagamentos: result.data.pagamentos,
    });

    revalidateTag('dashboard-stats', 'max');
    revalidatePath('/');

    return {
      success: true as const,
      vendaId: output.vendaId.toString(),
      alertas: output.alertas,
    };
  } catch (error: any) {
    console.error('Erro ao registrar venda:', error);
    return {
      success: false as const,
      error: error.message || 'Erro interno ao processar venda.',
    };
  }
}
