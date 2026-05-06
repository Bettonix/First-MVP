"use server";

import { prisma } from "@/lib/prisma";
import { getTenantIdOrRedirect } from "@/lib/auth";

// ── Dados mock para testes E2E (Playwright) ───────────────────────────────────
const TEST_BYPASS =
  process.env.PLAYWRIGHT_TEST_BYPASS === "1" &&
  process.env.NODE_ENV !== "production";

const MOCK_BOOTSTRAP_DATA = {
  nomeLoja: "Loja Teste E2E",
  instagramUrl: "",
  isTurnoAberto: true,
  insights: {
    totalHojeCentavos: 0,
    qtdHoje: 0,
    ticketMedioCentavos: 0,
    vaultCentavos: 0,
  },
  lowStockItems: [],
  recentSales: [],
  produtos: [
    {
      id: "1",
      nome: "Café Espresso",
      precoCentavos: 800,
      precoCustoCentavos: 200,
      categoria: "Bebidas",
      estoqueAtual: 50,
      estoqueInicial: 100,
      isFavorito: true,
    },
    {
      id: "2",
      nome: "Pão de Queijo",
      precoCentavos: 500,
      precoCustoCentavos: 150,
      categoria: "Lanches",
      estoqueAtual: 30,
      estoqueInicial: 50,
      isFavorito: true,
    },
  ],
};

/**
 * Busca todos os dados operacionais necessários para o PDV em uma
 * única chamada server-side, minimizando round-trips.
 */
export async function getPDVBootstrapData() {
  // Retorna dados mock em modo de teste E2E
  if (TEST_BYPASS) return MOCK_BOOTSTRAP_DATA;

  const tenantId = await getTenantIdOrRedirect();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [vendedor, turno, vendasHoje, ultimasVendas, produtosEstoque, todosProdutos] = await Promise.all([
    // Nome da loja
    prisma.vendedor.findUnique({
      where: { id: tenantId },
      select: { nomeLoja: true, instagramUrl: true },
    }),

    // Turno ativo (com movimentações para o cálculo do cofre)
    prisma.turno.findFirst({
      where: { tenantId, status: "ABERTO" },
      include: {
        vendas: { select: { totalCentavos: true, metodoPagto: true } },
        movimentacoes: { select: { tipo: true, valorCentavos: true } },
      },
    }),

    // Agregação: vendas de hoje
    prisma.venda.aggregate({
      where: { tenantId, criadoEm: { gte: todayStart } },
      _sum: { totalCentavos: true },
      _count: { id: true },
    }),

    // Últimas 5 vendas
    prisma.venda.findMany({
      where: { tenantId },
      orderBy: { criadoEm: "desc" },
      take: 5,
      select: {
        id: true,
        totalCentavos: true,
        metodoPagto: true,
        criadoEm: true,
      },
    }),

    // Produtos com estoque baixo (< 5)
    prisma.produto.findMany({
      where: { tenantId, estoqueAtual: { lt: 5 } },
      select: { id: true, nome: true, estoqueAtual: true },
      take: 10,
    }),

    // Todos os produtos para o PDV (favoritos primeiro, limite de segurança)
    prisma.produto.findMany({
      where: { tenantId },
      orderBy: [{ isFavorito: 'desc' }, { nome: 'asc' }],
      take: 300,
    }),
  ]);

  const totalHojeCentavos = vendasHoje._sum.totalCentavos ?? 0;
  const qtdHoje = vendasHoje._count.id ?? 0;
  const ticketMedioCentavos = qtdHoje > 0 ? Math.round(totalHojeCentavos / qtdHoje) : 0;

  // Cálculo do Cofre (Cash Vault): Inicial + Vendas Dinheiro + Reforços - Sangrias
  let vaultCentavos = 0;
  if (turno) {
    const vendasDinheiro = turno.vendas
      .filter(v => v.metodoPagto === 'DINHEIRO' || v.metodoPagto === 'MISTO')
      .reduce((acc, v) => acc + v.totalCentavos, 0);
    const reforcos = turno.movimentacoes
      .filter(m => m.tipo === 'ENTRADA')
      .reduce((acc, m) => acc + m.valorCentavos, 0);
    const sangrias = turno.movimentacoes
      .filter(m => m.tipo === 'SAIDA')
      .reduce((acc, m) => acc + m.valorCentavos, 0);
    vaultCentavos = turno.valorInicialCentavos + vendasDinheiro + reforcos - sangrias;
  }

  return {
    nomeLoja: vendedor?.nomeLoja ?? "Meu PDV",
    instagramUrl: vendedor?.instagramUrl ?? "",
    isTurnoAberto: !!turno,
    insights: {
      totalHojeCentavos,
      qtdHoje,
      ticketMedioCentavos,
      vaultCentavos,
    },
    lowStockItems: produtosEstoque.map(p => ({
      id: p.id.toString(),
      nome: p.nome,
      estoqueAtual: p.estoqueAtual,
    })),
    recentSales: ultimasVendas.map((v) => ({
      id: v.id.toString(),
      totalCentavos: v.totalCentavos,
      metodoPagto: v.metodoPagto,
      criadoEm: v.criadoEm.toISOString(),
    })),
    produtos: todosProdutos.map(p => ({
      id: p.id.toString(),
      nome: p.nome,
      precoCentavos: p.precoCentavos,
      precoCustoCentavos: p.precoCustoCentavos,
      categoria: p.categoria,
      estoqueAtual: p.estoqueAtual,
      estoqueInicial: p.estoqueInicial,
      isFavorito: p.isFavorito,
    })),
  };
}
