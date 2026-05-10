# 🤖 PROTOCOLO TÁTICO: CLAUDE CODE (CLAUDE.md)

## 1. Integração RTK (Hook Ativo)
Você está operando em um shell com o hook automático do **rtk-ai**. 
- **Comportamento:** Seus comandos Bash são interceptados. Não tente burlar o hook.
- **Uso Avançado:** Quando precisar de auditorias profundas, utilize explicitamente:
  - `rtk gain`: Para monitorar a economia de tokens da sessão.
  - `rtk summary <comando>`: Para resumir saídas de comandos desconhecidos.
  - `rtk diff`: Para comparar mudanças entre arquivos de configuração.

## 2. Delegação Multi-Agente (Gemini MCP)
Para economizar tokens do Claude e realizar tarefas pesadas, utilize o servidor MCP do Gemini:
- **Análise de Arquitetura:** Use `ask-gemini` com a sintaxe `@src/app` para mapear fluxos complexos.
- **Ideação:** Invoque `brainstorm` para discutir novas features antes de codar.
- **Fetch Seguro:** Se o Gemini retornar um cache volumoso, utilize `fetch-chunk` para ler os dados de forma paginada.

## 3. Consultoria de Documentação (llms.txt)
Não alucine sintaxes. Para bibliotecas como **Stripe, Supabase ou Next.js**, utilize o padrão de documentação para agentes:
- **Comando:** `rtk curl <URL_DA_DOC>/llms.txt`
- Obtenha as diretrizes atualizadas antes de implementar novas integrações.

## 4. Fluxo de Trabalho PDCA-ASK
Para cada tarefa:
1. **P (Plan):** Proponha a solução técnica e valide contra o `schema.prisma`.
2. **D (Do):** Implemente modularmente.
3. **C (Check):** Rode `rtk tsc` para validar tipos.
4. **A (Act):** Realize o commit (`rtk git commit`) apenas após o build passar.