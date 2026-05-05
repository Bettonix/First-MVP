/**
 * Seed de stress test — 100 vendas fictícias nos últimos 30 dias
 * Cria Vendedor + Turno seed se não existirem.
 * Uso: npx tsx scripts/seed-dashboard-test.ts
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const DB_URL = process.env.DATABASE_URL2;
if (!DB_URL) {
  console.error("❌ DATABASE_URL2 não definida");
  process.exit(1);
}

const adapter = new PrismaPg(DB_URL);
const prisma = new PrismaClient({ adapter });

const METODOS = ["PIX", "DINHEIRO", "MISTO"];

const PRODUTOS_MOCK = [
  { nome: "Espresso",          precoCentavos: 600,  categoria: "Bebidas"  },
  { nome: "Cappuccino",        precoCentavos: 1200, categoria: "Bebidas"  },
  { nome: "Latte",             precoCentavos: 1400, categoria: "Bebidas"  },
  { nome: "Suco de Laranja",   precoCentavos: 900,  categoria: "Bebidas"  },
  { nome: "Pão de Queijo",     precoCentavos: 500,  categoria: "Salgados" },
  { nome: "Coxinha",           precoCentavos: 700,  categoria: "Salgados" },
  { nome: "Croissant",         precoCentavos: 1100, categoria: "Padaria"  },
  { nome: "Bolo de Cenoura",   precoCentavos: 1500, categoria: "Doces"    },
  { nome: "Brigadeiro",        precoCentavos: 400,  categoria: "Doces"    },
  { nome: "Sanduíche Natural", precoCentavos: 1800, categoria: "Lanches"  },
  { nome: "Wrap de Frango",    precoCentavos: 2200, categoria: "Lanches"  },
  { nome: "Água Mineral",      precoCentavos: 300,  categoria: "Bebidas"  },
];

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randomDate(daysBack: number): Date {
  const now = new Date();
  const past = new Date(now);
  past.setDate(now.getDate() - daysBack);
  const d = new Date(past.getTime() + Math.random() * (now.getTime() - past.getTime()));
  d.setHours(rand(7, 22), rand(0, 59), rand(0, 59), 0);
  return d;
}

async function main() {
  // 1. Garante Vendedor seed
  const SEED_TENANT_ID = "seed-tenant-dev-001";
  const SEED_AUTH_ID   = "seed-auth-dev-001";

  let vendedor = await prisma.vendedor.findFirst({ select: { id: true, nomeLoja: true } });

  if (!vendedor) {
    console.log("🏗️  Criando Vendedor seed...");
    // Profile necessário por FK
    await prisma.profile.upsert({
      where: { id: SEED_AUTH_ID },
      create: { id: SEED_AUTH_ID, email: "seed@dev.local", name: "Dev Seed", role: "GERENTE" },
      update: {},
    });
    vendedor = await prisma.vendedor.create({
      data: {
        id:       SEED_TENANT_ID,
        authId:   SEED_AUTH_ID,
        nomeLoja: "Café Artesanal (Seed)",
        nicho:    "alimentacao",
      },
      select: { id: true, nomeLoja: true },
    });
    console.log(`✅ Vendedor criado: ${vendedor.nomeLoja}`);
  }

  const tenantId = vendedor.id;
  console.log(`🏪 Loja: ${vendedor.nomeLoja} (${tenantId})`);

  // 2. Turno seed
  let turno = await prisma.turno.findFirst({
    where: { tenantId, status: "ABERTO" },
    select: { id: true },
  });
  if (!turno) {
    turno = await prisma.turno.create({
      data: {
        tenantId,
        status: "FECHADO",
        valorInicialCentavos: 0,
        abertoEm: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        fechadoEm: new Date(),
      },
      select: { id: true },
    });
    console.log(`📋 Turno seed criado: ${turno.id}`);
  } else {
    console.log(`📋 Usando turno: ${turno.id}`);
  }
  const turnoId = turno.id;

  // 3. Insere 100 vendas em lotes de 20
  console.log("⚡ Inserindo 100 vendas em lotes de 20...");
  const TOTAL = 100;
  const BATCH = 20;
  let created = 0;

  for (let i = 0; i < TOTAL; i += BATCH) {
    const batchSize = Math.min(BATCH, TOTAL - i);
    await Promise.all(
      Array.from({ length: batchSize }, () => {
        const numItens = rand(1, 4);
        const itens = Array.from({ length: numItens }, () => {
          const p = randItem(PRODUTOS_MOCK);
          const qty = rand(1, 3);
          return {
            produtoId: `seed-${p.nome.toLowerCase().replace(/\s+/g, "-")}`,
            nome: p.nome,
            quantidade: qty,
            precoCentavos: p.precoCentavos,
            categoria: p.categoria,
          };
        });
        const totalCentavos = itens.reduce(
          (s, it) => s + it.precoCentavos * it.quantidade, 0
        );
        return prisma.venda.create({
          data: {
            tenantId,
            turnoId,
            totalCentavos,
            metodoPagto: randItem(METODOS),
            itens,
            criadoEm: randomDate(30),
          },
        });
      })
    );
    created += batchSize;
    console.log(`  ✅ ${created}/${TOTAL}`);
  }

  // 4. Resumo
  const stats = await prisma.venda.aggregate({
    where: { tenantId },
    _count: { id: true },
    _sum: { totalCentavos: true },
  });

  const byMetodo = await prisma.$queryRaw<{ metodoPagto: string; count: bigint }[]>`
    SELECT "metodoPagto", COUNT(*) as count
    FROM "Venda" WHERE tenant_id = ${tenantId}
    GROUP BY "metodoPagto" ORDER BY count DESC
  `;

  console.log("\n📊 Resumo:");
  console.log(`  Total de vendas: ${stats._count.id}`);
  console.log(`  Faturamento total: R$ ${((stats._sum.totalCentavos ?? 0) / 100).toFixed(2)}`);
  console.log(`  Por método: ${byMetodo.map(r => `${r.metodoPagto}(${r.count})`).join(", ")}`);
  console.log("\n✨ Seed concluído!");
  console.log(`\n⚠️  Para ver no dashboard, faça login com o usuário seed ou`);
  console.log(`   rode o app e acesse /dashboard com tenantId: ${tenantId}`);
}

main()
  .catch((e) => { console.error("❌ Erro:", e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
