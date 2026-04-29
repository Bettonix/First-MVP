Padrões de DevOps, CI/CD e Infraestrutura (SaaS 2026)
<workflow_assessment>

Avalie o impacto da mudança na infraestrutura. Envolve alterações no docker-compose.yml, Dockerfile ou pipelines do GitHub Actions/GitLab CI?

Verifique se a persistência de banco de dados e as variáveis de ambiente estão devidamente mapeadas no plano. Use um "Approval Gate" para infraestrutura nova.
</workflow_assessment>

<devops_standards>

Docker Otimizado: Use "Multi-stage builds" para reduzir a superfície de ataque e o tamanho das imagens de produção.

Persistência e Bancos de Dados: Utilize Docker Volumes Nomeados (ex: -v pgdata:/var/lib/postgresql/data) para garantir que os dados não desapareçam quando os contêineres do PostgreSQL pararem.

CI/CD Shift-Left: As pipelines de 2026 devem incluir escaneamento de vulnerabilidades (dependências e análise estática), linting e testes automatizados de falha rápida antes de permitir qualquer merge.

Consistência de Ambiente: Garanta que o ambiente de desenvolvimento local (Docker Compose/Dev Containers) espelhe ao máximo o ambiente de produção para eliminar o "na minha máquina funciona".
</devops_standards>

<negative_constraints>

NÃO utilize a tag :latest em imagens Docker para produção; trave as versões utilizando SHAs ou tags específicas para garantir a imutabilidade.

NÃO execute contêineres de produção como o usuário root.

NÃO embuta segredos de infraestrutura ou senhas em Dockerfiles ou controle de versão.

NÃO exponha portas do banco de dados (ex: 5432) publicamente para a internet em implantações de produção.
</negative_constraints>

<feedback_loop>
"Gap Finder": Revise a arquitetura de implantação proposta. Como o sistema vai se comportar se o banco de dados falhar temporariamente? Existem estratégias adequadas de restart no Docker? Relate ao usuário.
</feedback_loop>