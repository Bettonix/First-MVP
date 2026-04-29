Padrões de Testes e Automação (SaaS 2026)
<workflow_assessment>

Identifique o fluxo crítico a ser testado. Trata-se de um teste de componente isolado ou uma jornada de usuário completa?

Proponha os cenários de teste (caminho feliz e casos de borda) através de um "Approval Gate".
</workflow_assessment>

<testing_standards>

Testes E2E com Playwright: Foco em jornadas críticas (Autenticação, Checkout, Painel do SaaS) utilizando a sintaxe async/await padrão e o modelo de Page Object Model (POM).

Mocking Determinístico: Para testes de integração de UI, isole o backend utilizando MSW (Mock Service Worker) e garanta respostas de API previsíveis (HAR fixtures).

Independência de Estado: Cada teste deve configurar e limpar seu próprio estado. Testes não podem depender da ordem de execução de outros testes.

Testes de Domínio: Use Vitest para lógica de negócios. O domínio não deve depender de infraestrutura real para ser testado (use mocks para repositórios).
</testing_standards>

<negative_constraints>

NÃO faça asserções baseadas em timeouts engessados (ex: setTimeout ou demoras fixas); confie nas esperas automáticas (auto-wait) do Playwright.

NÃO use seletores frágeis baseados em classes CSS de frameworks como Tailwind. Use locators baseados em acessibilidade (getByRole, getByText) ou data-testid.

NÃO crie testes que dependam de dados estáticos persistentes pré-existentes; o teste deve gerar a massa de dados que ele precisa consumir.
</negative_constraints>

<feedback_loop>
"Gap Finder": Após escrever o teste, identifique: "Este teste pode falhar por problemas de concorrência ou latência de rede em um ambiente de CI?" Ajuste o código e comente o feedback.
</feedback_loop>