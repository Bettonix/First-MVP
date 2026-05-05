import { prisma } from '@/lib/prisma';
import {
  IVendaRepository,
  CartItem,
  SplitPagamento,
  VendaResult,
} from '../../domain/repositories/ivenda.repository';

/** Deriva o campo de resumo `metodoPagto` a partir do array de splits */
function resolveMetodoResumo(pagamentos: SplitPagamento[]): string {
  if (pagamentos.length === 1) return pagamentos[0].metodo;
  // Múltiplos métodos → MISTO
  const metodos = new Set(pagamentos.map((p) => p.metodo));
  if (metodos.size === 1) return [...metodos][0];
  return 'MISTO';
}

export class PrismaVendaRepository implements IVendaRepository {
  async registrarVenda(
    tenantId: string,
    cart: CartItem[],
    pagamentos: SplitPagamento[]
  ): Promise<VendaResult> {
    if (pagamentos.length === 0) {
      throw new Error('Pelo menos um pagamento é obrigatório.');
    }

    const totalCentavos = cart.reduce(
      (acc, item) => acc + item.precoCentavos * item.quantidade,
      0
    );

    const totalPagoCentavos = pagamentos.reduce(
      (acc, p) => acc + p.valorCentavos,
      0
    );

    if (totalPagoCentavos < totalCentavos) {
      throw new Error(
        `Pagamento insuficiente. Total: R$ ${(totalCentavos / 100).toFixed(2)}, ` +
        `Pago: R$ ${(totalPagoCentavos / 100).toFixed(2)}.`
      );
    }

    let hasCriticalStock = false;
    const criticalItems: string[] = [];

    const venda = await prisma.$transaction(async (tx) => {
      // 1. Valida turno aberto
      const turnoAberto = await tx.turno.findFirst({
        where: { tenantId, status: 'ABERTO' },
      });
      if (!turnoAberto) {
        throw new Error('Nenhum turno aberto. Abra o caixa antes de vender.');
      }

      // 2. Cria Venda + Pagamentos em nested write atômico
      const novaVenda = await tx.venda.create({
        data: {
          tenantId,
          turnoId: turnoAberto.id,
          totalCentavos,
          metodoPagto: resolveMetodoResumo(pagamentos),
          itens: cart as any,
          pagamentos: {
            create: pagamentos.map((p) => ({
              metodo: p.metodo,
              valorCentavos: p.valorCentavos,
            })),
          },
        },
      });

      // 3. Decremento atômico de estoque
      for (const item of cart) {
        const estoque = await tx.produto.update({
          where: { id: item.produtoId },
          data: { estoqueAtual: { decrement: item.quantidade } },
          select: {
            nome: true,
            estoqueAtual: true,
            estoqueInicial: true,
            tenantId: true,
          },
        });

        if (estoque.tenantId !== tenantId) {
          throw new Error('Tenant isolation violation detected.');
        }

        const limit = estoque.estoqueInicial * 0.1;
        if (estoque.estoqueAtual <= limit) {
          hasCriticalStock = true;
          criticalItems.push(estoque.nome);
        }
      }

      return novaVenda;
    });

    return {
      success: true,
      vendaId: venda.id,
      alertas: hasCriticalStock
        ? [`Estoque crítico: ${criticalItems.join(', ')}`]
        : null,
    };
  }
}
