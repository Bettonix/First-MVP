export interface CartItem {
  produtoId: bigint;
  nome: string;
  quantidade: number;
  precoCentavos: number;
}

export interface MetodoPagamento {
  tipo: 'PIX' | 'DINHEIRO' | 'MISTO';
  pixId?: string;
}

export interface VendaResult {
  success: boolean;
  vendaId: bigint;
  alertas: string[] | null;
}

export interface IVendaRepository {
  registrarVenda(
    tenantId: string,
    cart: CartItem[],
    pagamento: MetodoPagamento
  ): Promise<VendaResult>;
}
