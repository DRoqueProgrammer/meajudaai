# CONTEXT — glossário canônico do Me Ajuda Aí

Dicionário, não especificação: só termos, o significado numa linha, e a evidência
que o fixa. Fixado no Pass 2 (Structure), à medida que palavra de negócio
encontrou coluna real. Passes seguintes usam **estes** termos em vez de
re-derivar os seus.

| Termo | Significado | Evidência |
|---|---|---|
| **Praça** | A unidade de isolamento e de marca: uma instalação do produto por cidade, com nome próprio. Ocupa a estrutura hoje chamada `workspaces`. | D-001 (Pass 1); [ADR 0003](adrs/0003-workspace-hoje-significa-empresa-nao-praca.md) |
| **Workspace** | O nome da tabela. **Não** é sinônimo de praça no código atual: hoje significa *empresa dona de vagas*, com `owner_id` e cargos em `workspace_members`. | [ADR 0003](adrs/0003-workspace-hoje-significa-empresa-nao-praca.md) |
| **Prestador de Serviço** | Quem mantém agenda própria e executa serviços. Valor `prestador_servico` em `profiles.tipo_base`. | `profiles_tipo_base_check`, migration 0022 |
| **Cliente** | Quem busca por proximidade e reserva um horário. Valor `cliente` em `profiles.tipo_base`. | idem |
| **Administrador** | Dono/gestor de uma praça; define alíquota e confirma pagamento. Valor `admin`. | idem; R-9, R-10, R-17 |
| **SysAdmin** | Opera a plataforma inteira, acima de qualquer praça. Valor `sysadmin`. | idem |
| **Funcionário** | Papel de acesso restrito por módulos, dentro de uma praça. Valor `funcionario`. | `user_modules`, `guardModule()` |
| **Ajudante** | Vocabulário da v1. **Não é mais um papel** — sobrevive só como `ajudante_id`, coluna do subsistema de vagas. | [ADR 0008](adrs/0008-o-papel-ajudante-ja-nao-existe.md) |
| **Horário** | Uma oferta de disponibilidade do prestador: uma linha de `agenda_slots`. Nunca chamar de "vaga". | `agenda_slots` (51 linhas em 09/09/2026) |
| **Serviço** | Nasce quando o prestador aceita a solicitação de um cliente sobre um horário. Linha de `servicos`. | `servicos` (30 linhas) |
| **Vaga / Diária** | Vocabulário da v1 (mural de diárias), ainda ativo em rotas próprias. Não descreve o fluxo v2. | `vagas`, `candidaturas`; R-28 |
| **Valor final** | `servicos.preco_valor` **no instante em que o status vira `realizado`** — não o do aceite, não o da criação. | [ADR 0005](adrs/0005-valor-do-servico-e-mutavel-ate-realizado.md) |
| **Renegociação** | Proposta de novo valor pendente de aceite do cliente; vive em `servicos.preco_pendente`. Enquanto aberta, o serviço tem duas cifras. | [ADR 0005](adrs/0005-valor-do-servico-e-mutavel-ate-realizado.md) |
| **Alíquota** | Percentual do valor final devido pelo prestador à praça. Existe em 4 níveis, do mais específico ao mais geral: serviço, categoria, prestador, praça. | R-9 |
| **Dívida de comissão** | A obrigação do prestador com a praça. Nasce no instante em que um serviço vira `realizado`; serviço cancelado antes disso gera dívida zero. | R-11; [ADR 0005](adrs/0005-valor-do-servico-e-mutavel-ate-realizado.md) |
| **Categoria** | Hoje é atributo do **prestador** (`profiles.categoria`), não do serviço — um serviço não carrega categoria própria. | [ADR 0004](adrs/0004-categoria-pertence-ao-prestador-nao-ao-servico.md) |
| **Chave de recebimento** | A chave da **praça**, para onde vai a comissão. Distinta da **chave Pix pessoal** (`profiles_pii.chave_pix`), que é o prestador cobrando o cliente. | [ADR 0006](adrs/0006-nao-existe-chave-de-recebimento-por-praca.md); R-12 |
| **Suspensão** | Estado de uma conta de prestador com dívida vencida há 3 dias; não cancela serviços já agendados. | R-18, R-20 |
| **Aprovação** | Estado do cadastro de um prestador antes de ele aparecer em qualquer busca de cliente. | R-21, R-22 |
