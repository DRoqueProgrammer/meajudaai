# Fotos dos perfis de demonstração

As imagens são **geradas por IA** — não retratam pessoas reais. Isso importa:
os perfis de demonstração têm nota, selo "Perfil verificado" e histórico
inventados, e anexar o rosto de alguém de verdade a uma identidade fabricada
seria apresentar essa pessoa como usuária de um serviço que ela nunca usou.

## Como repetir

Os arquivos de origem ficam fora do repositório (1254×1254, ~2 MB cada). Para
semear de novo, ou depois de recriar o banco:

```bash
node scripts/semear-fotos.mjs <pasta-com-as-fotos>
```

O script reduz para **WebP 256px** antes de subir — 2× o maior uso, que é o
avatar de 64px do editar perfil. Sem isso, o rodapé carregaria 2 MB para
desenhar um círculo de 44px, no 4G de obra que é o cenário do produto.

| Perfil | Arquivo de origem | Antes | Depois |
|---|---|---|---|
| João Eletricista | `perfil-09-encarregado-obras-m.png` | 2,2 MB | 9 KB |
| Carlos Silva | `perfil-14-ajudante-experiente-m.png` | 2,1 MB | 7 KB |
| Ana Assistente | `perfil-02-administrativo-f.png` | 2,1 MB | 8 KB |
| Rafael Nunes | `perfil-12-atendimento-empresarial-m.png` | 1,9 MB | 7 KB |

O mapeamento vive em `MAPA`, dentro do próprio script. É idempotente: sempre
grava em `avatares/<user_id>/perfil.webp` com `upsert`.

## Onde as fotos aparecem

Landing (contas de exemplo), perfil, candidatos, mensagens, equipe e o card do
profissional no detalhe da vaga. Sem foto, o `Avatar` cai nas iniciais — é o que
acontece com qualquer conta criada pelo cadastro até a pessoa subir a dela em
`/perfil/editar`.

## Sobram 21 fotos

A pasta traz 25 imagens; 4 estão em uso. As outras cobrem ofícios (pintora,
encanador, gesseiro, azulejista, instaladora, técnico de refrigeração) e papéis
de escritório (engenharia, orçamento, RH, almoxarifado). Servem se o seed for
ampliado — hoje o banco tem 4 perfis e não faz sentido inventar usuários só
para gastar imagem.
