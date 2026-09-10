### marketing-specialist — NOTA: 38/100
**Conceito (0–10, executivo):** D+ (3,8) sobre a execução atual. **Potencial comercial da ideia: 6/10** (praça por cidade, comissão P2P destravada na D-001, mecânica de confiança das contas de exemplo).
**Veredito:** A landing ainda vende a v1 (mural de diária) para um produto que já é agenda com marcação direta; e a plataforma inteira é invisível para o Google — zero metadata de compartilhamento, zero `robots`/`sitemap`, zero página pública indexável de prestador. Não é "falta polimento": não existe motor de aquisição para um marketplace cujo modelo (uma praça por cidade) depende de ser encontrado localmente.

**Como cheguei na nota:**
- Posicionamento e proposta de valor da landing (20%): 55
- Copy e voz consistentes no app (15%): 42
- Onboarding — fricção e confiança (20%): 50
- SEO, compartilhamento e descoberta local (25%): 8
- GTM por praça e mensagem de preço/comissão (20%): 30

**O que está bom**
- A headline "Quem precisa e quem faz, no mesmo lugar." funciona para a v2 — não precisa trocar.
- Contas de exemplo em 1 clique: mecanismo de confiança genuinamente bom.
- O perfil do prestador tem os sinais de confiança certos: estrelas, "25 avaliações", "Perfil verificado", "garantia de 90 dias" (`prestador_servico__perfil__mobile__1de4.png`).
- Aviso de preço variável implementado com tom certo (ROADMAP §6.2).
- Nudge de ativação do prestador bem calibrado ("Complete seu perfil — falta chave Pix. Perfil completo aparece mais nas buscas.").
- Categorias com nome de profissão real (Eletricista, Pedreiro...).

**Problemas**
[CRÍTICO] Zero infraestrutura de SEO/compartilhamento — sem `app/robots.ts`, `app/sitemap.ts`, nem `openGraph`/`twitter` em `app/layout.tsx:5-9`. Link colado num grupo de WhatsApp do bairro cai sem imagem nem descrição.
[CRÍTICO] Nenhuma página pública indexável de prestador — `/prestador/[id]` redireciona para `/login` sem sessão (`app/(app)/prestador/[id]/page.tsx:15-16`); não existe rota tipo `/eletricista/niteroi`.
[ALTO] Copy contraditória no ponto de maior fricção do cadastro — o mapa diz "Opcional: marque o ponto exato da obra no mapa." (`components/maps/address-map-picker.tsx:179`) logo acima de "Obrigatório: é o que permite ordenar buscas por proximidade." (`app/(auth)/cadastro/form.tsx:180`).
[ALTO] Conta de desenvolvedor na busca real — "João Prestador (dev) · Categoria não informada" em `/buscar-prestador` (`cliente__buscar-prestador__mobile__1de2.png`).
[MÉDIO] Fluxo do Administrador fala v1 ("PRECISO DE AJUDANTE" → `/publicar`, `/minhas-vagas`, `app/(app)/inicio/page.tsx:299-312`).
[MÉDIO] "Como funciona" e subheadline vendem o modelo errado (`app/page.tsx:14-18`).
[MÉDIO] Nenhum sinal de praça/cidade nem de preço/comissão na superfície pública.
[BAIXO] Banner de cookies ocupa ~1/4 da dobra no mobile.
[BAIXO] Rodapé público expõe "v0.0.2" (`components/footer.tsx:83-85`).

**Contribuições de melhoria**
1. Reescrever a landing para a v2 (textos prontos abaixo) · P · alto.
2. SEO mínimo: `app/robots.ts`, `app/sitemap.ts`, `metadata.openGraph`/`twitter` com imagem OG a partir do ícone · P–M · alto.
3. Página pública por prestador (ou por categoria + cidade), `noindex` até ter dados reais — checar com LGPD antes de expor endereço · M–G · alto.
4. Corrigir a contradição do mapa e tirar a conta dev da busca · P · alto.
5. Unificar a voz v1→v2 no fluxo do Administrador · M · médio.
6. Amarrar a landing à praça ("A plataforma de serviços de Niterói") + uma linha de preço/comissão para o prestador · M · médio-alto.

**Quick wins**
- Trocar subheadline e CTA final da landing.
- Tirar "João Prestador (dev)" da busca.
- Corrigir a frase do `address-map-picker.tsx`.
- Tirar a versão do rodapé público.
- OG básico reaproveitando o ícone.

**Textos prontos para colar**
Subheadline: "Veja a agenda de eletricistas, pedreiros e encanadores perto de você e marque um horário direto com quem tem a melhor nota — sem grupo de WhatsApp, sem esperar candidato, sem ligar pra saber se ele está livre."
Como funciona:
- Busque por perto — Veja prestadores da sua região, com nota de quem já contratou e preço médio do serviço.
- Marque um horário — Escolha um horário livre na agenda dele e diga o que você precisa. Sem esperar candidatura, sem mural de vagas.
- Combine e avalie — O prestador confirma o agendamento. No fim do serviço, os dois se avaliam — a nota fica pra sempre no perfil.
CTA final: "Encontre um profissional de confiança perto de você — ou comece a receber pedidos de agendamento hoje."

**Se eu só pudesse mudar uma coisa:** publicar `robots.ts`/`sitemap.ts` e uma metadata de Open Graph mínima — a menor mudança de código do relatório e a única que muda a categoria do problema.
