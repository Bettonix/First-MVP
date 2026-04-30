import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin;

  if (!code) {
    return NextResponse.redirect(`${siteUrl}/login?error=MissingCode`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('[auth/callback] exchangeCodeForSession error:', error.message);
    return NextResponse.redirect(`${siteUrl}/login?error=InvalidToken`);
  }

  // Verificar se o usuário já tem um Tenant (Vendedor) criado.
  // Se não tiver, redirecionar para o Onboarding.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${siteUrl}/login?error=SessionError`);
  }

  const vendedor = await prisma.vendedor.findUnique({
    where: { authId: user.id },
    select: { id: true },
  });

  // Tenant existe → vai direto para o PDV
  // Tenant não existe → primeiro acesso, vai para o Onboarding
  if (vendedor) {
    return NextResponse.redirect(`${siteUrl}/`);
  } else {
    return NextResponse.redirect(`${siteUrl}/onboarding`);
  }
}
