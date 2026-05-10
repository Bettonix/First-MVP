# 📑 DIRETRIZES UNIVERSAIS: PROJETO FIRST-MVP

## 1. Escopo e Arquitetura
- **Projeto:** Aplicação SaaS de Gestão/PDV.
- **Tech Stack:** Next.js (App Router), React, Node.js, Prisma ORM, Supabase (PostgreSQL), Stripe.
- **Padrão de Código:** TypeScript rigoroso (**ZERO `any`**). Priorize componentes funcionais, modulares e atômicos. Use Zod para validação de esquemas.

## 2. Otimização de Contexto e Terminal (RTK Proxy)
O ambiente possui o hook **rtk-ai** ativo. Para garantir a economia de 60-90% de tokens e manter a janela de contexto limpa:
- **Navegação:** Use `rtk ls` para diretórios e `rtk smart <arquivo>` para entender a lógica antes de propor mudanças.
- **Leitura:** Para arquivos grandes, prefira `rtk read <arquivo> -l aggressive` (apenas assinaturas).
- **Qualidade:** Use `rtk tsc` para diagnosticar erros de tipagem e `rtk lint` para estilo.
- **Comandos Proibidos:** É proibido usar `ls -la`, `cat` puro ou `grep` sem o prefixo `rtk` em saídas que excedam 20 linhas.

## 3. Segurança e Banco de Dados
- **RLS:** Todo acesso ao Supabase deve respeitar as políticas de **Row Level Security**.
- **Prisma:** Nunca realize alterações estruturais no `schema.prisma` ou migrações (`rtk prisma migrate dev`) sem confirmação explícita.
- **Atomicidade:** Operações complexas devem ser encapsuladas em `prisma.$transaction`.

## 4. Integrações e Pagamentos
- **Stripe:** Nenhuma alteração em webhooks ou fluxos de checkout sem revisão de segurança.
- **Segredos:** Nunca imprima variáveis de ambiente (`.env`) ou chaves privadas em logs.