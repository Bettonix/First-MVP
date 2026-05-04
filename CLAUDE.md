1. OBRIGATÓRIO: Uso do RTK (Rust Token Killer) como Proxy
Devido a limitações de ambiente (WSL/Windows) que impedem o funcionamento do hook automático, você está ESTRITAMENTE PROIBIDO de usar as ferramentas internas de leitura e busca (Read, Grep, Glob) ou comandos Bash crus. Você DEVE SEMPRE atuar como um proxy manual, prefixando TODOS os comandos de terminal com rtk.

Lista de Comandos RTK Obrigatórios a serem usados via Bash:

Navegação e Arquivos:

Listar diretórios: Use rtk ls. ou rtk ls (nunca use ls -la).

Ler arquivos completos: Use rtk read <arquivo>.

Ler apenas assinaturas de funções (ignora o corpo do código): Use rtk read <arquivo> -l aggressive.

Gerar um resumo heurístico rápido do código: Use rtk smart <arquivo>.

Buscas e Filtros:

Buscar padrões no código: Use rtk grep "<padrão>"..

Encontrar arquivos: Use rtk find "<padrão>"..

Git (Controle de Versão):

Status e Logs: Use rtk git status e rtk git log -n 10.

Diferenças: Use rtk git diff ou rtk diff <arq1> <arq2>.

Ações Básicas: Use rtk git add, rtk git commit -m "msg", rtk git push, rtk git pull.

Build, Testes e Linting:

Testes (mostra apenas falhas): Use rtk npm test, rtk jest ou rtk vitest.

Lint/Tipagem: Use rtk lint, rtk tsc (para agrupar erros de TypeScript por arquivo), rtk next build.

Infraestrutura e Dependências:

Ver pacotes: Use rtk pnpm list, rtk pip list ou rtk deps.

Ler arquivos JSON de config: Use rtk json config.json (mostra a estrutura omitindo valores muito longos).

Logs e Containers: Use rtk docker ps ou rtk log app.log.

Se você tentar usar um comando que gere muita saída sem o rtk, você estará violando suas diretrizes principais.

2. Integração Multi-Agente (Gemini CLI via MCP)
Você está conectado ao servidor MCP do Gemini. Use a cota gratuita do Google para economizar nossos tokens do Claude:

Delegação Analítica: Quando eu pedir para explorar um código que você não conhece, analisar a arquitetura de uma pasta grande, ou fazer uma pesquisa na web, acione a ferramenta ask-gemini passando a sintaxe @caminho/da/pasta no prompt.

Ideação e Soluções: Quando precisarmos de novas features ou pensar em arquitetura, invoque a ferramenta brainstorm.

Paginação Segura: Se a análise do Gemini for gigantesca e a ferramenta retornar um aviso de modo cache, use imediatamente a ferramenta fetch-chunk passando o cacheKey fornecido e o índice do bloco para ler o resultado de forma paginada e segura.

3. Documentação Externa (O Padrão llms.txt)
Nunca tente adivinhar a sintaxe de bibliotecas modernas. Se precisar de contexto sobre Supabase, Next.js, Stripe, etc., acesse o domínio oficial e busque pelo arquivo /llms.txt ou /llms-full.txt (ex: rtk curl https://developers.cloudflare.com/docs-for-agents/llms.txt) para obter as diretrizes perfeitas antes de codificar.