"use server";

import { unstable_cache } from "next/cache";
import { AnalyticsService } from "@/core/application/services/analytics.service";
import { getTenantIdOrRedirect } from "@/lib/auth";

// Cria instância do Service. Em apps maiores, isso pode vir de Injeção de Dependência
const analyticsService = new AnalyticsService();

export async function getDashboardStats(days: number = 7) {
  const tenantId = await getTenantIdOrRedirect();
  
  // Usamos unstable_cache para evitar recomputar todo o relatório a cada f5
  // A tag 'dashboard-stats' permite que a invalidação ocorra apenas após uma nova venda.
  const cachedStats = unstable_cache(
    async (tId: string, d: number) => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - d);
      
      const baseStartDate = new Date(startDate);
      baseStartDate.setDate(baseStartDate.getDate() - 7); // Período base da semana anterior

      const [volumeByHour, topProducts, growthData] = await Promise.all([
        analyticsService.getSalesVolumeByHour(tId, startDate),
        analyticsService.getTopProducts(tId, startDate),
        analyticsService.getVolumeGrowth(tId, startDate, baseStartDate)
      ]);

      // Calcula o percentual de crescimento: ((Atual - Base) / Base) * 100
      let revenueGrowth = 0;
      if (growthData.baseVolumeCentavos === 0) {
        revenueGrowth = growthData.currentVolumeCentavos > 0 ? 100 : 0;
      } else {
        revenueGrowth = ((growthData.currentVolumeCentavos - growthData.baseVolumeCentavos) / growthData.baseVolumeCentavos) * 100;
      }

      return {
        volumeByHour,
        topProducts,
        totalReceitaCentavos: growthData.currentVolumeCentavos,
        revenueGrowth: Number(revenueGrowth.toFixed(1))
      };
    },
    [`dashboard-stats-${tenantId}-${days}`],
    {
      tags: ['dashboard-stats', `tenant-${tenantId}`],
      revalidate: 3600 // Fallback: Expira a cada 1 hora se não houver vendas
    }
  );

  return cachedStats(tenantId, days);
}
