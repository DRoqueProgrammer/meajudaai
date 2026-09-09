# Nota bruta — Comissão da plataforma via Pix

- **Data:** 09/09/2026
- **Origem:** ditado por Leonardo ao vivo, durante a sessão de instalação do Converge
- **Estado:** captura fiel do pedido + lacunas identificadas. Não é spec — entra como
  insumo do Pass 1 (Intent). Nada aqui foi decidido tecnicamente.

## O que foi pedido

1. **O Prestador de Serviço paga comissão à plataforma** sobre cada serviço.
   O racional declarado: "vale a pena estar na plataforma, vale a pena pagar a
   plataforma" — a cobrança é o que mantém **o perfil em dia**.

2. **O Administrador define a alíquota no próprio perfil**: quantos por cento do
   valor de cada serviço vão para a plataforma.

3. **Pagamento via Pix.** O Administrador cadastra, no perfil dele, a **chave Pix
   da plataforma** (distinta da chave Pix do prestador, que já existe em
   `profiles_pii.chave_pix` e serve pra ele cobrar o cliente).

4. **QR code com dados no meio.** A chave gera um QR code com **nome, data e
   valor no meio** — e possivelmente também o **código do projeto**. Requisito
   textual do Leonardo: *"se for muito grande, reduz tamanho, precisa ser um QR
   code perfeito, mas com dados no meio"*.

5. **Na página do Prestador de Serviço**, mostrar:
   - a **alíquota** de comissão da plataforma;
   - **quanto ele deve enviar à plataforma naquele dia**.

6. **Clicar abre um card com o QR**, já com o valor daquele dia preenchido.

7. **Registro do pagamento** (Leonardo disse explicitamente "a gente depois pensa
   numa forma de registrar isso oficialmente", então é esboço, não decisão):
   - o prestador abre o link e tem um botão **"Enviei o Pix"**;
   - o **Administrador recebe uma pendência**;
   - o Administrador **dá OK** ("recebi esse Pix, hora tal, da pessoa tal") **ou não**.

8. **Três níveis de alíquota**, todos configuráveis **apenas por Administrador ou
   SysAdmin**:
   - **geral** (no perfil do Administrador);
   - **específica por Prestador de Serviço**;
   - **específica por serviço**.

   Exemplo dado: um Administrador negocia com um prestador — *"olha, instalação
   elétrica, a alíquota vai ser 1,5%, e acabou"*.

## Lacunas — precisam de resposta antes de virar requisito falsificável

| # | Lacuna | Por que trava |
|---|---|---|
| L1 | **Qual Administrador cobra?** No modelo v2 (P2P) o Prestador de Serviço **não pertence a workspace nenhum**. Se a alíquota mora no perfil de um Administrador, falta o vínculo que diz qual Administrador manda em qual prestador. | É a mesma tensão já aberta no [ROADMAP §0](../../../ROADMAP.md#0-auditoria--o-que-falta) (workspace × P2P). A comissão não fecha sem essa decisão de produto. |
| L2 | **"Alíquota por serviço" = por categoria ou por serviço individual?** O exemplo ("instalação elétrica") soa como **categoria**; a frase "por serviço em si" pode ser o **serviço específico** já agendado. | Muda a modelagem: coluna em `servicos` vs. tabela de alíquota por categoria. |
| L3 | **Precedência entre as três alíquotas.** Provável: serviço > prestador > geral (mais específica ganha). Não foi dito. | Sem regra explícita, dois valores válidos podem se aplicar ao mesmo serviço. |
| L4 | **Qual status gera dívida** — serviço `confirmado`, `realizado`, ou pago pelo cliente? E se for cancelado/renegociado **depois** de a comissão ser calculada? | Define o momento do cálculo e se existe estorno. |
| L5 | **"Naquele dia" acumula?** Se o prestador não pagar hoje, a dívida de hoje some ou soma na de amanhã? | Muda de "extrato do dia" para "conta corrente". |
| L6 | **O que acontece com quem não paga.** "Manter o perfil em dia" sugere consequência (sair da busca? selo de pendência?), mas nenhuma foi definida. | É a regra de negócio que dá sentido à cobrança. |
| L7 | **Renegociação** (ROADMAP §6.3): comissão sobre o valor original ou o renegociado? | O valor do serviço é mutável por desenho. |

## Restrição técnica já conhecida (não é lacuna, é fato)

O builder de Pix estático (EMV/BR Code) **já existe** em `lib/pix/static-qr.ts`
(portado do `refs/foco-contabil`) e o card de cobrança do prestador ao cliente já
usa QR + copia-e-cola com nome/data/valor **ao lado**. O pedido novo é diferente:
os dados **no meio do QR**. Isso é uma sobreposição desenhada por cima do código,
e só é seguro com **correção de erro nível H** (recupera ~30%) e uma área central
limitada — é exatamente por isso que o Leonardo disse "se for muito grande, reduz
tamanho": quanto mais dado no meio, maior o QR precisa ser pra continuar legível.
"QR perfeito com dados no meio" é viável; o que não é viável é sobreposição grande
com correção de erro baixa. A validação tem que ser leitura real por um app de
banco, não inspeção visual.

## Ligações

- ROADMAP §16 (seção escrita a partir desta nota)
- ROADMAP §6 (precificação e renegociação — a base de cálculo da comissão)
- ROADMAP §2.2 e §0 (tensão workspace × P2P — bloqueia L1)
- HANDOVER.md: "administrador configurar a chave Pix em nome do prestador" segue
  não resolvido (RLS `pii_update_self`) — problema vizinho, não o mesmo.
