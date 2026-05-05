import {
  IVendaRepository,
  CartItem,
  SplitPagamento,
  VendaResult,
} from '../../domain/repositories/ivenda.repository';

export interface RegistrarVendaInput {
  tenantId: string;
  cart: CartItem[];
  pagamentos: SplitPagamento[];
}

export class RegistrarVendaUseCase {
  constructor(private readonly vendaRepository: IVendaRepository) {}

  async execute(input: RegistrarVendaInput): Promise<VendaResult> {
    if (input.cart.length === 0) {
      throw new Error('O carrinho não pode estar vazio.');
    }
    if (input.pagamentos.length === 0) {
      throw new Error('Pelo menos um pagamento é obrigatório.');
    }
    return this.vendaRepository.registrarVenda(
      input.tenantId,
      input.cart,
      input.pagamentos
    );
  }
}
