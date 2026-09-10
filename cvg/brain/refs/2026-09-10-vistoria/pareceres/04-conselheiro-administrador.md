### conselheiro-administrador — NOTA: 41/100
**Conceito (que normalmente não uso números):** "continua, mas não escala ainda" — o motor da jornada existe; a vitrine e o motor de receita, não.
**Veredito:** O produto já sabe o que é (agenda de serviços, não mural de vagas) — mas a interface ainda grita a versão anterior em quase todo lugar por onde um visitante de primeira viagem passa: landing, cadastro, 404, home de quem toma decisão de negócio. Isso não é polimento, é o WHY sendo contradito pelo próprio produto. E a ordem de prioridade atual (spike de QR, depois fronteira de praça) resolve o risco de engenharia mais caro, não o risco de mercado mais urgente.

**Como cheguei na nota:**
1. WHY explícito na interface (25%): 30
2. Coerência da jornada / resíduo do pivô (25%): 45
3. Ordem de prioridades rumo ao 1º cliente pagante (20%): 45
4. Viabilidade da comissão + risco de desintermediação (20%): 35
5. Contas de exemplo como ativo de venda (10%): 65

**O que está bom**
- O fluxo cliente→prestador já é sistema de agenda de verdade: busca por proximidade com mapa, perfil com preço/hora e aviso elegante de renegociação ("O valor pode ser ajustado depois que o prestador avaliar o serviço no local"), agenda com status coloridos.
- A home do prestador já é painel de decisão: "2 hoje", "1 aguardando você", faturamento do mês, gráfico de 6 meses, nudge de perfil incompleto (`prestador_servico__inicio__mobile__1de2.png`).
- A âncora da comissão está certa: nasce no `realizado`, sobre valor confirmado (D-005).
- O racional de venda da comissão já está escrito (`ROADMAP.md:378-380`) — só que vive no documento, não na tela.
- Contas de exemplo reais, uma por papel, com blurb específico — ótimas pra pitch.
- O tech-spec já lista a "faxina de linguagem v1 → v2" como escopo (`cvg/docs/tech-spec/fechar-v2-marketplace.md:53`) — o time viu, só não priorizou.

**Problemas**
[CRÍTICO] Landing, cadastro de empresa e 404 vendem o produto errado — `app/page.tsx:15,81-82,100,184` ("Publique a diária e receba candidatos da sua região", "Avaliação ao fim da diária", "Publique uma diária ou encontre trabalho na sua região"); cadastro com "Tenho uma empresa — Publico vagas e gerencio uma equipe"; `app/not-found.tsx:13,19` ("A vaga pode ter sido cancelada" / "Ver vagas abertas").
[CRÍTICO] SysAdmin e Administrador abrem o app numa tela de ajudante de obra — `app/(app)/inicio/page.tsx:349-354`; `sysadmin__inicio__mobile__1de1.png` mostra "PAINEL DO PROFISSIONAL" / "Diárias perto de você" pro dono da plataforma; `admin__inicio__mobile__1de2.png` mostra "PRECISO DE AJUDANTE" e "Minhas Vagas" (`lib/modules.ts:8`).
[ALTO] Desintermediação sem barreira — o card do cliente mostra telefone e WhatsApp clicável (`lib/whatsapp.ts:2-6`, link `wa.me` puro). No 2º/3º agendamento, cliente e prestador perdem o motivo de voltar ao app.
[ALTO] Comissão com 7 lacunas abertas, incluindo "qual Administrador cobra" (`ROADMAP.md:403-416`).
[MÉDIO] A ordem de prioridade otimiza risco de engenharia (spike do QR), não risco de mercado — ninguém validou se um Administrador de praça aceita confirmar Pix na mão todo dia.
[MÉDIO] O aviso de "contas fictícias" fica fora da dobra no mobile (`app/page.tsx:128-132`).
[BAIXO] O WHY nunca é dito como "por quê" — landing ("Quem precisa e quem faz, no mesmo lugar") e login ("A ajuda que você precisa, no momento que você mais precisa") dizem coisas diferentes e nenhuma nomeia o problema real.

**Contribuições de melhoria**
1. Faxina de linguagem nas 4 superfícies públicas (landing, 404, opção "Tenho uma empresa", branch padrão do `/inicio`) · P · alto.
2. Home mínima e honesta pra SysAdmin/Administrador — Aprovações, Alíquota, Usuários, Denúncias, sem Hero (R-7 do tech-spec) · M · alto.
3. Fechar "qual Administrador cobra" antes de qualquer UI de cobrança — decisão de produto · P · desbloqueia R-9 a R-17.
4. Contramedida de retenção: não esconder o WhatsApp, mas amarrar benefício visível (selo verificado, posição no ranking) a estar em dia com a comissão · M.
5. Testar a alíquota com 3–5 prestadores reais cobrando Pix manualmente fora do app antes de travar número em código · G em calendário, P em engenharia · altíssimo.

**Quick wins**
1. Subir o aviso "contas fictícias" pro primeiro card visível.
2. Reescrever o 404 sem "vaga".
3. Renomear "Tenho uma empresa — Publico vagas..." no cadastro.
4. Renomear o módulo "Minhas Vagas" pra "Serviços" ou "Demanda".
5. Uma linha de WHY no Hero ("Sua agenda, sua reputação, seu preço — sem intermediário decidindo por você").

**Se eu só pudesse mudar uma coisa:** tiraria a v1 da frente de quem ainda não é usuário — landing, cadastro, 404, home de SysAdmin/Administrador — antes de qualquer spike de QR. Custa horas, não sprints, e é a diferença entre mostrar o produto ao primeiro Administrador de praça hoje ou esperar mais um ciclo.
