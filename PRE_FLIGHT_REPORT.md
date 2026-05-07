# 🛫 Pre-Flight Report — First MVP
**Data:** 2026-05-07 16:17  
**Engenheiro:** Kiro (QA/DevSecOps Audit)  
**Branch:** main  
**Commit:** 33bd84d

---

## 🔴 BLOCKERS — Impedem o Deploy

### B-01 · `console.log` de debug em componente de produção
**Arquivo:** `src/components/QuickAddSheet.tsx:171`  
**Código:** `console.log("📤 Enviando atualização para ID:", editProduct.id);`  
**Risco:** Expõe IDs internos de produtos no console do navegador do cliente em produção.  
**Ação:** Remover a linha.

### B-02 · `NEXT_PUBLIC_SITE_URL` com fallback para `localhost` em `utils.ts`
**Arquivo:** `src/lib/utils.ts:5`  
**Código:** `"http://localhost:3000/"`  
**Risco:** Se a variável `NEXT_PUBLIC_SITE_URL` não for configurada na Vercel/host, todas as URLs de callback OAuth (Supabase Auth) apontarão para localhost e o login quebrará em produção.  
**Ação:** Garantir que `NEXT_PUBLIC_SITE_URL` esteja definida no painel da Vercel antes do deploy. O fallback em si é aceitável, mas a variável é obrigatória.

### B-03 · `NEXT_PUBLIC_SITE_URL=http://localhost:3000` no `.env.example`
**Arquivo:** `.env.example`  
**Risco:** Desenvolvedores que copiarem o `.env.example` sem alterar o valor terão o OAuth quebrado. O comentário explica, mas o valor padrão é perigoso.  
**Ação:** Substituir o valor por `NEXT_PUBLIC_SITE_URL=https://SEU_DOMINIO.vercel.app` para forçar a configuração consciente.

---

## 🟡 WARNINGS — Não bloqueiam, mas devem ser revistos

### W-01 · `middleware.ts` usando convenção depreciada
**Arquivo:** `middleware.ts` (raiz)  
**Aviso do build:** `The "middleware" file convention is deprecated. Please use "proxy" instead.`  
**Risco:** Pode quebrar em versões futuras do Next.js 16+.  
**Ação:** Renomear `middleware.ts` → `proxy.ts` conforme documentação do Next.js.

### W-02 · `as any[]` em massa no serviço de analytics
**Arquivo:** `src/core/application/services/analytics.service.ts` (linhas 25, 49, 64, 79, 97, 119, 140, 166, 193, 219, 254, 275)  
**Risco:** Perde type-safety em queries raw do Prisma. Erros de schema passam silenciosamente.  
**Ação:** Criar interfaces tipadas para os resultados das queries raw (ex: `interface VendaRow { ... }`).

### W-03 · `eslint-disable-next-line react-hooks/exhaustive-deps` em 4 lugares
**Arquivos:**
- `src/components/PinAuthModal.tsx:38`
- `src/components/PDVContainer.tsx:663`
- `src/components/IdleLockScreen.tsx:45`
- `src/components/IdleLockScreen.tsx:54`  
**Risco:** Supressões de lint em hooks podem mascarar bugs de stale closure ou loops infinitos.  
**Ação:** Revisar cada caso e corrigir a dependência real em vez de suprimir.

### W-04 · `console.log` de debug em `QuickAddSheet` (duplicado do B-01)
Já listado em B-01.

### W-05 · `next.config.ts` sem Security Headers
**Arquivo:** `next.config.ts`  
**Código atual:** Config vazia (`{}`).  
**Risco:** Sem `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options` e `Strict-Transport-Security`, a aplicação fica vulnerável a clickjacking e XSS.  
**Ação recomendada:**
```ts
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];
```

### W-06 · Índice faltando em `Turno.tenantId` (standalone)
**Arquivo:** `prisma/schema.prisma`  
**Situação:** `Turno` tem `@@index([tenantId, status])` mas não tem `@@index([tenantId])` isolado.  
**Risco:** Queries que buscam todos os turnos de um tenant sem filtrar por status (ex: relatórios históricos) farão full scan.  
**Ação:** Avaliar se há queries sem filtro de `status` e adicionar o índice se necessário.

