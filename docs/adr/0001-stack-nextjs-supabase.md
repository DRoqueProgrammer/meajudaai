# ADR 0001 — Stack: Next.js + Supabase + TypeScript

- **Status:** Aceito
- **Data:** 2026-08-26 (formaliza decisão tomada no início do protótipo)
- **Contexto do parecer:** Eng. de Software (falta de ADRs rastreáveis)

## Contexto

A especificação original (`ESPECIFICACOES_MeAjudaAi.md`) previa FlutterFlow +
Firebase, mirando um app mobile nativo. Para o protótipo web/PWA responsivo,
precisávamos de uma stack que: (1) entregasse rápido, (2) tivesse RLS de banco
séria para o modelo multi-tenant, (3) fosse TypeScript de ponta a ponta e (4)
espelhasse os repos-referência em `refs/`.

## Decisão

Next.js (App Router) + Supabase (Postgres + Auth + RLS) + TypeScript strict +
Tailwind. Server Components e Server Actions no lugar de uma API REST separada;
Supabase como banco, auth e storage.

## Alternativas consideradas

- **FlutterFlow + Firebase (spec original):** mobile nativo, mas Firestore não
  tem RLS relacional — a segurança multi-tenant viraria regras de segurança
  imperativas, mais frágeis que policies SQL. Adiado o app nativo.
- **Next.js + Prisma + Postgres próprio:** mais controle, mas exigiria montar
  auth, migrations e RLS à mão. Supabase entrega os três integrados.
- **Remix / SvelteKit:** capazes, mas os repos-referência e o ecossistema de
  exemplos de RLS+SSR estão em Next.js.

## Consequências

- **+** RLS no banco como fronteira de segurança primária (ver ADR 0003).
- **+** Um só idioma (TS) do schema (tipos gerados) ao componente.
- **+** Deploy simples (Vercel), PWA responsivo cobre mobile no protótipo.
- **−** App nativo fica para depois; depende do usuário instalar o PWA.
- **−** Acoplamento ao Supabase (auth hook, policies). Mitigado por manter o
  acesso a dados atrás do client oficial.
