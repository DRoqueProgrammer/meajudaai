# Referência Visual — MeAjuda Aí

Transcrição da prévia de identidade visual (mockup mobile) e diretrizes para **adaptação ao protótipo web** (Next.js + Tailwind). Fonte: imagem-mockup enviada por Davi (não anexada como arquivo — se quiser o PNG original no repo, salve-o em `design/`).

---

## 1. Marca

**Logo:** capacete de obra amarelo sobre aperto de mãos, wordmark "MeAjuda **Aí**" (Aí em amarelo), fundo azul-marinho.
**Slogan:** "A ajuda que você precisa, no momento que você mais precisa."
**Pitch:** "O MeAjuda Aí conecta profissionais da construção e manutenção com ajudantes disponíveis para trabalhos por diária de forma rápida, segura e prática."

**Pilares da marca:** Segurança · Rapidez · Confiança · Qualidade.
**Três promessas:** **Rápido** (encontre ajudantes em poucos minutos) · **Seguro** (perfis verificados e avaliações reais) · **Perto de você** (vagas na sua região todos os dias).
**Público:** eletricistas, pedreiros, pintores, encanadores e mais.

---

## 2. Cores

| Token | Hex | Uso |
|---|---|---|
| `azul` (primária) | `#0D47A1` | Cabeçalhos, barras, marca, botões primários, links |
| `amarelo` (destaque) | `#FFC107` | CTA "Preciso de ajudante", realces, badges, estrelas |
| `verde` (ação) | `#43A047` | Ações positivas: publicar, me candidatar, aceitar, WhatsApp, status "sucesso" |
| `cinza-claro` (superfície) | `#F5F7FA` | Fundo de tela e de cards |
| `tinta` (texto) | `#212121` | Texto principal |

Neutros de apoio sugeridos (derivados, para web): texto secundário `#5B6472`, bordas `#E2E6EC`, branco `#FFFFFF`.

**Semântica de status** (abas Ativas/Concluídas/Canceladas, etc.): Ativa/Sucesso = `verde`; Agendada/Info = `azul`; Pendente/Atenção = `amarelo`; Cancelada/Erro = vermelho `#E53935` (adicionar).

---

## 3. Tipografia

**Família:** **Poppins** (Google Fonts) para tudo. Fallback: `system-ui, -apple-system, Segoe UI, Roboto, sans-serif`.
Escala sugerida (web): título 24–28px/600, seção 18–20px/600, corpo 14–16px/400, rótulo 12–13px/500, valor de diária em destaque 20px/700.

---

## 4. Telas do mockup (10) — o que cada uma mostra

1. **Boas-vindas** — logo centralizado, botões `ENTRAR` (amarelo) e `CRIAR CONTA` (link).
2. **Início** — saudação "Olá, João! Bom dia!", pergunta "O que você deseja?", dois CTAs grandes: `PRECISO DE AJUDANTE` (amarelo, papel Profissional) e `QUERO TRABALHAR` (verde, papel Ajudante); seção "Vagas em destaque na sua região"; nav inferior: Início · Minhas Diárias · Mensagens · Perfil.
3. **Publicar Vaga (Nova Diária)** — formulário em passos: 1) Tipo de serviço, 2) Local da obra, 3) Data e horário, 4) Valor da diária, 5) Descrição (opcional); botão `PUBLICAR DIÁRIA` (verde).
4. **Minhas Vagas** — abas `ATIVAS / CONCLUÍDAS / CANCELADAS`; cards de vaga com nº de candidatos e status; `PUBLICAR NOVA DIÁRIA`.
5. **Candidatos** — lista de candidatos com foto, nota em estrelas e nº de avaliações; ações `VER PERFIL` e `ACEITAR` (verde); badge "Novo no app".
6. **Perfil do Ajudante** — foto, nome, nota 4,8 (12 avaliações), selo "Perfil verificado"; "Sobre mim"; "Informações" (cidade, disponibilidade, nº de diárias); CTA `CHAMAR NO WHATSAPP` (verde).
7. **Buscar Vagas** — campo de busca + filtros `Todos / Hoje / Amanhã / Esta semana`; lista de vagas (título, local, valor/dia, horário).
8. **Detalhes da Vaga** — título, valor/dia, data, descrição, card do profissional com nota; CTA `ME CANDIDATAR` (verde).
9. **Minhas Diárias** — abas `AGENDADAS / CONCLUÍDAS / CANCELADAS`; cards com status colorido.
10. **Avaliar** — "Como foi trabalhar com [nome]?", 5 estrelas, comentário opcional; `ENVIAR AVALIAÇÃO` (verde).

**Rodapé institucional:** Contato direto (WhatsApp/telefone liberados após aprovação) · Avaliações reais · Mais oportunidades · "Baixe já" (Android/iOS).

---

## 5. Adaptação mobile → web (protótipo Next.js + Tailwind)

O mockup é mobile-first; o protótipo é **web responsivo/PWA**. Manter a estética (mesmas cores, Poppins, cantos arredondados, cards, estrelas, selos) e adaptar o layout:

- **Navegação:** a barra inferior de 4 itens vira **bottom-nav no breakpoint mobile** (`< md`) e **sidebar/topbar à esquerda no desktop** (`>= md`). Mesmos ícones e rótulos.
- **Container:** conteúdo centralizado com largura máxima (~`max-w-md` para telas de fluxo único; grid de cards em `max-w-5xl` no desktop).
- **Escolha de papel (tela 2):** manter os dois CTAs grandes (amarelo/verde) como escolha primária; no desktop, lado a lado.
- **Publicar vaga (tela 3):** o stepper numerado funciona bem em web como **formulário multi-etapas** (ou etapa única em coluna no desktop).
- **Listas → grid:** "Minhas Vagas", "Candidatos", "Buscar Vagas" viram lista em mobile e **grid de cards** (2–3 colunas) no desktop.
- **Ações verdes** (publicar, candidatar, aceitar, WhatsApp) permanecem verdes; **primário azul** para navegação/CTAs neutros; **amarelo** só para o destaque principal e realces.
- **Componentes recorrentes** a padronizar: card de vaga, card de pessoa (avatar + nota + estrelas + selo verificado), abas de status, badge de status, avaliação por estrelas, campo de busca com filtros-chip.

### Tokens prontos (Tailwind `theme.extend.colors`)
```js
colors: {
  brand:   { DEFAULT: '#0D47A1', dark: '#0A3A85' }, // azul
  accent:  { DEFAULT: '#FFC107' },                   // amarelo
  action:  { DEFAULT: '#43A047', dark: '#388E3C' },  // verde
  surface: '#F5F7FA',
  ink:     '#212121',
  muted:   '#5B6472',
  line:    '#E2E6EC',
  danger:  '#E53935',
}
```

### Tokens CSS equivalentes
```css
:root{
  --brand:#0D47A1; --brand-dark:#0A3A85;
  --accent:#FFC107; --action:#43A047; --action-dark:#388E3C;
  --surface:#F5F7FA; --ink:#212121; --muted:#5B6472; --line:#E2E6EC; --danger:#E53935;
  --radius:14px; --font:'Poppins',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
}
```

Ver `design/MeAjudaAi_styleguide.html` para essa identidade já renderizada em web (paleta, tipografia, botões e cards de exemplo).
