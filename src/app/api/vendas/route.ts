import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// Schema de validação restrito (Zod) conforme backend-rules.md
const cartItemSchema = z.object({
  produtoId: z.coerce.bigint(),
  nome: z.string().min(1),
  quantidade: z.number().int().positive(),
  precoCentavos: z.number().int().positive(),
});

const splitPagamentoSchema = z.object({
  metodo: z.enum(['PIX', 'DINHEIRO', 'CARTAO_CREDITO', 'CARTAO_DEBITO']),
  valorCentavos: z.number().int().positive(),
});

const registrarVendaSchema = z.object({
  cart: z.array(cartItemSchema).min(1),
  pagamentos: z.array(splitPagamentoSchema).min(1),
});

export async function POST(req: NextRequest) {
  // Lazy imports: evita instanciação do Prisma durante o build (Static Analysis)
  const { RegistrarVendaUseCase } = await import('@/core/application/use-cases/registrar-venda.use-case');
  const { PrismaVendaRepository } = await import('@/core/infrastructure/repositories/prisma-venda.repository');
  const { createClient } = await import('@/lib/supabase/server');
  const { prisma } = await import('@/lib/prisma');

  const vendaRepository = new PrismaVendaRepository();
  const registrarVendaUseCase = new RegistrarVendaUseCase(vendaRepository);

  try {
    const supabase = await createClient();
    
    // Validação da entrada bruta da web
    const body = await req.json();
    const result = registrarVendaSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Validação falhou', details: result.error.issues }, { status: 400 });
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const vendedor = await prisma.vendedor.findUnique({ where: { authId: user.id } });
    if (!vendedor) {
      return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 403 });
    }

    const tenantId = vendedor.id;

    const output = await registrarVendaUseCase.execute({
      tenantId,
      cart: result.data.cart,
      pagamentos: result.data.pagamentos,
    });

    // Invalida o cache das agregações analíticas do Dashboard instantaneamente
    revalidateTag('dashboard-stats', 'max');

    // Converter BigInt para string para suportar JSON nativo do Next.js
    const serializedOutput = {
      ...output,
      vendaId: output.vendaId.toString()
    };

    return NextResponse.json(serializedOutput, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno do servidor';
    console.error('Erro ao registrar venda:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
