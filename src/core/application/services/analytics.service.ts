import { prisma } from "@/lib/prisma";

export class AnalyticsService {
  /**
   * Heatmap de Vendas: Agrupa o volume financeiro por faixa de hora
   * Utiliza 'date_trunc' nativo do Postgres para máxima performance.
   */
  async getSalesVolumeByHour(tenantId: string, startDate: Date) {
    const rawData = await prisma.$queryRaw`
      SELECT 
        date_trunc('hour', "criadoEm") as time_bucket,
        CAST(SUM("totalCentavos") AS INTEGER) as total_volume
      FROM "Venda"
      WHERE tenant_id = ${tenantId} AND "criadoEm" >= ${startDate}
      GROUP BY time_bucket
      ORDER BY time_bucket ASC;
    `;

    return (rawData as any[]).map((row) => ({
      hour: new Date(row.time_bucket).toISOString(),
      volumeCentavos: Number(row.total_volume),
    }));
  }

  /**
   * Ranking de Lucratividade (Top Produtos):
   * Desconstrói o array JSONB nativamente no banco evitando 
   * consumo excessivo de memória RAM no servidor Node.js
   */
  async getTopProducts(tenantId: string, startDate: Date) {
    const rawData = await prisma.$queryRaw`
      SELECT 
        item->>'nome' as product_name,
        CAST(SUM(CAST(item->>'quantidade' AS INTEGER)) AS INTEGER) as total_sold,
        CAST(SUM(CAST(item->>'precoCentavos' AS INTEGER) * CAST(item->>'quantidade' AS INTEGER)) AS INTEGER) as total_revenue
      FROM "Venda" v, jsonb_array_elements(v.itens) as item
      WHERE v.tenant_id = ${tenantId} AND v."criadoEm" >= ${startDate}
      GROUP BY item->>'nome'
      ORDER BY total_revenue DESC
      LIMIT 10;
    `;

    return (rawData as any[]).map((row) => ({
      nome: row.product_name,
      quantidadeTotal: Number(row.total_sold),
      receitaTotalCentavos: Number(row.total_revenue),
    }));
  }

  /** Faturamento diário dos últimos N dias */
  async getRevenueByDay(tenantId: string, days: number) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days + 1);
    startDate.setHours(0, 0, 0, 0);

    const rawData = await prisma.$queryRaw`
      SELECT
        date_trunc('day', "criadoEm") as day,
        CAST(SUM("totalCentavos") AS INTEGER) as total
      FROM "Venda"
      WHERE tenant_id = ${tenantId} AND "criadoEm" >= ${startDate}
      GROUP BY day
      ORDER BY day ASC;
    `;
    return (rawData as any[]).map((r) => ({
      date: new Date(r.day).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      totalCentavos: Number(r.total),
    }));
  }

  /** Distribuição de pagamentos por método */
  async getPaymentDistribution(tenantId: string, startDate: Date) {
    const rawData = await prisma.$queryRaw`
      SELECT
        "metodoPagto",
        COUNT(*)::INTEGER as quantidade,
        CAST(SUM("totalCentavos") AS INTEGER) as total
      FROM "Venda"
      WHERE tenant_id = ${tenantId} AND "criadoEm" >= ${startDate}
      GROUP BY "metodoPagto"
      ORDER BY total DESC;
    `;
    return (rawData as any[]).map((r) => ({
      metodo: r.metodoPagto as string,
      quantidade: Number(r.quantidade),
      totalCentavos: Number(r.total),
    }));
  }

  /** Receita por período: hoje, semana, mês — uma única query */
  async getPeriodRevenue(tenantId: string) {
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const weekStart  = new Date(now); weekStart.setDate(now.getDate() - 6); weekStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

    const rawData = await prisma.$queryRaw`
      SELECT
        CAST(SUM(CASE WHEN "criadoEm" >= ${todayStart} THEN "totalCentavos" ELSE 0 END) AS BIGINT) as hoje,
        CAST(SUM(CASE WHEN "criadoEm" >= ${weekStart}  THEN "totalCentavos" ELSE 0 END) AS BIGINT) as semana,
        CAST(SUM(CASE WHEN "criadoEm" >= ${monthStart} THEN "totalCentavos" ELSE 0 END) AS BIGINT) as mes
      FROM "Venda"
      WHERE tenant_id = ${tenantId} AND "criadoEm" >= ${monthStart};
    `;
    const row = (rawData as any[])[0];
    return {
      hoje:   Number(row?.hoje   ?? 0),
      semana: Number(row?.semana ?? 0),
      mes:    Number(row?.mes    ?? 0),
    };
  }

  /**
   * Compara o faturamento de um período atual (ex: últimos 7 dias)
   * com um período base (ex: 7 dias antes do período atual) em UMA única query.
   */
  async getVolumeGrowth(tenantId: string, currentStartDate: Date, baseStartDate: Date) {
    const rawData = await prisma.$queryRaw`
      SELECT 
        CAST(SUM(CASE WHEN "criadoEm" >= ${currentStartDate} THEN "totalCentavos" ELSE 0 END) AS BIGINT) as current_volume,
        CAST(SUM(CASE WHEN "criadoEm" >= ${baseStartDate} AND "criadoEm" < ${currentStartDate} THEN "totalCentavos" ELSE 0 END) AS BIGINT) as base_volume
      FROM "Venda"
      WHERE tenant_id = ${tenantId} AND "criadoEm" >= ${baseStartDate};
    `;

    const row = (rawData as any[])[0];
    return {
      currentVolumeCentavos: Number(row?.current_volume || 0),
      baseVolumeCentavos: Number(row?.base_volume || 0),
    };
  }
}
