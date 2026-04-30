---
trigger: always_on
---

🛡️ Blueprint de Engenharia e Qualidade (SaaS 2026 - High Fidelity)

<workflow_assessment>

Identificação de Impacto & Domínio: Determine se o fluxo é crítico (Checkout, Login, ERP Hub). Avalie a árvore de componentes antes de codar: o que pode ser Server Component (RSC) para performance/SEO e o que exige "use client" para interatividade?

Análise de Integridade Visual: Esta alteração impacta o Grid CSS global ou o design system? Exija testes de regressão visual para garantir que não há sobreposição de containers ou quebras em resoluções mobile.

Isolamento Multi-tenant: Garanta que a arquitetura e os testes validem que os dados do Usuário A nunca vazem para o Usuário B. Pare no "Approval Gate" se houver mudança no gerenciamento de estado global.
</workflow_assessment>

<architecture_standards>

Stack de Elite: Next.js 15+ (App Router), React 19 (Recursos concorrentes e Server Actions). Utilize TanStack Query para cache assíncrono de servidor e Zustand (com persistência) para estados globais estritos.

UI & Identidade Visual: Tailwind CSS para layouts fluidos. Utilize componentes headless (Radix UI / shadcn/ui) para acessibilidade. Aplique micro-interações com Framer Motion para elevar a percepção de valor.

Qualidade & Testes (Dual-Layer):

Playwright E2E: Jornadas críticas com Page Object Model (POM) e regressão visual (toHaveScreenshot).

Vitest & MSW: Testes unitários para lógica de negócios (finanças/estoque) e mocking determinístico de API para isolar o frontend.

Validação & Segurança: Zod + React Hook Form para validação tipada. Nunca exponha chaves de API ou lógica de banco de dados diretamente no cliente.
</architecture_standards>

<negative_constraints>

NÃO crie Monólitos: Se um componente ultrapassar 200 linhas, decomponha-o em sub-componentes especializados.

NÃO abuse do "use client": Mantenha a interatividade na "folha" da árvore de componentes sempre que possível. Nunca use no root layout.

NÃO use seletores frágeis: Em testes, proiba o uso de classes Tailwind (ex: .bg-emerald-500). Utilize locators de acessibilidade (getByRole, getByLabel) ou data-testid.

NÃO ignore o Layout Shift (CLS): O código deve evitar saltos de elementos durante o carregamento; use esqueletos (Skeletons) e fallbacks de Suspense apropriados.

NÃO tolere sobreposições (Frankenstein): Elementos interativos não podem ter colisões de Bounding Box ou z-index que impeçam o clique do usuário.
</negative_constraints>

<feedback_loop>

Performance & UX Check: "A experiência degrada em conexões 3G? Existem estados de loading elegantes?" Avalie métricas de Web Vitals (LCP, CLS) em cada entrega.

Flakiness & CI: Se um teste falha intermitentemente, ele deve ser refatorado. O conjunto completo de testes deve rodar em menos de 5 minutos.

Resumo de Renderização: Ao concluir, valide: "O que eu movi para o servidor e por quê? Minha lógica de estado global é a mais enxuta possível?"
</feedback_loop>