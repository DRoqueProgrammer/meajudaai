import Link from "next/link";

/**
 * Recibo de publicação.
 *
 * Publicar era o pico do produto e terminava num `router.push` mudo: o
 * profissional comprometia dinheiro e um dia de obra e não recebia sinal
 * nenhum de que a promessa ("três candidatos até 07:10") tinha começado.
 *
 * O número de ajudantes é o alcance real da vaga, não uma projeção — por isso
 * a frase é "podem ver", não "vão se candidatar".
 */
export function VagaPublicada({ cidade, ajudantes }: { cidade: string; ajudantes: number }) {
  return (
    <section className="rounded-2xl border border-ok bg-tint-ok p-5">
      <p className="text-base font-bold text-ok">
        Sua diária está no ar <span aria-hidden="true">✓</span>
      </p>
      <p className="mt-1 text-sm leading-relaxed text-ink">
        {ajudantes > 0 ? (
          <>
            <strong className="font-semibold">
              {ajudantes} ajudante{ajudantes === 1 ? "" : "s"}
            </strong>{" "}
            de {cidade} {ajudantes === 1 ? "pode" : "podem"} ver esta vaga agora. Abaixo está
            exatamente o que {ajudantes === 1 ? "ele vê" : "eles veem"}.
          </>
        ) : (
          <>
            Ainda não há ajudante cadastrado em {cidade}, mas a vaga fica no ar e aparece assim que
            alguém se cadastrar por aí. Abaixo está o que a pessoa vai ver.
          </>
        )}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link href="/minhas-vagas" className="btn-action">
          Ver minhas vagas
        </Link>
        <Link href="/publicar" className="btn-ghost">
          Publicar outra
        </Link>
      </div>
    </section>
  );
}
