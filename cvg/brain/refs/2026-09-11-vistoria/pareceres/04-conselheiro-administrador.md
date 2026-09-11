### conselheiro-administrador — NOTA HOJE: 67/100 (ontem: 41)
**Conceito na minha régua:** ontem era "continua, mas não escala ainda"; hoje é **"parou de mentir sobre o que é, e construiu o motor de receita — falta provar que o motor gira sem um humano heroico do outro lado"**.
**Veredito (2-3 linhas):** As quatro superfícies que ontem contradiziam o WHY do produto na cara de qualquer visitante — landing, cadastro, 404, home de quem toma decisão de negócio — foram limpas de fato. Em paralelo, as 7 lacunas da comissão que eu mesmo apontei como bloqueio (D-044) foram todas decididas e construídas num único dia, com Financeiro em grade digno de SaaS B2B. O que não avançou é exatamente o que eu tinha pedido como contramedida: hoje está formalmente decidido que **não há nenhuma consequência automática** para quem não paga a comissão — Sinek diria que resolveram o HOW (o mecanismo) mas ainda não amarraram o WHY (por que o prestador teria motivo de continuar pagando).

**Ontem → hoje**

| Recomendação de ontem | Status | Evidência |
|---|---|---|
| 1. Faxina de linguagem nas 4 superfícies públicas (landing, cadastro, 404, `/inicio` padrão) | **Feita** | `app/page.tsx:18-19` (comentário explícito removendo "diária"/"candidatura"); `app/not-found.tsx:11-21` (sem "vaga"); `app/(auth)/cadastro/form.tsx:19,44-45` (`papelOfertado` só aceita cliente/prestador_servico) |
| 2. Home mínima e honesta pra SysAdmin/Administrador, sem Hero | **Feita** | `app/(app)/inicio/page.tsx:523-544,561-570,597` (Hero só para cliente/prestador; admin/sysadmin caem em `PainelDaPraca`/`PainelDaPlataforma`); `admin__inicio__mobile__1de4.png`, `sysadmin__inicio__mobile__1de3.png` |
| 3. Fechar "qual Administrador cobra" antes de qualquer UI de cobrança | **Feita** | D-044.1, `cvg/docs/tech-spec/_decisoes-travadas.md:379-382` ("Administrador da praça da cidade do prestador") |
| 4. Contramedida de retenção: amarrar benefício visível a estar em dia com a comissão | **Não feita — e agora é decisão explícita, não lacuna** | D-044.6, `_decisoes-travadas.md:388-389` ("Sem consequência automática"); campo `verificado` sem qualquer escrita ligada a comissão; `lib/whatsapp.ts` e `components/agenda/cliente-do-servico.tsx:44` continuam expondo WhatsApp direto |
| 5. Testar a alíquota com 3-5 prestadores reais fora do app antes de travar o número | **Não feita** | Sem menção em `HANDOVER.md` ou `ROADMAP.md`; ficou só código — validação de mercado não é algo que se resolve em sessão de dev |
| Quick win: subir aviso "contas fictícias" pro primeiro card | **Não feita** | `app/page.tsx:145-146`, mesma posição de ontem, depois da lista de contas de exemplo |
| Quick win: reescrever 404 sem "vaga" | **Feita** | `app/not-found.tsx` |
| Quick win: renomear "Tenho uma empresa" no cadastro | **Feita (a opção foi removida, não renomeada)** | `app/(auth)/cadastro/form.tsx:30-38` |
| Quick win: renomear módulo "Minhas Vagas" | **Parcial** | Saiu do painel do Administrador (`inicio/page.tsx:172` filtra `"vagas"`), mas `lib/modules.ts:8` ainda diz "Minhas Vagas" e o Funcionário ainda vê essa tela intacta (`funcionario__inicio__mobile__1de1.png`) |
| Quick win: uma linha de WHY no Hero | **Não feita** | `prestador_servico__inicio__mobile__1de3.png` — saudação, frase motivacional avulsa, clima; nenhuma linha de propósito |

**Como cheguei na nota:**
1. WHY explícito na interface (25%): ontem 30 → hoje **60** — parou de contradizer o WHY, mas ainda não o afirma.
2. Coerência da jornada / resíduo do pivô (25%): ontem 45 → hoje **75** — superfícies críticas limpas; Funcionário e árvore de rotas mortas ainda carregam v1.
3. Ordem de prioridades rumo ao 1º cliente pagante (20%): ontem 45 → hoje **78** — atacaram linguagem, homes de decisão E o motor de receita, nessa ordem certa.
4. Viabilidade da comissão + risco de desintermediação (20%): ontem 35 → hoje **50** — mecanismo completo, mas sem nenhuma alavanca de retenção, por decisão deliberada.
5. Contas de exemplo como ativo de venda (10%): ontem 65 → hoje **78** — agora mostram também os painéis de negócio, ainda melhor pra pitch.

Nota ponderada: **67/100**.

