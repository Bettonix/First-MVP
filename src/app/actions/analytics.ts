"use server";

import { unstable_cache } from "next/cache";
import { AnalyticsService, type DashboardFilters } from "@/core/application/services/analytics.service";
import { getTenantIdOrRedirect } from "@/lib/auth";

const analyticsService = new AnalyticsService();

function periodToStartDate(period: string): Date {
  const now = new Date();
  switch (period) {
    case "today": { const d = new Date(now); d.setHours(0, 0, 0, 0); return d; }
    case "7d":    { const d = new Date(now); d.setDate(now.getDate() - 6); d.setHours(0, 0, 0, 0); return d; }
    case "month": { return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0); }
    case "30d":
    default:      { const d = new Date(now); d.setDate(now.getDate() - 29); d.setHours(0, 0, 0, 0); return d; }
  }
}

export async function getFullDashboardStats(
  period: string = "30d",
  filters: DashboardFilters = {}
) {
  const tenantId = await getTenantIdOrRedirect();
  const cacheKey = `full-dashboard-${tenantId}-${period}-${filters.metodo ?? "all"}-${filters.categoria ?? "all"}`;

  const cached = unstable_cache(
    async (tId: string, p: string, f: DashboardFilters) => {
      const startDate = periodToStartDate(p);

      const [periodStats, revenueByDay, paymentDistribution, periodRevenue, topProducts, categorias] =
        await Promise.all([
          analyticsService.getPeriodStats(tId, startDate, f),
          analyticsService.getRevenueByDayFiltered(tId, startDate, f),
          analyticsService.getPaymentDistributionFiltered(tId, startDate, f),
          analyticsService.getPeriodRevenue(tId),
          analyticsService.getTopProductsFiltered(tId, startDate, f),
          analyticsService.getCategorias(tId, startDate),
        ]);

      return {
        periodTotal:         periodStats.totalCentavos,
        qtdPedidos:          periodStats.qtdPedidos,
        ticketMedioCentavos: periodStats.ticketMedioCentavos,
        revenueByDay,
        paymentDistribution,
        periodRevenue,
        topProducts,
        categorias,
      };
    },
    [cacheKey],
    { tags: ["dashboard-stats", `tenant-${tenantId}`], revalidate: 3600 }
  );

  return cached(tenantId, period, filters);
}

export async function getDashboardStats(days: number = 7) {
  const tenantId = await getTenantIdOrRedirect();

  const cachedStats = unstable_cache(
    async (tId: string, d: number) => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - d);

      const baseStartDate = new Date(startDate);
      baseStartDate.setDate(baseStartDate.getDate() - 7);

      const [volumeByHour, topProducts, growthData] = await Promise.all([
        analyticsService.getSalesVolumeByHour(tId, startDate),
        analyticsService.getTopProducts(tId, startDate),
        analyticsService.getVolumeGrowth(tId, startDate, baseStartDate),
      ]);

      let revenueGrowth = 0;
      if (growthData.baseVolumeCentavos === 0) {
        revenueGrowth = growthData.currentVolumeCentavos > 0 ? 100 : 0;
      } else {
        revenueGrowth =
          ((growthData.currentVolumeCentavos - growthData.baseVolumeCentavos) /
            growthData.baseVolumeCentavos) *
          100;
      }

      return {
        volumeByHour,
        topProducts,
        totalReceitaCentavos: growthData.currentVolumeCentavos,
        revenueGrowth: Number(revenueGrowth.toFixed(1)),
      };
    },
    [`dashboard-stats-${tenantId}-${days}`],
    { tags: ["dashboard-stats", `tenant-${tenantId}`], revalidate: 3600 }
  );

  return cachedStats(tenantId, days);
}
