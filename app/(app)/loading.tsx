/**
 * Esqueleto de carregamento das rotas de /(app).
 *
 * Toda página aqui é Server Component com consulta ao Supabase; em 4G de obra
 * a navegação ficava congelada sem sinal e o usuário tocava de novo.
 *
 * VERIFICAÇÃO: a revelação do Suspense (os scripts `$RC` do React) NÃO funciona
 * no navegador embutido usado no desenvolvimento — comprovado com um Suspense
 * mínimo de 12 linhas, sem código do app: o conteúdo chega ao DOM mas o
 * fallback nunca sai. Em navegador real isso é comportamento padrão do React 19.
 * Se algum dia aparecer esqueleto permanente EM NAVEGADOR DE VERDADE, é aqui.
 *
 * O `animate-pulse` é neutralizado por `prefers-reduced-motion` (globals.css).
 */
export default function Loading() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <span className="sr-only" role="status">
        Carregando…
      </span>
      <div className="h-7 w-48 animate-pulse rounded-lg bg-line" />
      <div className="h-4 w-64 animate-pulse rounded-lg bg-line" />
      <div className="mt-2 flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card flex items-center gap-3">
            <div className="h-11 w-11 shrink-0 animate-pulse rounded-xl bg-line" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/5 animate-pulse rounded bg-line" />
              <div className="h-3 w-2/5 animate-pulse rounded bg-line" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
