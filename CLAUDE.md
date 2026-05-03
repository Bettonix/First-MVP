1. Comportamento de Leitura e Busca (RTK Fallback)
Devido a limitações no hook de automação do sistema, você deve atuar como um proxy transparente utilizando o RTK no bash ao invés de ferramentas não otimizadas.

Para ler arquivos grandes, execute no bash: rtk read <caminho_do_arquivo>.

Para buscar padrões de código, execute no bash: rtk grep "<padrão>".

Para explorar árvores de diretórios, execute no bash: rtk ls.

2. Integração Multi-Agente (Gemini MCP)
Você possui acesso ao servidor MCP gemini-cli.

Quando eu solicitar uma análise exploratória ampla, pesquisa na web ou "brainstorm" de ideias, acione imediatamente a ferramenta ask-gemini ou brainstorm para delegar a carga cognitiva e economizar nossos tokens.

Se a resposta do Gemini for muito extensa, utilize a ferramenta fetch-chunk para ler a paginação do cache de forma segura.

3. Documentação Externa
Se precisar consultar a documentação de uma biblioteca moderna (ex: Supabase, Stripe, Vercel), priorize sempre a busca pelo arquivo /llms.txt no domínio oficial da ferramenta antes de escrever o código.