# Decisão — Gemini como adversário cross-family do Pass 4

- **Data:** 09/09/2026
- **Decidido por:** Leonardo (escolha explícita entre três opções apresentadas)
- **Estado:** aplicado e verificado (`cvg doctor` → `DOCTOR=OK`)

## Problema

O Pass 4 (Consensus) do Converge exige que os planos sejam atacados por um modelo
de **família diferente** da que os escreveu. O autor aqui é Claude (anthropic),
então o adversário precisa ser openai, moonshot ou google. O `cvg doctor` é
**fail-closed** nisso — e está certo: sem adversário de outra família, o risco é
auto-preferência (o modelo aprova o próprio raciocínio).

A máquina não tinha nenhum CLI de modelo instalado, e não há budget para
assinatura de OpenAI/Moonshot.

## O que estava quebrado no Converge 0.2.0

A descrição da skill `sketch-plans-adversarial-review` promete
`--adversary codex|kimi|gemini`, mas o **código não implementa gemini**:

- `scripts/dispatch-review.sh` só mapeia `codex` (openai), `kimi` (moonshot) e
  `claude` (anthropic); qualquer outro valor cai em
  `uerr "unknown adversary"`.
- `scripts/doctor.sh` só sonda esses mesmos três binários — mesmo com o Gemini
  CLI instalado, o doctor não o enxergaria.

Ou seja: a família google é citada na documentação e no texto do próprio doctor
("a cross-family adversary is openai/moonshot/google"), mas não existe no código.

## Decisão

**Fazer o fork mínimo do Converge para implementar o que a documentação dele já
promete**, em vez de fraudar o gate ou abrir mão dele.

Alternativas rejeitadas:

| Alternativa | Por que não |
|---|---|
| Apontar `CVG_CODEX_CMD` para outra coisa e "ficar verde" | Fraudaria exatamente a garantia que o gate existe pra dar. Nunca. |
| Só instalar o Claude CLI (mesma família) | O doctor seguiria FAIL e o dispatch multi recusa fail-closed — vale como revisão, não como gate cumprido. |
| Subagente Sonnet 5 + ADR de desvio | Zero setup, mas garantia mais fraca e o gate nunca fecharia. Era o plano B. |

## O que foi alterado

Em `sketch-plans-adversarial-review/scripts/`, **nos dois tool homes**
(`.agents/` e `.claude/skills/` — ver "Pegadinha" abaixo):

1. **`dispatch-review.sh`**
   - novo ramo `gemini) FAMILY=google; CMD="${CVG_GEMINI_CMD:-gemini}"; KIND=gemini`
   - nova invocação:
     `gemini --skip-trust --approval-mode plan --output-format text -p "<prompt>"`
     - `--approval-mode plan` é o **modo read-only** do Gemini CLI, que é o
       contrato que o Converge exige do adversário.
     - `--skip-trust` é exigência do próprio CLI em ambiente headless: sem ele
       o Gemini recusa rodar e rebaixa o approval mode para `default`.
   - usage, mensagem de erro e o aviso de "mesma família" atualizados.
2. **`doctor.sh`** — `gemini:google:CVG_GEMINI_CMD` entra na lista `ENGINES`;
   mensagens atualizadas.
3. **`dispatch-review-multi.sh`** — só o exemplo no cabeçalho.

Nada mais foi tocado: a lógica de fail-closed, a proveniência calculada pelo
referee (e não auto-reportada pelo engine) e o schema do gate seguem intactos.

## Pegadinha descoberta no caminho — `.agents/` não é espelho

O CLI `cvg` resolve seu tool home subindo a árvore e testando, **nesta ordem**,
`$dir`, `$dir/.agents`, `$dir/.claude` (`resolve_home`, em `bin/cvg`). Como
`.agents/` existe, é **de lá** que ele executa os scripts — `.claude/skills/` é
o que o Claude Code lê como skills, mas não é o que o `cvg` roda.

Patchar só `.claude/skills/` não teve efeito nenhum no `cvg doctor`. Por isso:

- o patch vive nos **dois** lugares e precisa continuar assim;
- `.agents/` **saiu do `.gitignore`** — ignorá-lo deixaria um clone novo com as
  skills funcionando e o CLI quebrado. `.grok/` continua ignorado (só serve ao
  Grok Build, que não usamos).

## Ambiente

- Gemini CLI `0.59.0` (`npm i -g @google/gemini-cli`), autenticado por
  `GEMINI_API_KEY` no `.env.local` (não versionado). Verificado: sem a variável
  o CLI recusa; com ela, responde.
- Claude Code CLI `2.1.267` (`npm i -g @anthropic-ai/claude-code`) como segundo
  engine — usa a assinatura existente, custo extra zero.
- Ambos precisaram de shim em `~/bin` porque o bin global do npm
  (`%APPDATA%\npm`) não está no PATH do MSYS.

**Resultado:** `engines ready: 2 · cross-family: 1 · DOCTOR=OK`.

## Custo assumido

Somos um fork do Converge em 3 arquivos × 2 tool homes. **Ao atualizar o
Converge, este patch precisa ser reaplicado** — o `install.sh --force`
sobrescreve os scripts. Se o upstream implementar gemini de verdade, o fork
desaparece; vale abrir issue lá apontando a divergência entre a descrição da
skill e o código.
