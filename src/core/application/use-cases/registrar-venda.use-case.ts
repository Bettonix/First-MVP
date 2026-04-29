import { IVendaRepository, CartItem, MetodoPagamento, VendaResult } from '../../domain/repositories/ivenda.repository';

export interface RegistrarVendaInput {
  tenantId: string;
  cart: CartItem[];
  pagamento: MetodoPagamento;
}

export class RegistrarVendaUseCase {
  constructor(private readonly vendaRepository: IVendaRepository) {}

  async execute(input: RegistrarVendaInput): Promise<VendaResult> {
    if (input.cart.length === 0) {
      throw new Error('O carrinho de compras não pode estar vazio.');
    }

    if (input.pagamento.tipo === 'PIX' && !input.pagamento.pixId) {
      throw new Error('Transações PIX exigem um ID de transação.');
    }

    // A regra de negócio atômica e o decremento do estoque 
    // são encapsulados pelo repositório para evitar data-races.
    return this.vendaRepository.registrarVenda(
      input.tenantId,
      input.cart,
      input.pagamento
    );
  }
}