**O que está bom**
- As quatro superfícies mais críticas de ontem foram varridas: landing, cadastro, 404 e as homes de SysAdmin/Administrador não gritam mais "mural de diária" — `admin__inicio__mobile__1de4.png` mostra "Painel da praça" com prestadores/anúncios/sinalizações; `sysadmin__inicio__mobile__1de3.png` mostra "Painel da plataforma" com usuários e serviços da rede inteira.
- As 7 lacunas da comissão (que eu mesmo listei como bloqueio no ROADMAP §16.4) foram decididas E construídas no mesmo dia — D-044 a D-048 — com fluxo prestador→QR→"Enviei o Pix"→Administrador confirma, saldo acumulado, destaque de 7 dias em atraso.
- O Financeiro em grade (`admin__praca-financeiro-aba-pendencias__mobile__1de3.png`) tem filtros na URL, ✓/✗ por serviço, recibo mensal com assinatura e nota avulsa — sofisticação de tooling B2B real, rara num protótipo de 30h.
- O racional de venda da comissão finalmente está na tela, não só no documento: "A praça da sua cidade cobra uma porcentagem de cada serviço realizado. Pague pelo Pix e avise aqui" (`prestador_servico__comissao__mobile__1de6.png`).
- Cadastro público não oferece mais "admin" — fecha o vetor de autoescalada que eu tinha marcado como resíduo perigoso.
- Contas de exemplo continuam um ativo forte de demonstração, agora com os painéis de negócio incluídos.

**Problemas**
[ALTO] O motor de receita recém-construído não tem nenhuma alavanca — D-044.6 decide explicitamente "sem consequência automática" para quem acumula saldo de comissão em aberto; a única defesa é um Administrador humano decidir suspender manualmente depois de reparar num destaque visual. Isso não é mais uma lacuna, é uma escolha registrada — e ainda não responde à pergunta do briefing: **o "Enviei o Pix" manual escala** quando a praça tiver 50 prestadores em vez de 3?
[ALTO] Desintermediação continua sem barreira — WhatsApp direto e clicável (`lib/whatsapp.ts:1-6`, `components/agenda/cliente-do-servico.tsx:44`) sem nenhum benefício visível amarrado a estar em dia. Combinado com o item acima: no 2º/3º agendamento, o prestador tem motivo racional (economia de comissão) e nenhuma fricção pra sair do app.
[MÉDIO] (NOVO) O Funcionário — papel real, com conta de exemplo própria — ainda abre em "Minhas vagas" / "Acompanhe candidatos e o andamento das diárias" (`funcionario__inicio__mobile__1de1.png`, `lib/modules.ts:8`). A faxina de ontem acertou o alvo certo (as 4 superfícies mais visíveis), mas deixou esse papel intacto na língua errada.
[MÉDIO] Uma árvore inteira de rotas v1 mortas continua no repositório — `app/(app)/minhas-vagas`, `vagas`, `vagas/[id]/candidatos`, `chat/vaga`, `minhas-diarias`, `avaliar/[vagaId]` — peso que aumenta o risco de alguém linkar ou reativar a UI errada sob pressa (não é o foco do meu lens de código, mas é resíduo do pivô que ainda existe).
[BAIXO] Aviso de "contas fictícias" continua fora do primeiro card visível no mobile (`app/page.tsx:145-146`), mesma posição de ontem.
[BAIXO] O Hero ainda não diz por quê o produto existe — mostra saudação, frase motivacional e clima, mas nenhuma linha de propósito (mesmo texto de ontem).

**Possibilidades de melhoria**
1. Dar visibilidade (não necessariamente automação) ao status de comissão — um selo simples "em dia" / "pendência" no perfil do prestador, ligado ao saldo — antes que o primeiro Administrador real precise brigar sozinho por cada Pix · M · impacto altíssimo: é a única coisa que protege a receita que acabaram de construir.
2. Fazer a mesma faxina de linguagem no papel Funcionário (módulo, título, descrição) · P · impacto médio — papel secundário, mas mesma inconsistência que custou nota CRÍTICA ontem em outro papel.
3. Decidir o destino do código v1 morto: arquivar ou remover as rotas de vagas/candidatos/diárias que não fazem mais parte da jornada principal · M · reduz risco de reativação acidental.
4. Planejar como a reconciliação de Pix escala além de "1 Administrador olhando manualmente" — avaliar webhook de PSP (Pix automático) ou, no mínimo, rodar um piloto real com 3-5 prestadores cobrando fora do app antes de travar o modelo em produção · G em calendário, P em engenharia · altíssimo, porque hoje ninguém validou isso fora do código.
5. Uma linha de WHY na landing e no Hero, agora que a v1 saiu do caminho — o espaço está livre, falta preenchê-lo · P · impacto médio-alto em clareza de marca.

**Quick wins**
1. Subir o aviso de "contas fictícias" pro primeiro card visível no mobile.
2. Renomear "Minhas vagas" pro Funcionário e tirar "diárias"/"candidatos" da descrição.
3. Uma linha de WHY no Hero ("Sua agenda, sua reputação, seu preço — sem intermediário decidindo por você", como sugeri ontem — ainda vale).
4. Um selo textual simples "em dia com a comissão" no perfil do prestador, mesmo sem qualquer enforcement por trás.
5. Comentário `// v1 — não linkado, candidato a remoção` no topo das rotas mortas de vagas/candidatos, pra próxima sessão não hesitar.

**Se eu só pudesse mudar uma coisa agora:** anexaria uma consequência visível — nem que seja só um selo no perfil, sem suspensão automática — ao saldo de comissão em aberto. Construíram um motor de receita completo e sofisticado em um dia; sem nenhuma alavanca de retenção, esse motor gira no vácuo assim que o segundo agendamento sai do app pelo WhatsApp que ninguém escondeu. É a diferença entre ter uma comissão de verdade e ter uma comissão de honra.
