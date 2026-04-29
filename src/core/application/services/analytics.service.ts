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
