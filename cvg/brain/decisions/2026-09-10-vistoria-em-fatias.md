# A vistoria de 10/09 desce o Converge em fatias, não como um programa só

**Data:** 2026-09-10 · **Quem decidiu:** Claude Opus 5 (controller), a pedido do
Leonardo — *"Vamos melhorar. Faça todas as recomendações destes agentes. Talvez seja
bom usar o converge para isso? prepare o início de uma execução dessa."* — e com o
"SIM" dele para começar pela segurança e para mexer em migrations.

## O que estava na mesa

As recomendações dos nove pareceres (`cvg/brain/refs/2026-09-10-vistoria/`) juntas
formam várias ideias independentes: segurança do banco e da aplicação, textos e
vitrine, LGPD, redesenho visual, endurecimento da agenda, desempenho, aquisição,
praça e comissão. Rodadas como um pedido único, o `cvg lane` devolve **FULL**
("new system or seam signalled by: redesign"; piso por migration). Na lane FULL
nada executa antes da barreira do Pass 4 sobre o programa inteiro — e o programa
"Fechar a v2" já está parado nessa barreira, aberta desde que os planos foram
afiados depois do ataque do adversário.

## A decisão

Seguir a regra do Pass 0 (`idea-to-brd`, passo 1): *"If it describes multiple
independent systems, flag the decomposition first… each slice gets its own BRD →
Pass 1 cycle."* Cada fatia é roteada pelo `cvg lane` por conta própria:

| Fatia | Conteúdo | `cvg lane` | Piso / verificação |
|---|---|---|---|
| 1 · Segurança | policy de `servicos` e `tem_servico_com`, contas de exemplo administrativas, cadastro e troca de papel para admin, módulos por empresa, senha no navegador, endereço exposto, conta de dev na busca | NORMAL | login + migration; tier-2 obrigatório |
| 2 · Vitrine v2 e LGPD | landing, header mobile, cadastro, 404, início do SysAdmin/Admin sem v1, privacidade e termos, encarregado, processadores, Open Graph/robots/sitemap, fotos de demo | NORMAL | — |
| 3 · Redesign | escala tipográfica, casca desktop, Hero, `SlotPicker`, campos nativos, contraste, tema escuro do mapa | **FULL** | token; tier-2 obrigatório |
| 4 · Agenda e desempenho | zod + `useActionState` na agenda, corrida da reserva, fuso de São Paulo, testes de integração das actions, sessão memoizada, fonte, clima no servidor | NORMAL | token; tier-2 obrigatório |
| 5 · Crescer | página pública de prestador, exportação/anonimização, dashboards de SysAdmin/Admin, praça e comissão | FULL — vira emenda do programa "Fechar a v2" | — |

A Fatia 3 foi roteada primeiro como "redesenho" (NORMAL) e depois como "redesign"
(FULL): a heurística do `cvg lane` casa a palavra em inglês. Ficou FULL, porque é
redesenho de fato — escolher a lane mais leve por causa de uma palavra seria
contornar o piso, não respeitá-lo.

## Ordem

1 → 2 → 3 e 4 (independentes entre si) → 5. É a ordem da recomendação da vistoria
(fechar os riscos, tirar a v1 da vitrine, depois o pacote de design e o endurecimento
da agenda) e a do conselheiro-administrador (validar a alíquota com prestadores
reais antes de construir a cobrança).

## Consequências

- O `cvg next` enxerga o workspace inteiro, não a fatia: com o spec e os ADRs do
  "Fechar a v2" presentes, ele continua apontando o Pass 4 daquele programa. Os gates
  de cada fatia rodam com **caminho explícito** (`check-tech-spec.sh <spec>`,
  `cvg structure --dir`, `cvg tasks gate <spec>`).
- O programa "Fechar a v2" fica parado na barreira até a Fatia 5 emendá-lo; a
  re-ataque do adversário vai cobrir os planos emendados de uma vez.
- Reverter custa pouco: as fatias são specs separados; juntar depois é emenda, não
  retrabalho.
