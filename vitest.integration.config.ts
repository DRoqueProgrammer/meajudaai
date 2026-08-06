import { defineConfig, mergeConfig } from "vitest/config";
import base from "./vitest.config";

/**
 * Config dos testes que batem no Supabase real (RLS).
 *
 * Existe como arquivo separado em vez de `RUN_INTEGRATION=1 npm test` porque
 * prefixo de variável não funciona no PowerShell, e o projeto roda no Windows.
 * `test.env` resolve isso do mesmo jeito em qualquer shell.
 */
export default mergeConfig(
  base,
  defineConfig({
    test: {
      env: { RUN_INTEGRATION: "1" },
      // Criar/apagar usuários reais leva tempo; o default de 5s não cobre.
      testTimeout: 30000,
      hookTimeout: 30000,
    },
  }),
);
