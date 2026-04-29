Padrões de Engenharia Backend (SaaS 2026)
<workflow_assessment>
Antes de escrever código, faça uma avaliação silenciosa:

Escopo: Afeta domínio, infraestrutura ou apresentação?

Risco: Existe impacto em dados de inquilinos (multi-tenancy)?

IF Complexidade = Alta (Mudança de esquema, nova regra de negócio):

Projete primeiro: Descreva os modelos de domínio e as interfaces de repositório.

Estabeleça um "Approval Gate": Apresente o plano e aguarde aprovação.
ELSE:

Confirme o entendimento e proceda com a implementação guiada por testes (TDD).
</workflow_assessment>

<architecture_standards>

Clean Architecture: Separe estritamente em Camada de Domínio (regras de negócio puras), Camada de Aplicação (casos de uso), Camada de Infraestrutura (banco de dados, serviços externos) e Camada de Apresentação (Rotas HTTP/Controladores).

TypeScript Rigoroso: O modo "strict": true é absoluto. Modele os tipos de domínio para não refletirem respostas de API cruas.

Injeção de Dependências: A camada de domínio deve definir interfaces que a infraestrutura implementa, invertendo o controle.

Validação: Toda entrada externa DEVE ser validada usando Zod na camada de rotas antes de chegar aos Casos de Uso/Controladores.

Multi-tenancy: Em arquiteturas SaaS, se as tabelas forem compartilhadas, o tenant_id deve ser imposto em todas as queries e contextos de requisição para garantir o isolamento de dados.
</architecture_standards>

<negative_constraints>

NÃO coloque lógica de negócios em Controladores ou Rotas.

NÃO use o tipo any ou espalhe ignoradores de tipagem (@ts-ignore).

NÃO permita que o Domínio conheça o framework web (Express/Fastify) ou o ORM (Prisma/TypeORM).

NÃO construa queries complexas de SQL concatenando strings.
</negative_constraints>

<feedback_loop>
Ao concluir, aplique o "Gap Finder": "Quais são as falhas de isolamento de dados (tenant leakage) ou gargalos de performance (N+1 queries) nesta abordagem?" Apresente as considerações ao usuário.
</feedback_loop>