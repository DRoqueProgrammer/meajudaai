# ADR 0012 — Localização exata do perfil (Cliente e Prestador), supera a 0004

- **Status:** Aceito
- **Data:** 2026-09-09
- **Contexto do parecer:** Pivô v2 (marketplace de agendamento) — decisão de produto de Leonardo

## Contexto

A [0004](./0004-localizacao-aproximada.md) decidiu nunca expor coordenada exata de uma vaga a quem não fosse parte dela — o feed e o mapa público usam só a aproximada. Essa decisão continua válida **para vagas**.

A v2 introduz um requisito novo e diferente: para ordenar a busca de um Cliente por prestadores "do mais próximo ao mais distante", o sistema precisa da coordenada exata de **ambas as partes** (Cliente e Prestador de Serviço) — uma cidade ou um raio arredondado não bastam para um ranqueamento fino de distância. Leonardo confirmou explicitamente: "localização exata com endereço escrito e pin marcado num mapa", obrigatório para os dois papéis.

## Decisão

Guardar a coordenada exata do PIN de cada Cliente/Prestador em `profile_local` (tabela própria, RLS estrita — só o dono e o sysadmin leem), no mesmo molde de `vaga_local`. O cálculo de distância para ordenar buscas roda **no servidor**; a coordenada exata do outro lado nunca é enviada ao cliente do app pelo simples fato de aparecer num resultado de busca.

A visão agregada do painel do Administrador (mapa com todo mundo do workspace) **não** usa `profile_local` diretamente — agrupa por `profiles.cidade_ibge`, para que pessoas da mesma cidade apareçam próximas entre si, sem espalhar pelos pontos exatos.

## Alternativas consideradas

- **Manter aproximada (0004) também para perfis:** rejeitado — não dá pra ordenar "mais próximo primeiro" com precisão suficiente a partir de coordenada arredondada a ~1,1 km; a ordem ficaria errada com frequência em cidades densas.
- **Coordenada exata direto em `profiles`:** rejeitado pelo mesmo motivo da 0004 original — `profiles` é `select true` para qualquer autenticado, exporia o endereço exato de todo mundo.

## Consequências

- **+** Busca por proximidade fica precisa desde o primeiro resultado.
- **+** Reaproveita um padrão de RLS já testado em produção (vaga_local).
- **−** Duas fontes de verdade de localização coexistem no schema (`vaga_local` para vagas v1, `profile_local` para perfis v2) até a v1 ser descontinuada.
- **−** Cálculo de distância roda no servidor a cada busca — sem índice geoespacial nesta fase (aceitável no volume de protótipo; revisar com PostGIS se a base de usuários crescer).
