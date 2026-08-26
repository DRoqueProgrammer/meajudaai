# ADR 0004 — Localização aproximada: coordenada exata protegida

- **Status:** Aceito
- **Data:** 2026-08-26 (formaliza decisão tomada no início do protótipo)
- **Contexto do parecer:** Eng. de Software / Design (anti-IDOR da coordenada)

## Contexto

O mapa de vagas precisa mostrar onde é a obra para o ajudante decidir se vale a
diária. Mas expor o endereço exato de qualquer obra aberta, para qualquer um,
é um risco de segurança física e de privacidade do profissional — o endereço só
deveria aparecer para quem foi **contratado**.

## Decisão

Guardar duas representações: o ponto **exato** em `vaga_local` (RLS libera só
para as partes da vaga) e uma coordenada **aproximada** em `vagas`
(`local_aprox_lat/lng`), arredondada a 2 casas decimais (~1,1 km) pela função
`arredCoord()` (`lib/format.ts`). O feed e o mapa público usam só a aproximada;
o endereço exato aparece após a contratação.

## Alternativas consideradas

- **Só coordenada exata + esconder na UI:** o dado ainda trafega para o cliente;
  qualquer inspeção de rede o revela. Esconder na UI não é proteger.
- **Só coordenada aproximada:** perde a navegação até a obra para quem já foi
  contratado — a informação de que ele legitimamente precisa.
- **Raio/círculo em vez de ponto deslocado:** mais elegante visualmente, mas o
  arredondamento resolve o mesmo com menos código no protótipo.

## Consequências

- **+** Endereço exato nunca sai do banco para quem a RLS não libera.
- **+** O borrão é determinístico e barato (arredondamento).
- **−** A aproximada pode cair num vizinho; aceitável para "a região da obra".
- **−** Duas escritas na publicação (exato + aproximado) — encapsuladas na action.
