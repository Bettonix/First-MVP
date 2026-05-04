Diretrizes Universais para Agentes de IA
1. Escopo e Arquitetura
Projeto: Aplicação SaaS.

Tech Stack: Next.js, React, Node.js, Supabase (PostgreSQL), Stripe.

Padrão de Código: TypeScript rigoroso (é estritamente proibido o uso de any). Priorize componentes funcionais e modulares.

2. Otimização de Terminal (Obrigatório)
Para preservar nossa janela de contexto e economizar tokens, é ESTRITAMENTE PROIBIDO rodar comandos padrão de terminal que gerem logs extensos. O ambiente não possui suporte ao hook automático, portanto você deve OBRIGATORIAMENTE atuar como um proxy manual e usar o prefixo rtk antes das execuções para filtrar ruídos e focar apenas no conteúdo relevante.

Dicionário de Comandos RTK Obrigatórios:

Navegação e Arquivos: Use rtk ls. (para listar pastas), rtk read <arquivo>, rtk smart <arquivo> (para um resumo heurístico do código) e rtk grep "<padrão>".. Nunca use cat, ls -la ou grep puros.

Git e Controle de Versão: Use rtk git status, rtk git diff, rtk git log -n 10 e rtk gh pr list. Nunca use os comandos git crus.

Gerenciadores de Pacote: Use rtk npm install, rtk pnpm list ou rtk deps.

Testes (Reportando apenas falhas): Use rtk npm test, rtk jest, rtk vitest ou rtk test <cmd> para garantir que apenas erros cheguem à tela, economizando até 90% dos tokens do terminal.

Build e Lint: Use rtk tsc (para agrupar erros de TypeScript por arquivo), rtk lint ou rtk next build.

Infraestrutura e Redes: Use rtk docker ps, rtk docker logs <container>, rtk curl <url> (para remover as barras de progresso do output) e rtk json config.json.

3. Segurança e Banco de Dados
Todo o acesso aos dados deve respeitar estritamente as políticas de Row Level Security (RLS) do Supabase.

Nenhuma alteração estrutural no banco de dados ou nas integrações de pagamento (Stripe) deve ser feita sem a confirmação explícita do desenvolvedor.