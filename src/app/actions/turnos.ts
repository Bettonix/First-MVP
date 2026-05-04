"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { abrirTurnoSchema, fecharTurnoSchema, movimentacaoSchema } from "@/schemas/turno.schema";
import { z } from "zod";
import { getTenantIdOrRedirect } from "@/lib/auth";

export async function abrirTurno(data: z.infer<typeof abrirTurnoSchema>) {
  const result = abrirTurnoSchema.safeParse(data);
  if (!result.success) return { success: false, error: "Validação falhou" };

  const tenantId = await getTenantIdOrRedirect();

  // Verifica se já tem turno aberto
  const turnoAberto = await prisma.turno.findFirst({
    where: { tenantId, status: 'ABERTO' }
  });

  if (turnoAberto) return { success: false, error: "Já existe um turno aberto." };

  const valorCentavos = Math.round(result.data.valorInicial * 100);

  await prisma.turno.create({
    data: {
      tenantId,
      valorInicialCentavos: valorCentavos,
      status: 'ABERTO'
    }
  });

  revalidatePath("/");
  return { success: true };
}

export async function registrarMovimentacao(data: z.infer<typeof movimentacaoSchema>) {
  const result = movimentacaoSchema.safeParse(data);
  if (!result.success) return { success: false, error: "Validação falhou" };

  const tenantId = await getTenantIdOrRedirect();
  const turno = await prisma.turno.findFirst({ where: { tenantId, status: 'ABERTO' } });
  
  if (!turno) return { success: false, error: "Nenhum turno aberto." };

  const valorCentavos = Math.round(result.data.valor * 100);

  await prisma.movimentacaoFinanceira.create({
    data: {
      tenantId,
      turnoId: turno.id,
      tipo: result.data.tipo,
      valorCentavos,
      motivo: result.data.motivo
    }
  });

  return { success: true };
}

export async function fecharTurno(data: z.infer<typeof fecharTurnoSchema>) {
  const result = fecharTurnoSchema.safeParse(data);
  if (!result.success) return { success: false, error: "Validação falhou" };

  const tenantId = await getTenantIdOrRedirect();
  const turno = await prisma.turno.findFirst({ 
    where: { tenantId, status: 'ABERTO' },
    include: {
      vendas: true,
      movimentacoes: true
    }
  });

  if (!turno) return { success: false, error: "Nenhum turno aberto." };

  const valorFinalInformadoCentavos = Math.round(result.data.valorFinalInformado * 100);

  // Calcula Saldo Esperado (apenas Dinheiro entra na gaveta do caixa físico)
  const vendasEmDinheiro = turno.vendas
    .filter(v => v.metodoPagto === 'DINHEIRO' || v.metodoPagto === 'MISTO')
    .reduce((acc, v) => acc + v.totalCentavos, 0); // Simplificação: Assumindo total em MISTO como dinheiro físico na gaveta

  const reforcos = turno.movimentacoes
    .filter(m => m.tipo === 'ENTRADA')
    .reduce((acc, m) => acc + m.valorCentavos, 0);

  const sangrias = turno.movimentacoes
    .filter(m => m.tipo === 'SAIDA')
    .reduce((acc, m) => acc + m.valorCentavos, 0);

  const saldoEsperado = turno.valorInicialCentavos + vendasEmDinheiro + reforcos - sangrias;
  const diferenca = valorFinalInformadoCentavos - saldoEsperado;

  await prisma.turno.update({
    where: { id: turno.id },
    data: {
      status: 'FECHADO',
      valorFinalCentavos: valorFinalInformadoCentavos,
      fechadoEm: new Date()
    }
  });

  revalidatePath("/");
  return { 
    success: true, 
    relatorio: {
      esperado: saldoEsperado / 100,
      informado: valorFinalInformadoCentavos / 100,
      diferenca: diferenca / 100
    }
  };
}

// Para a UI saber o estado
export async function getEstadoTurno() {
  const tenantId = await getTenantIdOrRedirect();
  const turno = await prisma.turno.findFirst({ where: { tenantId, status: 'ABERTO' } });
  return { isAberto: !!turno };
}
