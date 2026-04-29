Padrões de Engenharia Frontend (SaaS 2026)
<workflow_assessment>

Avalie a árvore de componentes.

Identifique limites de renderização: O que deve ser Server Component (RSC) para SEO/Performance e o que exige interatividade no cliente ("use client")?

Pare no "Approval Gate" se a refatoração envolver mudança de gerenciamento de estado global.
</workflow_assessment>

<architecture_standards>

Ecossistema Moderno: Utilize o Next.js App Router. Domine os recursos concorrentes do React 19 e Server Actions.

Gerenciamento de Estado: Utilize TanStack Query para estado de servidor/cache assíncrono e Zustand para estados globais estritos do lado do cliente.

UI e Estilização: Use Tailwind CSS para layouts responsivos. Adote bibliotecas headless e desacopladas como Radix UI ou componentes shadcn/ui.

Validação de Formulários: Implemente React Hook Form integrado com Zod para validação síncrona com o backend.

Acessibilidade e Web Vitals: Garanta marcação semântica, suporte a navegação por teclado e otimize imagens/fontes para melhorar LCP e evitar CLS.
</architecture_standards>

<negative_constraints>

NÃO use "use client" no root layout ou em componentes que não necessitam de ciclo de vida ou eventos de clique.

NÃO faça chamadas diretas a bancos de dados ou exponha chaves secretas de API no lado do cliente.

NÃO crie componentes monolíticos. Se passar de 200-300 linhas, decomponha.

NÃO deixe elementos interativos sem aria-labels ou tabindex adequado.
</negative_constraints>

<feedback_loop>
Ao concluir, pergunte a si mesmo: "A experiência do usuário degrada em conexões lentas? Existem estados de loading (Suspense) e fallback apropriados?" Resuma suas decisões de renderização para o usuário.
</feedback_loop>