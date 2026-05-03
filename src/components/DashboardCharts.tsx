"use client";

import dynamic from "next/dynamic";

export const RevenueChart = dynamic(
  () => import("./RevenueChart").then((m) => ({ default: m.RevenueChart })),
  { ssr: false, loading: () => <div className="h-64 bg-white/5 rounded-2xl animate-pulse" /> }
);

export const PaymentDistributionCard = dynamic(
  () => import("./PaymentDistributionCard").then((m) => ({ default: m.PaymentDistributionCard })),
  { ssr: false, loading: () => <div className="h-64 bg-white/5 rounded-2xl animate-pulse" /> }
);
