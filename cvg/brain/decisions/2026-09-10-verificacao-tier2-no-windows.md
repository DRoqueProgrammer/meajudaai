# Decisão — Verificação de tier 2 funcionando no Windows, e o Pass 7 fora da Fatia 1

- **Data:** 10/09/2026
- **Decidido por:** Claude Opus 5 (controller), sob a delegação *"aprovo, faça o que precisar para ficar bom"*
- **Relacionadas:** D-021 (migration nova passa por tier 2), D-027 (protocolo do Pass 8), [Gemini como adversário do Pass 4](2026-09-09-gemini-como-adversario-do-pass-4.md)

## Problema

A D-027 põe a verificação independente de tier 2 (`cvg verify`) no caminho de toda
tarefa da Fatia 1, e a D-021 a exige para toda migration nova. No Windows ela não
rodava:

1. **O juiz não sobe.** `verify-work.py` chama `Popen(["gemini", ...])`. O
   `CreateProcess` do Windows não consulta o `PATHEXT`, então não acha o
   `gemini.CMD` que o npm instala — mesmo com o `shutil.which` do próprio script
   dizendo que o engine existe.
2. **O prompt não cabe.** O prompt do juiz é intenção + diff inteiro, passado como
   argumento. Um diff de migration passa fácil do limite de linha de comando do
   Windows (~32 KB, ~8 KB atravessando um `.CMD`). É o mesmo defeito que o Pass 4
   já tinha mostrado (addendum da decisão de 09/09).
3. **O ramo do gemini não é read-only.** O script chamava `gemini -p` sem
   `--approval-mode plan`, ao contrário do que o Pass 4 exige de um adversário.

Além disso, o `cvg bind` (Pass 7) quebra com `WinError 193`: o `_runtime_contract.py`
executa o lançador do Task-Spec, que é um script bash sem extensão.

## Decisão

**Fork mínimo do `verify-work.py`, nos dois tool homes** (`.agents/` e
`.claude/skills/`, pela mesma pegadinha da decisão de 09/09):

- o gemini recebe o prompt por **stdin** e roda com
  `--skip-trust --approval-mode plan --output-format text` — o contrato do
  `dispatch-review.sh` do Pass 4;
- o executável é resolvido por `shutil.which` (acha o `.CMD` no Windows e não muda
  nada no POSIX);
- no estouro de tempo, o Windows derruba a árvore com `taskkill /T` (não existe
  `os.killpg`).

Nada mais muda: o veredito continua falhando fechado, o juiz continua vendo só
intenção + diff (nunca o transcript do executor), e a escolha do juiz continua
preferindo outra família — o gemini (google) contra o executor claude (anthropic).

**O Pass 7 (`cvg bind`) fica fora da Fatia 1.** O perfil de execução que ele grava
alimenta o `cvg loop`, que a D-027 já deixou de lado. O que a Fatia 1 precisa do
Pass 7 — a cerca de escrita e o escopo declarado — é conferido pelo
`taskspec accept` (escopo, `do_not_touch`, HMAC, dependências) e pelo
`cvg gate --path`. Consertar o bind no Windows entra junto quando o `cvg loop`
ganhar shell.

## Como rodar

```bash
export GEMINI_API_KEY=$(grep '^GEMINI_API_KEY=' .env.local | cut -d= -f2-)
cvg verify --task cvg/tasks/<id>.md --judge gemini --base <commit anterior à tarefa>
```

`--base` aponta para o commit de antes da tarefa, para o juiz ver o trabalho
inteiro (commitado ou não).

## Custo assumido

Mais um arquivo no fork do Converge (agora 4 arquivos × 2 tool homes). Ao
atualizar o Converge, este patch precisa ser reaplicado.
