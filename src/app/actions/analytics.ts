"use server";

import { unstable_cache } from "next/cache";
import { AnalyticsService } from "@/core/application/services/analytics.service";
import { getTenantIdOrRedirect } from "@/lib/auth";

// Cria instância do Service. Em apps maiores, isso pode vir de Injeção de Dependência
const analyticsService = new AnalyticsService();

function periodToStartDate(period: string): Date {
  const now = new Date();
  switch (period) {
    case 'today': {
      const d = new Date(now); d.setHours(0, 0, 0, 0); return d;
    }
    case '7d': {
      const d = new Date(now); d.setDate(now.getDate() - 6); d.setHours(0, 0, 0, 0); return d;
    }
    case 'month': {
      return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    }
    case '30d':
    default: {
      const d = new Date(now); d.setDate(now.getDate() - 29); d.setHours(0, 0, 0, 0); return d;
    }
  }
}

export async function getFullDashboardStats(period: string = '30d') {
  const tenantId = await getTenantIdOrRedirect();

  const cached = unstable_cache(
    async (tId: string, p: string) => {
      const startDate = periodToStartDate(p);

      const [periodTotal, revenueByDay, paymentDistribution, periodRevenue, topProducts] = await Promise.all([
        analyticsService.getPeriodTotal(tId, startDate),
        analyticsService.getRevenueByDay(tId, startDate),
        analyticsService.getPaymentDistribution(tId, startDate),
        analyticsService.getPeriodRevenue(tId),
        analyticsService.getTopProducts(tId, startDate),
      ]);

      return { periodTotal, revenueByDay, paymentDistribution, periodRevenue, topProducts };
    },
    [`full-dashboard-${tenantId}-${period}`],
    { tags: ['dashboard-stats', `tenant-${tenantId}`], revalidate: 3600 }
  );

  return cached(tenantId, period);
}

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
