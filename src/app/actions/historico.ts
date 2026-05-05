"use server";

import { prisma } from "@/lib/prisma";
import { getTenantIdOrRedirect } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface VendaHistorico {
  id: string;
  totalCentavos: number;
  metodoPagto: string;
  criadoEm: string;
  itens: Array<{ produtoId: string; nome: string; quantidade: number; precoCentavos: number }>;
}

export interface ComandaHistorico {
  id: string;
  mesaNome: string;
  name: string | null;
  totalCentavos: number;
  itens: Array<{ nome: string; quantidade: number; precoCentavos: number }>;
  abertaEm: string;
  fechadaEm: string | null;
}

export interface HistoricoFilters {
  date?: string;       // ISO date string, defaults to today
  metodo?: string;     // PIX | DINHEIRO | MISTO | all
  busca?: string;      // search by ID suffix
}

export interface HistoricoResult {
  vendas: VendaHistorico[];
  comandas: ComandaHistorico[];
  totalVendasCentavos: number;
  totalComandasCentavos: number;
}

export async function getHistoricoCompleto(
  filters: HistoricoFilters = {}
): Promise<HistoricoResult> {
  const tenantId = await getTenantIdOrRedirect();

  const d = filters.date ? new Date(filters.date) : new Date();
  const start = new Date(d); start.setHours(0, 0, 0, 0);
  const end   = new Date(d); end.setHours(23, 59, 59, 999);

  const metodoFilter = filters.metodo && filters.metodo !== "all"
    ? { metodoPagto: filters.metodo }
    : {};

  const [vendasRaw, comandasRaw] = await Promise.all([
    prisma.venda.findMany({
      where: { tenantId, criadoEm: { gte: start, lte: end }, ...metodoFilter },
      orderBy: { criadoEm: "desc" },
      select: { id: true, totalCentavos: true, metodoPagto: true, criadoEm: true, itens: true },
    }),
    prisma.comanda.findMany({
      where: {
        tenantId,
        status: "FECHADA",
        fechadaEm: { gte: start, lte: end },
      },
      orderBy: { fechadaEm: "desc" },
      include: { mesa: { select: { nome: true } } },
    }),
  ]);

  const busca = filters.busca?.toLowerCase().trim();

  const vendas: VendaHistorico[] = vendasRaw
    .map((v) => ({
      id: v.id.toString(),
      totalCentavos: v.totalCentavos,
      metodoPagto: v.metodoPagto,
      criadoEm: v.criadoEm.toISOString(),
      itens: v.itens as VendaHistorico["itens"],
    }))
    .filter((v) => !busca || v.id.toLowerCase().includes(busca));

  const comandas: ComandaHistorico[] = comandasRaw
    .map((c) => ({
      id: c.id.toString(),
      mesaNome: c.mesa.nome,
      name: c.name ?? null,
      totalCentavos: c.totalCentavos,
      itens: (c.itens as unknown as ComandaHistorico["itens"]) ?? [],
      abertaEm: c.abertaEm.toISOString(),
      fechadaEm: c.fechadaEm?.toISOString() ?? null,
    }))
    .filter((c) => !busca || c.id.toLowerCase().includes(busca) || c.mesaNome.toLowerCase().includes(busca) || (c.name ?? "").toLowerCase().includes(busca));

  const totalVendasCentavos = vendas.reduce((s, v) => s + v.totalCentavos, 0);
  const totalComandasCentavos = comandas.reduce((s, c) => s + c.totalCentavos, 0);

  return { vendas, comandas, totalVendasCentavos, totalComandasCentavos };
}

export async function estornarVenda(
  vendaId: string
): Promise<{ error: string } | { ok: true }> {
  const tenantId = await getTenantIdOrRedirect();

  const venda = await prisma.venda.findFirst({
    where: { id: BigInt(vendaId), tenantId },
    select: { id: true },
  });
  if (!venda) return { error: "Venda não encontrada." };

  await prisma.venda.delete({ where: { id: BigInt(vendaId) } });

  revalidatePath("/historico");
  return { ok: true };
}
