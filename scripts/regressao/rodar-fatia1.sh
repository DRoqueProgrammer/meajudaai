#!/usr/bin/env bash
# Roteiro de regressão da Fatia 1 (R-54): build de produção + os 10 passos no navegador.
# Gabarito escrito pelo controller antes da tarefa 11 — o executor não o edita.
# Usa o Chrome instalado e as contas de exemplo; limpa o que criou no banco.
set -euo pipefail
cd "$(dirname "$0")/../.."
npm run build
node scripts/regressao/fatia1.mjs --servir
