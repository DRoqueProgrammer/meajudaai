import { defineConfig } from "vitest/config";

// `server-only` é um marcador do Next que estoura fora do runtime de servidor.
// Alguns módulos o importam só como guarda (rate-limit, log) mas são lógica
// pura testável. O stub deixa esses testes rodarem sem afrouxar nada no app:
// o import continua lá, e continua barrando uso no cliente.

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    alias: { "server-only": new URL("./tests/stubs/server-only.ts", import.meta.url).pathname },
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