### W-07 · `gerenciarEstoque` com `@default(true)` no schema mas `false` no código
**Arquivo:** `prisma/schema.prisma:112`  
**Código:** `gerenciarEstoque Boolean @default(true) @map("gerenciar_estoque")`  
**Conflito:** O `produtoSchema` Zod e o `ProductForm` usam `default(false)`.  
**Risco:** Produtos criados diretamente via SQL/migrations terão `gerenciarEstoque=true` por padrão, mas produtos criados via app terão `false`. Inconsistência silenciosa.  
**Ação:** Alinhar o `@default` do Prisma com o default do Zod (`false`).

### W-08 · `console.error` em error boundaries (aceitável, mas verificar)
**Arquivos:**
- `src/app/(pdv)/error.tsx:15` — `console.error("[PDVError]", error)`
- `src/app/error.tsx:14` — `console.error("[GlobalError]", error)`  
**Situação:** `console.error` em error boundaries é prática aceitável para debugging, mas em produção deve ser substituído por um serviço de monitoramento (ex: Sentry).  
**Ação:** Integrar Sentry ou similar antes do go-live para capturar erros de produção.

---

## 🟢 PASS — Validado e aprovado

| # | Item | Detalhe |
|---|------|---------|
| P-01 | **Build de produção** | `npm run build` finaliza sem erros. TypeScript e Turbopack compilam com sucesso. 9 rotas geradas. |
| P-02 | **TypeScript** | Zero erros de tipagem (`rtk tsc` limpo). |
| P-03 | **SonarQube** | 0 issues em aberto (última análise). |
| P-04 | **Playwright** | 41/41 testes passando (Desktop Chrome, iPhone 14, Pixel 5). |
| P-05 | **Sem localhost em chamadas de API** | Nenhum `fetch("http://localhost")` encontrado em `src/`. O único localhost é o fallback de URL em `utils.ts` (coberto em B-02). |
| P-06 | **`.env.example` sem secrets reais** | Nenhuma chave real, token ou senha vazada. Apenas placeholders (`YOUR_PROJECT`, `your_anon_key_here`, `USER`, `PASSWORD`). |
| P-07 | **Índices Prisma** | Todos os modelos com FK possuem `@@index` correspondente: `Profile[vendedorId]`, `Mesa[tenantId]`, `Comanda[tenantId,status]`, `Comanda[mesaId]`, `MovimentacaoFinanceira[tenantId,turnoId]`, `Produto[tenantId,isFavorito]`, `Produto[tenantId,ativo]`, `MovimentacaoEstoque[tenantId,produtoId]`, `Venda[tenantId,criadoEm]`, `Venda[tenantId,metodoPagto]`, `Pagamento[vendaId]`. |
| P-08 | **Sem TODOs/FIXMEs** | Nenhum `TODO:` ou `FIXME:` encontrado no código-fonte. |
| P-09 | **`console.error` em server actions** | Os `console.error` em `Receipt.tsx`, `PDVContainer.tsx`, `api/vendas/route.ts` e `auth/callback/route.ts` são erros legítimos de runtime, não debug. Aceitáveis. |
| P-10 | **Responsividade mobile** | Layout auditado e corrigido para iPhone 14 (390px) e Pixel 5 (393px). Snapshots visuais atualizados. |
| P-11 | **Seed data cleanup** | `wipeSeedData()` implementada com cutoff de 24h para evitar deleção acidental de dados reais. |
| P-12 | **Decremento atômico de estoque** | `depleteStock` usa `{ decrement: quantidade }` do Prisma — race-condition safe. |

---

## 📋 Checklist de Deploy

Antes de fazer o deploy, confirme:

- [ ] `NEXT_PUBLIC_SITE_URL` configurada na Vercel com o domínio real
- [ ] `DATABASE_URL` e `DATABASE_URL2` configuradas com as credenciais do Supabase de produção
- [ ] `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` configuradas
- [ ] Remover `console.log` em `QuickAddSheet.tsx:171` (B-01)
- [ ] Renomear `middleware.ts` → `proxy.ts` (W-01)
- [ ] Alinhar `gerenciarEstoque @default` no Prisma para `false` (W-07)
- [ ] Adicionar Security Headers no `next.config.ts` (W-05)
- [ ] Executar `npx prisma migrate deploy` no banco de produção

---

*Relatório gerado automaticamente por Kiro — Pre-Flight Audit v1.0*
