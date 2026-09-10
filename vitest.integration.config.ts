import { defineConfig, mergeConfig } from "vitest/config";
import base from "./vitest.config";

/**
 * Config dos testes que batem no Supabase real (RLS e os gabaritos da Fatia 1
 * em tests/fatia1/, que a tarefa 11 devolveu à suíte de integração).
 *
 * Existe como arquivo separado em vez de `RUN_INTEGRATION=1 npm test` porque
 * prefixo de variável não funciona no PowerShell, e o projeto roda no Windows.
 * `test.env` resolve isso do mesmo jeito em qualquer shell.
 *
 * `exclude` não é sobrescrito aqui: o `mergeConfig` concatena arrays, então o
 * `exclude` da base (sem tests/fatia1) é o que libera esses arquivos também
 * nesta config.
 */
export default mergeConfig(
  base,
  defineConfig({
    test: {
      env: { RUN_INTEGRATION: "1" },
      // Criar/apagar usuários reais leva tempo; os gabaritos da Fatia 1 pedem 60s
      // (tests/fatia1/harness.ts cria várias pessoas e praças por cenário).
      testTimeout: 60000,
      hookTimeout: 60000,
      // Cada arquivo de tests/fatia1/ cria e apaga pessoas reais; um de cada vez
      // evita disputar o limite de criação de contas do Auth entre arquivos.
      fileParallelism: false,
    },
  }),
);
