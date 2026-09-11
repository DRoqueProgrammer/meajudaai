import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { nomeCategoria } from "@/lib/categorias";
import { Avatar } from "@/components/ui";

/** Um cartão da vitrine: o serviço oferecido, sem contato — o contato só aparece depois do agendamento. */
function CartaoServico({
  titulo,
  descricao,
  cidade,
  estado,
  prestadorId,
  prestadorNome,
  prestadorCategoria,
  prestadorFoto,
  exemplo,
}: {
  titulo: string;
  descricao: string;
  cidade: string | null;
  estado: string | null;
  prestadorId: string;
  prestadorNome: string;
  prestadorCategoria: string | null;
  prestadorFoto: string | null;
  exemplo: boolean;
}) {
  return (
    <div className="card flex h-full flex-col gap-3">
      <div className="flex items-center gap-3">
        <Avatar nome={prestadorNome} fotoUrl={prestadorFoto} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{prestadorNome}</p>
          {prestadorCategoria ? (
            <p className="truncate text-xs text-muted">{nomeCategoria(prestadorCategoria)}</p>
          ) : null}
        </div>
        {exemplo ? (
          <span className="shrink-0 rounded-full bg-tint-neutral px-2 py-0.5 text-xs font-medium text-muted">
            Exemplo
          </span>
        ) : null}
      </div>

      <div>
        <p className="text-base font-semibold leading-tight text-ink">{titulo}</p>
        <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-muted">{descricao}</p>
        {cidade ? (
          <p className="mt-2 text-xs text-muted">
            {cidade}
            {estado ? `, ${estado}` : ""}
          </p>
        ) : null}
      </div>

      {/* Sem contato aqui — só depois do agendamento, como no resto do app
          (0044). Quem não tem conta cria uma; quem já tem, entra e volta pra
          este perfil. */}
      <div className="mt-auto flex flex-col gap-1.5 border-t border-line pt-3">
        <Link href="/cadastro" className="btn-brand w-full">
          Ver agenda
        </Link>
        <p className="text-center text-xs text-muted">Crie sua conta grátis para agendar</p>
        <Link href={`/login?next=/perfil/${prestadorId}`} className="link-touch mx-auto text-xs">
          Já tenho conta
        </Link>
      </div>
    </div>
  );
}

/**
 * Vitrine pública de anúncios de serviço (pedido do Leonardo: "busca, perfil,
 * vitrine pública na main page"). Server Component: busca os próprios dados
 * pelo client do servidor SEM chave de serviço (`anuncios_publicos`, RPC
 * liberada para `anon`) — a landing nunca precisa de service role para isto.
 */
export async function VitrineServicos() {
  const supabase = await createServerClient();
  const { data } = await supabase.rpc("anuncios_publicos", {
    p_tipo: "servico",
    p_limite: 12,
  });
  const servicos = data ?? [];

  return (
    <div>
      <div className="max-w-[56ch]">
        <h2 className="text-2xl font-bold tracking-[-0.02em]">Prestadores em destaque</h2>
        <p className="mt-1.5 text-sm text-muted">
          Anúncios de serviço de prestadores da região. Veja a agenda e marque um horário — o
          contato aparece depois do agendamento confirmado.
        </p>
      </div>

      {servicos.length === 0 ? (
        <div className="card-vazio mt-5">
          <p className="font-medium text-ink">Nenhum anúncio de serviço publicado agora.</p>
          <p className="mt-1">
            Você é prestador?{" "}
            <Link href="/cadastro?papel=prestador_servico" className="text-brand underline">
              Publique seu anúncio
            </Link>{" "}
            — é grátis.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {servicos.map((s) => (
            <CartaoServico
              key={s.id}
              titulo={s.titulo}
              descricao={s.descricao}
              cidade={s.cidade}
              estado={s.estado}
              prestadorId={s.prestador_id}
              prestadorNome={s.prestador_nome}
              prestadorCategoria={s.prestador_categoria}
              prestadorFoto={s.prestador_foto}
              exemplo={s.exemplo}
            />
          ))}
        </div>
      )}
    </div>
  );
}
