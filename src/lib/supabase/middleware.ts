import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // ── Playwright test bypass ──────────────────────────────────────────────────
  // Permite que testes E2E acessem rotas protegidas sem autenticação real.
  // Ativado apenas quando PLAYWRIGHT_TEST_BYPASS=1 está definido no ambiente.
  // NUNCA habilitar em produção.
  if (
    process.env.PLAYWRIGHT_TEST_BYPASS === "1" &&
    process.env.NODE_ENV !== "production"
  ) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Rotas que não precisam de autenticação
  const isAuthRoute = request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/auth')

  // Proteger /app (PDV) e /dashboard
  const isProtectedRoute = request.nextUrl.pathname.startsWith('/app') || request.nextUrl.pathname.startsWith('/dashboard') || request.nextUrl.pathname.startsWith('/onboarding')

  if (!user && isProtectedRoute) {
    // Redireciona usuários não autenticados para a página de login
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && isAuthRoute) {
    // Redireciona usuários autenticados da página de login para o PDV
    const url = request.nextUrl.clone()
    url.pathname = '/app'
    return NextResponse.redirect(url)
  }

  // Tenant Verification logic could go here, but doing it inside Layouts or specific Middleware blocks is better
  return supabaseResponse
}
