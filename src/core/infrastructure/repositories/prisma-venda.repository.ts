import { prisma } from '@/lib/prisma';
import { IVendaRepository, CartItem, MetodoPagamento, VendaResult } from '../../domain/repositories/ivenda.repository';

export class PrismaVendaRepository implements IVendaRepository {
  async registrarVenda(
    tenantId: string,
    cart: CartItem[],
    pagamento: MetodoPagamento
  ): Promise<VendaResult> {
    let hasCriticalStock = false;
    const criticalItems: string[] = [];

    const totalCentavos = cart.reduce((acc, item) => acc + (item.precoCentavos * item.quantidade), 0);

    const venda = await prisma.$transaction(async (tx) => {
      // Logic Gate: Localiza o turno aberto do tenant
      const turnoAberto = await tx.turno.findFirst({
        where: { tenantId, status: 'ABERTO' }
      });

      if (!turnoAberto) {
        throw new Error('Nenhum turno aberto. Abra o caixa antes de vender.');
      }

      // 1. Criação atômica da Venda usando array JSONB para os itens. 
      const novaVenda = await tx.venda.create({
        data: {
          tenantId,
          turnoId: turnoAberto.id,
          totalCentavos,
          metodoPagto: pagamento.tipo,
          pixId: pagamento.tipo === 'PIX' ? pagamento.pixId : null, // Logic Gate: PIX requires optional transaction_id
          itens: cart as any, // Salva nativamente como array JSONB
        }
      });

      // 2. Atualização Atômica de Estoque (Evita Race Condition no DB)
      for (const item of cart) {
        const estoque = await tx.produto.update({
          where: { id: item.produtoId },
          data: { 
            estoqueAtual: { decrement: item.quantidade } // Comando direto no Postgres
          },
          select: { nome: true, estoqueAtual: true, estoqueInicial: true, tenantId: true }
        });

        // Garantia de isolamento do tenant (Double-check)
        if (estoque.tenantId !== tenantId) {
          throw new Error('Tenant isolation violation detected.');
        }

        // 3. Logic Gate: Alerta de Estoque Crítico (< 10%)
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
        ? [`Atenção: Estoque crítico para ${criticalItems.join(', ')}`] 
        : null
    };
  }
}
