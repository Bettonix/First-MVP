---
trigger: always_on
---

🚀 Manifesto de Engenharia & Design (SaaS 2026 - High Fidelity)

<workflow_assessment>

Arquitetura Híbrida (React 19): Antes de codificar, desenhe a fronteira entre Server e Client. Use React Server Components (RSC) para 90% da estrutura (SEO e Performance) e "use client" apenas para ilhas de interatividade (formulários, botões, modais).

Auditoria de Grid & Flex: O layout deve ser inquebrável. Avalie se a estrutura suporta o "Bento Grid" (blocos modulares) sem colisões de z-index ou sobreposições amadoras.

Approval Gate de Performance: Pare se a solução introduzir dependências pesadas. O foco é manter o bundle leve e as interações em < 100ms.
</workflow_assessment>

<architecture_standards>

Stack Tecnológica de Vanguarda:

Framework: Next.js 15+ com App Router.

Data Fetching: Server Actions para mutações; TanStack Query para cache assíncrono e "Optimistic Updates".

Estado: Zustand com persistência para dados operacionais (Comandas/Carrinho).

Segurança: Tipagem estrita com TypeScript e validação de esquemas com Zod.

Modais Visuais & Tendências 2026:

Bento Grids: Organize dashboards em blocos modulares com rounded-3xl e sombras internas sutis.

Glassmorphism Elevado: Use backdrop-blur-xl com bordas semitransparentes (border-white/10) para criar profundidade.

OLED Dark Mode: Base em #050505 ou #0B0D11 com contrastes em Emerald (#10b981) e Slate.

Micro-interações & UX:

Framer Motion: Animações de entrada "Staggered", transições de estado suaves e feedbacks de "Spring" em botões.

Tactile Feedback: Feedback visual que simula toque (escalonamento sutil de 0.98 no clique).

Performance Core: LCP < 1.2s, CLS zero. Use Image do Next.js e esqueletos de carregamento (Skeletons) que espelham exatamente o componente final.
</architecture_standards>

<negative_constraints>

NÃO ao "Visual Frankenstein": Proibido o uso de absolute que flutue sem um container relative. Elementos não podem colidir ou tapar ações críticas.

NÃO aos Monólitos: Ficheiros com mais de 250 linhas devem ser refatorados em componentes atómicos.

NÃO ignore o "Dirty State": Campos de input nunca devem perder o foco ou o estado durante re-renderizações.

NÃO exponha a Infra: Proibido chamadas diretas ao banco de dados ou exposição de tokens no Frontend. Utilize Server Actions como ponte segura.

NÃO ignore a Acessibilidade: Proibido elementos clicáveis sem aria-label ou contraste inferior a 4.5:1.
</negative_constraints>

<feedback_loop>

UX Audit: "A interface parece uma ferramenta de luxo ou um protótipo? O 'feeling' das animações é fluido?"

Stress Test de Rede: "O app é utilizável em 3G instável? Os fallbacks de Suspense evitam o 'clapping' da tela?"

Justificação Técnica: Ao finalizar, explique quais padrões de React 19 (como useOptimistic ou useFormStatus) foram aplicados para garantir a robustez.
</feedback_loop>