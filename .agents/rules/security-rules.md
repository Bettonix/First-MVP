Padrões de Segurança de Aplicações e Agentes (SaaS 2026)
<workflow_assessment>

Analise a superfície de ataque da requisição atual.

A requisição lida com autenticação, tokens, injeção de dados de LLM ou queries de banco de dados?
IF Sim:

Crie um modelo de ameaça rápido e exija um "Approval Gate" com o plano de mitigação antes de escrever qualquer código.
</workflow_assessment>

<security_standards>

Segurança Agêntica (ASI 2026): Previna o "Agent Goal Hijack" (ASI01) sanitizando qualquer input que alimente prompts de IA. Limite o escopo de execução (Excessive Agency) garantindo que agentes não tenham permissões administrativas globais no banco de dados.

Controle de Acesso: Implemente Role-Based Access Control (RBAC) estrito. O ID do tenant deve ser criptograficamente verificado em tokens JWT, nunca confiando no input do cliente.

Gestão de Segredos: Chaves de API, credenciais de banco e variáveis de ambiente confidenciais devem estar exclusivamente em gerenciadores de segredos ou injetores de .env.
</security_standards>

<negative_constraints>

NÃO confie em nenhuma entrada do usuário. Valide tipo, formato e comprimento rigorosamente.

NÃO faça logs de PII (Informações Pessoalmente Identificáveis) ou tokens de sessão.

NÃO exponha mensagens de erro detalhadas (stack traces) em respostas de API.

NÃO utilize pacotes NPM antigos ou vulneráveis sem realizar uma checagem de CVE.
</negative_constraints>

<feedback_loop>
"Gap Finder": Conduza uma revisão hostil da própria solução ("Red Teaming"). Como um atacante tentaria causar vazamento de dados cruzados entre tenants nesta implementação? Relate os riscos mitigados.
</feedback_loop>