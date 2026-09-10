import { configDefaults, defineConfig } from "vitest/config";
import base from "./vitest.config";

/**
 * Config dos testes-gabarito da Fatia 1 (`tests/fatia1/`, decisão D-026).
 *
 * Os gabaritos foram escritos antes da implementação e falham até cada tarefa
 * entregar a regra — por isso ficam fora do `npm test` e do typecheck, que precisam
 * seguir verdes enquanto a fatia anda. Cada task-spec roda o seu arquivo com
 * `npx vitest run --config vitest.gabarito.config.ts tests/fatia1/<arquivo>`.
 *
 * Batem no Supabase real, como `vitest.integration.config.ts`: `RUN_INTEGRATION`
 * vem daqui, nunca do .env.local (ver tests/setup.ts). A tarefa 11 devolve estes
 * arquivos à suíte de integração e apaga esta config.
 */
export default defineConfig({
  test: {
    ...base.test,
    include: ["tests/fatia1/**/*.test.ts"],
    exclude: [...configDefaults.exclude],
    env: { RUN_INTEGRATION: "1" },
    testTimeout: 60000,
    hookTimeout: 60000,
    // Cada arquivo cria e apaga as próprias pessoas; um de cada vez evita disputar o
    // limite de criação de contas do Auth.
    fileParallelism: false,
  },
});
