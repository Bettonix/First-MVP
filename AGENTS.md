Diretrizes Universais para Agentes de IA
1. Escopo e Arquitetura
Projeto: Aplicação SaaS.

Tech Stack: Next.js, React, Node.js, Supabase (PostgreSQL), Stripe.

Padrão de Código: TypeScript rigoroso (é estritamente proibido o uso de any). Priorize componentes funcionais e modulares.

2. Otimização de Terminal (Obrigatório)
Para preservar nossa janela de contexto e economizar tokens, é ESTRITAMENTE PROIBIDO rodar comandos padrão de terminal que gerem logs extensos. Você deve OBRIGATORIAMENTE usar o prefixo rtk antes das execuções:

Git: Use rtk git status, rtk git diff e rtk git log. Nunca use os comandos git puros.

Gerenciadores de Pacote: Use rtk npm install ou comandos equivalentes.

Testes e Build: Use rtk npm run build ou rtk npm test para garantir que apenas as falhas e os erros sejam reportados na tela.

3. Segurança e Banco de Dados
Todo o acesso aos dados deve respeitar estritamente as políticas de Row Level Security (RLS) do Supabase.

Nenhuma alteração estrutural no banco de dados ou nas integrações de pagamento (Stripe) deve ser feita sem a confirmação explícita do desenvolvedor.