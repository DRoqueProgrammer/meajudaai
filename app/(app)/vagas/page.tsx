import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { VagaCard } from "@/components/vaga-card";
import { CIDADES } from "@/lib/cidades";
import { CATEGORIAS } from "@/lib/categorias";
import { QUANDOS, isQuando, rangeDoQuando } from "@/lib/periodo";
import { getCurrentUser } from "@/lib/auth/roles";

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className={`chip ${active ? "chip-on" : "chip-off"}`} aria-current={active ? "page" : undefined}>
      {children}
    </Link>
  );
}

export default async function BuscarVagasPage({
  searchParams,
}: {
  searchParams: Promise<{ cidade?: string; categoria?: string; quando?: string }>;
}) {
  const { cidade, categoria, quando } = await searchParams;
  const quandoAtivo = isQuando(quando) ? quando : null;
  const hojeStr = new Date().toLocaleDateString("sv-SE");

  const sb = await createServerClient();
  const user = await getCurrentUser();
  const { data: perfil } = await sb
    .from("profiles")
    .select("cidade")
    .eq("user_id", user!.id)
    .maybeSingle();

  // "Perto de você" é um dos pilares do produto, então a cidade do perfil é o
  // padrão — não um filtro escondido atrás de 15 chips. `cidade=todas` é o
  // escape explícito; sem ele não daria para distinguir "não escolhi" de
  // "escolhi ver o país inteiro".
  const cidadePadrao = perfil?.cidade ?? null;
  const verTodasCidades = cidade === "todas";
  const cidadeAtiva = verTodasCidades ? null : (cidade ?? cidadePadrao);

  let q = sb
    .from("vagas")
    .select("*")
    .eq("status", "aberta")
    // Ordena pela data do serviço, não por quando foi publicada: quem procura
    // diária quer a de amanhã primeiro, não a que alguém postou agora para daqui a um mês.
    .order("data_servico", { ascending: true, nullsFirst: false });
  if (cidadeAtiva) q = q.eq("cidade", cidadeAtiva);
  if (categoria) q = q.eq("categoria", categoria);
  if (quandoAtivo) {
    const { desde, ate } = rangeDoQuando(quandoAtivo);
    q = q.gte("data_servico", desde).lte("data_servico", ate);
  } else {
    // Sem filtro de data, ainda assim nada do passado no feed.
    q = q.gte("data_servico", hojeStr);
  }
  const { data: vagas } = await q;
  const lista = vagas ?? [];

  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { cidade, categoria, quando: quandoAtivo ?? undefined, ...patch };
    if (merged.cidade) p.set("cidade", merged.cidade);
    if (merged.categoria) p.set("categoria", merged.categoria);
    if (merged.quando) p.set("quando", merged.quando);
    const s = p.toString();
    return s ? `/vagas?${s}` : "/vagas";
  };

  // Categoria e cidade ficam recolhidas: eram 14 chips de peso visual igual
  // empurrando as vagas para baixo da dobra. O contador é o que diz que há
  // filtro escondido — recolhido sem sinal é filtro esquecido.
  // A cidade padrão não conta como refino: ela é o estado normal, e mostrar "1"
  // sem o usuário ter escolhido nada faria o contador mentir.
  const cidadeEscolhida = !!cidade && !verTodasCidades && cidade !== cidadePadrao;
  const refinos = (categoria ? 1 : 0) + (cidadeEscolhida || verTodasCidades ? 1 : 0);
  const nomeCat = CATEGORIAS.find((c) => c.slug === categoria)?.nome;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Vagas abertas</h1>
        <p className="mt-0.5 text-sm text-muted">
          {lista.length} vaga{lista.length === 1 ? "" : "s"}
          {quandoAtivo ? ` ${QUANDOS.find((x) => x.value === quandoAtivo)!.label.toLowerCase()}` : ""}
          {nomeCat ? ` · ${nomeCat}` : ""}
          {cidadeAtiva ? ` em ${cidadeAtiva}` : " em todas as cidades"}
        </p>
      </div>

      {/* O escape da cidade fica FORA do <details>: se estivesse lá dentro, o
          usuário não saberia que a lista está filtrada pela cidade dele. */}
      <p className="-mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
        {cidadeAtiva ? (
          <>
            <span>Mostrando diárias em {cidadeAtiva}.</span>
            <Link href={qs({ cidade: "todas" })} className="font-medium text-brand underline">
              Ver todas as cidades
            </Link>
          </>
        ) : (
          <>
            <span>Mostrando o país inteiro.</span>
            {cidadePadrao ? (
              <Link href={qs({ cidade: undefined })} className="font-medium text-brand underline">
                Só {cidadePadrao}
              </Link>
            ) : null}
          </>
        )}
      </p>

      <div className="flex flex-wrap gap-2">
        <Chip href={qs({ quando: undefined })} active={!quandoAtivo}>
          Qualquer data
        </Chip>
        {QUANDOS.map((p) => (
          <Chip key={p.value} href={qs({ quando: p.value })} active={quandoAtivo === p.value}>
            {p.label}
          </Chip>
        ))}
      </div>

      <details open={refinos > 0} className="rounded-xl border border-line bg-white">
        <summary className="flex min-h-11 cursor-pointer items-center gap-2 px-4 text-sm font-medium marker:content-['']">
          Filtros
          {refinos > 0 ? (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1.5 text-xs font-semibold text-white">
              {refinos}
            </span>
          ) : null}
          <span className="ml-auto text-xs text-muted">categoria e cidade</span>
        </summary>

        <div className="flex flex-col gap-4 border-t border-line px-4 py-4">
          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Categoria</p>
            <div className="flex flex-wrap gap-2">
              <Chip href={qs({ categoria: undefined })} active={!categoria}>
                Todas
              </Chip>
              {CATEGORIAS.map((c) => (
                <Chip key={c.slug} href={qs({ categoria: c.slug })} active={categoria === c.slug}>
                  {c.nome}
                </Chip>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Cidade</p>
            <div className="flex flex-wrap gap-2">
              <Chip href={qs({ cidade: "todas" })} active={verTodasCidades}>
                Todas
              </Chip>
              {/* As 14 do cadastro. Antes eram 6: quem se cadastrou em Recife
                  nunca conseguia filtrar por Recife. */}
              {CIDADES.map((c) => (
                <Chip
                  key={`${c.nome}-${c.uf}`}
                  href={qs({ cidade: c.nome })}
                  active={cidadeAtiva === c.nome}
                >
                  {c.nome}
                </Chip>
              ))}
            </div>
          </div>

          {refinos > 0 ? (
            <Link href={qs({ categoria: undefined, cidade: undefined })} className="link-touch self-start">
              Limpar categoria e cidade
            </Link>
          ) : null}
        </div>
      </details>

      <div className="flex flex-col gap-3">
        {lista.map((v) => (
          <VagaCard key={v.id} vaga={v} href={`/vagas/${v.id}`} descricao />
        ))}
        {lista.length === 0 && (
          <div className="card-vazio">
            <p className="text-sm text-muted">
              Nenhuma vaga
              {quandoAtivo
                ? ` ${QUANDOS.find((x) => x.value === quandoAtivo)!.label.toLowerCase()}`
                : ""}
              {nomeCat ? ` de ${nomeCat.toLowerCase()}` : ""}
              {cidadeAtiva ? ` em ${cidadeAtiva}` : ""}.
            </p>
            {/* Ampliar a cidade costuma resolver mais que limpar tudo, então
                é a saída oferecida primeiro. */}
            {cidadeAtiva ? (
              <Link href={qs({ cidade: "todas" })} className="btn-ghost mt-4">
                Procurar em outras cidades
              </Link>
            ) : quandoAtivo || refinos > 0 ? (
              <Link href="/vagas?cidade=todas" className="btn-ghost mt-4">
                Limpar os filtros
              </Link>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
