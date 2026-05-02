"use server";

import { z } from 'zod';
import { revalidateTag, revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getTenantIdOrRedirect } from '@/lib/auth';
import { RegistrarVendaUseCase } from '@/core/application/use-cases/registrar-venda.use-case';
import { PrismaVendaRepository } from '@/core/infrastructure/repositories/prisma-venda.repository';

const cartItemSchema = z.object({
  produtoId: z.coerce.bigint(),
  nome: z.string().min(1),
  quantidade: z.number().int().positive(),
  precoCentavos: z.number().int().positive(),
});

const registrarVendaSchema = z.object({
  cart: z.array(cartItemSchema).min(1),
  pagamento: z.object({
    tipo: z.enum(['PIX', 'DINHEIRO', 'MISTO']),
    pixId: z.string().optional(),
    pixCentavos: z.number().int().min(0).optional(),
    dinheiroCentavos: z.number().int().min(0).optional(),
  }),
});

export type RegistrarVendaInput = z.infer<typeof registrarVendaSchema>;

export interface VendaDetalhe {
  id: string;
  totalCentavos: number;
  metodoPagto: string;
  criadoEm: string;
  itens: Array<{ produtoId: string; nome: string; quantidade: number; precoCentavos: number }>;
}

export async function getHistoricoVendas(date: string): Promise<VendaDetalhe[]> {
  const tenantId = await getTenantIdOrRedirect();
  const d = new Date(date);
  const start = new Date(d); start.setHours(0, 0, 0, 0);
  const end   = new Date(d); end.setHours(23, 59, 59, 999);

  const vendas = await prisma.venda.findMany({
    where: { tenantId, criadoEm: { gte: start, lte: end } },
    orderBy: { criadoEm: 'desc' },
    select: { id: true, totalCentavos: true, metodoPagto: true, criadoEm: true, itens: true },
  });

  return vendas.map((v) => ({
    id: v.id.toString(),
    totalCentavos: v.totalCentavos,
    metodoPagto: v.metodoPagto,
    criadoEm: v.criadoEm.toISOString(),
    itens: v.itens as VendaDetalhe['itens'],
  }));
}

export async function registrarVenda(data: RegistrarVendaInput) {
  const result = registrarVendaSchema.safeParse(data);

  if (!result.success) {
    return { success: false as const, error: 'Validação de dados falhou.' };
  }

  try {
    const tenantId = await getTenantIdOrRedirect();
    
    const vendaRepository = new PrismaVendaRepository();
    const registrarVendaUseCase = new RegistrarVendaUseCase(vendaRepository);

    const output = await registrarVendaUseCase.execute({
      tenantId,
      cart: result.data.cart,
      pagamento: result.data.pagamento,
    });

    revalidateTag('dashboard-stats', 'max');
    revalidatePath('/');

    return { 
      success: true as const, 
      vendaId: output.vendaId.toString() 
    };
  } catch (error: any) {
    console.error('Erro ao registrar venda:', error);
    return { 
      success: false as const, 
      error: error.message || 'Erro interno ao processar venda.' 
    };
  }
}
