import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    // Cobertura mede só `lib/` — é onde mora a lógica que um teste unitário
    // consegue julgar. Componentes e rotas são provados pela jornada ponta a
    // ponta no browser, não por porcentagem de linha.
    //
    // Sem `thresholds` de propósito: a meta é 100% (ver R-33 no tech-spec),
    // mas o número de hoje é 9,84%. Travar o gate agora deixaria todo commit
    // vermelho sem informar nada que este relatório já não diga.
    coverage: {
      provider: "v8",
      include: ["lib/**"],
      reporter: ["text-summary", "json-summary"],
    },
  },
});
