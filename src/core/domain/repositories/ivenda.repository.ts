export interface CartItem {
  produtoId: bigint;
  nome: string;
  quantidade: number;
  precoCentavos: number;
}

export type MetodoPagamentoTipo =
  | 'PIX'
  | 'DINHEIRO'
  | 'CARTAO_CREDITO'
  | 'CARTAO_DEBITO';

export interface SplitPagamento {
  metodo: MetodoPagamentoTipo;
  valorCentavos: number;
}

/** @deprecated Use SplitPagamento[] — mantido para compatibilidade */
export interface MetodoPagamento {
  tipo: 'PIX' | 'DINHEIRO' | 'MISTO' | 'CARTAO';
  pixId?: string;
  pixCentavos?: number;
  dinheiroCentavos?: number;
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
    pagamentos: SplitPagamento[]
  ): Promise<VendaResult>;
}
