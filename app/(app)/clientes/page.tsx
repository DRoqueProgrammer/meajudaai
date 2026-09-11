import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/roles";
import { createServerClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/ui";
import { formatData } from "@/lib/format";
import { hojeEmSaoPaulo } from "@/lib/datas";
import { quandoDoServico } from "@/lib/periodo-da-visita";

const STATUS_ESTILO: Record<string, string> = {
  pendente: "bg-tint-warn text-tint-warn-ink",
  confirmado: "bg-tint-ok text-ok",
  realizado: "bg-surface text-ink",
  cancelado: "bg-tint-danger text-danger",
};

type Servico = {
  cliente_id: string;
  descricao: string;
  status: string;
  created_at: string;
  periodo_preferido: string | null;
  hora_combinada_inicio: string | null;
  hora_combinada_fim: string | null;
  slot: { data: string; hora_inicio: string; hora_fim: string } | null;
};

/**
 * Rota `/clientes` (prestador): quem já pediu serviço com ele. Cada cartão
 * mostra o próximo agendamento (data e hora esperadas — a hora combinada, se
 * houver; senão a janela e a preferência), o último serviço com o status, e
 * quantos serviços ao todo — pedido do Leonardo ("card enorme e vazio").
 * Ver ROADMAP.md §2.3.
 */
export default async function ClientesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "prestador_servico") redirect("/inicio");

  const sb = await createServerClient();
  const { data: servicosRaw } = await sb
    .from("servicos")
    .select("cliente_id, slot_id, descricao, status, created_at, periodo_preferido, hora_combinada_inicio, hora_combinada_fim")
    .eq("prestador_id", user.id);
  const slotIds = [...new Set((servicosRaw ?? []).map((s) => s.slot_id))];
  const { data: slots } = slotIds.length
    ? await sb.from("agenda_slots").select("id, data, hora_inicio, hora_fim").in("id", slotIds)
    : { data: [] };
  const slotDe = new Map((slots ?? []).map((s) => [s.id, s]));
  const servicos: Servico[] = (servicosRaw ?? []).map((s) => ({ ...s, slot: slotDe.get(s.slot_id) ?? null }));

  const clienteIds = [...new Set(servicos.map((s) => s.cliente_id))];
  const { data: perfis } = clienteIds.length
    ? await sb.from("profiles").select("user_id, nome, foto_url").in("user_id", clienteIds)
    : { data: [] };

  const hoje = hojeEmSaoPaulo();
  const dataDe = (s: Servico) => s.slot?.data ?? s.created_at.slice(0, 10);
  const resumo = new Map(
    clienteIds.map((id) => {
      const doCliente = servicos.filter((s) => s.cliente_id === id);
      const porData = [...doCliente].sort((a, b) => dataDe(b).localeCompare(dataDe(a)));
      const proximo = doCliente
        .filter((s) => (s.status === "pendente" || s.status === "confirmado") && dataDe(s) >= hoje)
        .sort((a, b) => dataDe(a).localeCompare(dataDe(b)))[0];
      const ultimo = porData.find((s) => s !== proximo) ?? porData[0];
      return [id, { total: doCliente.length, proximo, ultimo, ordem: dataDe(proximo ?? porData[0]!) }];
    }),
  );
  // Quem tem agendamento chegando vem primeiro; depois, o atendimento mais recente.
  const lista = [...(perfis ?? [])].sort((a, b) => {
    const ra = resumo.get(a.user_id)!;
    const rb = resumo.get(b.user_id)!;
    if (Boolean(ra.proximo) !== Boolean(rb.proximo)) return ra.proximo ? -1 : 1;
    return ra.proximo ? ra.ordem.localeCompare(rb.ordem) : rb.ordem.localeCompare(ra.ordem);
  });

  const linhaServico = (s: Servico) => (s.slot ? `${formatData(s.slot.data)} · ${quandoDoServico(s.slot, s)}` : formatData(s.created_at.slice(0, 10)));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Clientes</h1>
      <p className="text-sm text-muted">Pessoas que já solicitaram algum serviço com você.</p>
      {lista.length === 0 ? (
        <p className="card-vazio">Nenhum cliente ainda.</p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {lista.map((p) => {
            const r = resumo.get(p.user_id)!;
            return (
              <Link
                key={p.user_id}
                href={`/clientes/${p.user_id}`}
                className="card flex flex-col gap-3 transition-colors hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <div className="flex items-center gap-3">
                  <Avatar nome={p.nome} fotoUrl={p.foto_url} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{p.nome}</p>
                    <p className="text-xs text-muted">
                      {r.total} {r.total === 1 ? "serviço" : "serviços"} com você
                    </p>
                  </div>
                  <span aria-hidden="true" className="text-muted">
                    →
                  </span>
                </div>

                {r.proximo ? (
                  <div className="rounded-xl bg-tint-info px-3 py-2">
                    <p className="text-rotulo font-semibold uppercase tracking-wide text-brand">Próximo agendamento</p>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <p className="min-w-0 truncate text-sm font-medium">{linhaServico(r.proximo)}</p>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-rotulo font-semibold uppercase tracking-wide ${STATUS_ESTILO[r.proximo.status] ?? ""}`}>
                        {r.proximo.status}
                      </span>
                    </div>
                    <p className="truncate text-xs text-muted">{r.proximo.descricao}</p>
                  </div>
                ) : null}

                {r.ultimo && r.ultimo !== r.proximo ? (
                  <div className="px-1">
                    <p className="text-rotulo font-semibold uppercase tracking-wide text-muted">Último serviço</p>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <p className="min-w-0 truncate text-sm">{r.ultimo.descricao}</p>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-rotulo font-semibold uppercase tracking-wide ${STATUS_ESTILO[r.ultimo.status] ?? ""}`}>
                        {r.ultimo.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted">{linhaServico(r.ultimo)}</p>
                  </div>
                ) : null}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
