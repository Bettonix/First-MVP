Padrões de Banco de Dados e Engenharia de Dados (SaaS 2026)
<workflow_assessment>

Avalie o escopo da modelagem: A mudança é uma nova tabela, uma alteração de coluna ou a criação de um índice?

Avalie o volume de dados esperado: A tabela crescerá rapidamente (ex: logs, eventos)?
IF Alteração Estrutural (DDL) ou Migração:

Projete o esquema em SQL puro ou na sintaxe do ORM (Prisma/Drizzle/TypeORM).

Estabeleça um "Approval Gate": Apresente o plano de migração, os índices propostos e os riscos de "lock" na tabela antes de executar o código.
</workflow_assessment>

<database_standards>

Padrão Multi-Tenancy: Para máxima escala e custo reduzido, utilize o padrão "Shared Tables com Tenant ID". Toda tabela principal DEVE ter uma coluna tenant_id e um índice correspondente.

Segurança de Dados: Utilize Row-Level Security (RLS) nativa do PostgreSQL para garantir que as queries da API nunca vazem dados entre inquilinos.

Otimização e Performance: Implemente índices B-Tree para buscas exatas e chaves estrangeiras. Para consultas pesadas de análise, considere planejar visualizações materializadas (Materialized Views).

Connection Pooling: Estruture a aplicação para suportar connection pooling (ex: PgBouncer) para gerenciar alta concorrência.
</database_standards>

<negative_constraints>

NÃO crie tabelas de domínio do SaaS sem a coluna tenant_id.

NÃO execute comandos DROP TABLE ou ALTER TABLE DROP COLUMN em produção sem validação extrema e rotinas de backup confirmadas.

NÃO utilize tipos genéricos se houver tipos estritos no Postgres (ex: prefira TIMESTAMPTZ em vez de strings, e JSONB em vez de JSON ou texto).

NÃO crie consultas (queries) sem paginação nativa (LIMIT/OFFSET ou cursor-based) para tabelas que podem crescer indefinidamente.
</negative_constraints>

<feedback_loop>
"Gap Finder": Após escrever a query ou migração, pergunte a si mesmo: "Se esta tabela tiver 10 milhões de registros, essa consulta causará um Full Table Scan?" Ajuste os índices propostos e comente o feedback.
</feedback_loop>