Diretrizes Globais do Ecossistema (Multi-Agent Context)
1. Escopo da Aplicação (Application Scope)
Este repositório contém a base de código de um micro-SaaS focado em. O sistema exige alta confiabilidade e uma estrutura modular.

2. Stack Tecnológica e Arquitetura
Frontend: Next.js (App Router), React, Tailwind CSS.

Backend e Banco de Dados: Supabase (PostgreSQL).

Faturamento e Assinaturas: Stripe.

Divisão de Trabalho de IA: O Gemini CLI é responsável pela exploração de código, leitura de logs e planejamento. O Claude Code é estritamente encarregado de implementar as refatorações arquiteturais e o código de produção.

3. Padrões de Codificação (Coding Standards)
TypeScript Rigoroso: É terminantemente proibido o uso do tipo any. Tipagens precisas e interfaces devem ser declaradas para todos os dados.

Simplicidade e Modularidade: Escreva componentes pequenos e reutilizáveis. Quebre tarefas complexas em etapas lógicas numeradas.

Resiliência: Trate os erros explicitamente e aplique verificações de nulidade (null checks) de maneira consistente.

4. Segurança e Manipulação de Dados (Crucial)
Segurança de Banco de Dados: O acesso aos dados deve ser governado inteiramente pelas regras de Row Level Security (RLS) do Supabase.

Permissões: Nunca crie, remova ou altere tabelas de banco de dados, regras de autenticação (Auth) ou lógicas de pagamento (Stripe) sem a permissão expressa do usuário humano.

O código deve estar blindado contra injeções SQL e falhas de Cross-Site Scripting (XSS).

5. Protocolo de Integração Contínua e Ferramentas (MCP)
Para ler esquemas de banco de dados diretamente, utilize o servidor MCP do Supabase conectado ao ambiente.

Se a documentação de uma biblioteca estiver ausente ou desatualizada, acione o servidor MCP de busca (como o Brave Search ou Context7) para validar os padrões de implementação antes de escrever o código.

Todas as execuções de testes automatizados devem ser finalizadas e ter seus logs analisados com sucesso antes de sugerir que a tarefa está "concluída".