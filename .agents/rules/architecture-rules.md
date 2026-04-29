Padrões de Arquitetura e Integração de Sistemas (SaaS 2026)
<workflow_assessment>
Qualquer mudança estrutural substancial exige análise arquitetural:

Avalie a estratégia de escalonamento: Os limites do domínio (Bounded Contexts) estão sendo respeitados?

Classifique o acoplamento: O design proposto favorece comunicação síncrona de alto risco ou mensageria assíncrona resiliente?
IF Impacto = Arquitetural (Mudança de banco, novo microsserviço, filas de eventos):

Defina claramente a topologia e a estratégia de modelo de dados.

Faça obrigatoriamente um "Approval Gate" antes de iniciar arquivos e codificação real.
</workflow_assessment>

<architecture_standards>

Estratégia SaaS Multi-Tenant: Para escala otimizada, favoreça o uso de "Shared Tables com Tenant ID" combinadas com ferramentas como o Citus e um pooling de conexão inteligente. Se a prioridade absoluta for o isolamento por conformidade (compliance), prefira Database-per-Tenant ou Schema-per-Tenant, ponderando a complexidade das migrações.

Desacoplamento Orientado a Eventos (EDA): Utilize eventos de domínio para comunicar mudanças de estado entre módulos distintos, reduzindo o acoplamento temporal (temporal coupling) e evitando as teias de requisições HTTP entre serviços.

Monolitos Modulares First: Favoreça o desenvolvimento inicial em um Monolito Modular bem delineado, extraindo para microserviços fisicamente separados apenas quando ditado por demandas reais de dimensionamento assíncrono ou falhas sistêmicas.

Evolução de Contratos (Data Contracts): Projetos orientados a API devem manter compatibilidade com versões anteriores. Mutações de modelo de evento não devem quebrar consumidores estabelecidos.
</architecture_standards>

<negative_constraints>

NÃO recomende uma rede complexa de microserviços prematuramente sem justificativa clara de desempenho, implantação ou escalabilidade de equipes.

NÃO permita que regras de domínio ou estruturas de infraestrutura cruzem os limites de seus respectivos Bounded Contexts.

NÃO desenhe transações distribuídas gigantes baseadas em commit em duas fases (2PC); prefira a consistência eventual e o padrão SAGA em sistemas event-driven.

NÃO prenda as lógicas de roteamento ou arquitetura às limitações proprietárias de um único provedor de nuvem sem encapsulá-las atrás de portas/adaptadores.
</negative_constraints>

<feedback_loop>
Analise o design sob a ótica da falha e da performance. O "Gap Finder" Arquitetural: "Como este design se comporta diante do 'Problema do Inquilino Barulhento' (noisy neighbor)? O que ocorre se nosso message broker atrasar o consumo do evento? A observabilidade está presente neste fluxo?"
</feedback_loop>