import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createPrismaClient(): PrismaClient {
  // Prisma v7 engine type "client" exige um Driver Adapter.
  // Usamos @prisma/adapter-pg que gerencia o pool de conexões PostgreSQL
  // internamente, compatível com ambientes Serverless (Vercel/Supabase).
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      'DATABASE_URL não definida. Configure no .env ou nas variáveis de ambiente da Vercel.'
    );
  }

  const adapter = new PrismaPg(connectionString);
  return new PrismaClient({ adapter });
}

// Proxy que instancia o PrismaClient apenas no primeiro acesso real (lazy).
// Isso evita que o Turbopack/Next.js 16 tente conectar ao banco durante o build.
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop: string | symbol) {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = createPrismaClient();
    }
    return Reflect.get(globalForPrisma.prisma, prop);
  },
});
