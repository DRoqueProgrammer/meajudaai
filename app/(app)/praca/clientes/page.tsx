import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { pracaAtivaDoAdmin } from "@/lib/admin/praca-ativa";
import { PracaAbas, SemPraca } from "@/components/admin/praca-abas";
import { listarClientesDaPraca, listarPrestadoresDaPraca, listarSinalizacoesDosAlvos, listarSuspensoesAtivas } from "@/lib/admin/consultas";
import { servicosDosClientesNaPraca, slotsPorIds } from "@/lib/admin/abas";
import { suspenderClienteAction, encerrarSuspensaoAction } from "@/lib/actions/suspeitas";
import { SuspensaoControle, type SuspensaoInfo } from "@/components/admin/suspeitas-da-praca";
import { FlagsPessoa, type FlagPessoa } from "@/components/flags-pessoa";
import { LimparRedFlags } from "@/components/admin/limpar-red-flags";
import { Avatar } from "@/components/ui";
import { formatData } from "@/lib/format";

interface ClienteDaLista {
  userId: string;
  nome: string;
  fotoUrl: string | null;
  flagsAprovadas: FlagPessoa[];
  sinalizacoesPendentes: number;
  suspensaoAtiva: SuspensaoInfo | null;
  totalServicos: number;
  ultimoServico: { data: string; prestadorNome: string } | null;
}

/**
 * Rota `/praca/clientes` (Administrador): os clientes da cidade da praça
 * ativa, com as red flags, sinalizações pendentes, quantos serviços já
 * tiveram com prestadores da praça e a suspensão. Pedido do Leonardo em
 * 11/09/2026 (D-047): a página do administrador não tinha aba de Clientes, e
 * ele também pediu o botão de limpar red flags de quem já não merece o
 * carimbo. Leitura pela chave de serviço, recortada pela praça
 * (`lib/admin/abas.ts`); quem tem sinalização vem primeiro, o resto por ordem
 * alfabética.
 */
export default async function PracaClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/inicio");

  const db = createAdminClient();
  const praca = await pracaAtivaDoAdmin(db);
  if (!praca) {
    return (
      <div className="flex flex-col gap-5">
        <PracaAbas atual="/praca/clientes" pracaNome="" cidade={null} estado={null} />
        <SemPraca />
      </div>
    );
  }

  const { q } = await searchParams;
  const busca = (q ?? "").trim();

  const [clientesRaw, prestadoresRaw] = await Promise.all([
    listarClientesDaPraca(db, praca.cidade, praca.estado, praca.exemplo),
    listarPrestadoresDaPraca(db, praca.cidade, praca.estado, praca.exemplo),
  ]);
  const idsClientes = clientesRaw.map((c) => c.user_id);
  const idsPrestadores = prestadoresRaw.map((p) => p.user_id);
  const nomePorPrestador = new Map(prestadoresRaw.map((p) => [p.user_id, p.nome]));

  const [sinalizacoesRaw, suspensoesRaw, servicosRaw] = await Promise.all([
    listarSinalizacoesDosAlvos(db, idsClientes, ["aprovada", "pendente"]),
    listarSuspensoesAtivas(db, idsClientes),
    servicosDosClientesNaPraca(db, idsClientes, idsPrestadores),
  ]);

  // Nomes de quem sinalizou, quando não é um prestador já conhecido (pode ser
  // outro cliente, se algum dia essa direção existir, ou alguém fora da
  // praça — mesmo padrão de `app/(app)/inicio/page.tsx`).
  const idsAutoresExtras = [...new Set(sinalizacoesRaw.map((s) => s.autor_id))].filter((id) => !nomePorPrestador.has(id));
  const { data: perfisExtras } = idsAutoresExtras.length
    ? await db.from("profiles").select("user_id, nome").in("user_id", idsAutoresExtras)
    : { data: [] };
  const nomeExtra = new Map((perfisExtras ?? []).map((p) => [p.user_id, p.nome]));
  const nomeAutor = (id: string) => nomePorPrestador.get(id) ?? nomeExtra.get(id) ?? "Pessoa";

  const flagsAprovadasPorCliente = new Map<string, FlagPessoa[]>();
  const pendentesPorCliente = new Map<string, number>();
  for (const s of sinalizacoesRaw) {
    if (s.status === "aprovada") {
      const arr = flagsAprovadasPorCliente.get(s.alvo_id) ?? [];
      arr.push({ quando: s.created_at, sinalizado_por: nomeAutor(s.autor_id) });
      flagsAprovadasPorCliente.set(s.alvo_id, arr);
    } else if (s.status === "pendente") {
      pendentesPorCliente.set(s.alvo_id, (pendentesPorCliente.get(s.alvo_id) ?? 0) + 1);
    }
  }

  const suspensaoPorCliente = new Map(suspensoesRaw.map((s) => [s.user_id, { motivoPublico: s.motivo_publico, suspensoEm: s.suspenso_em }]));

  // Último serviço por cliente: a data vem do horário da agenda quando dá
  // para achar (mesmo padrão de `app/(app)/clientes/page.tsx`), senão do
  // registro do serviço.
  const slotIds = [...new Set(servicosRaw.map((s) => s.slot_id))];
  const slots = await slotsPorIds(db, slotIds);
  const dataDoSlot = new Map(slots.map((s) => [s.id, s.data]));
  const dataDe = (s: (typeof servicosRaw)[number]) => dataDoSlot.get(s.slot_id) ?? s.created_at.slice(0, 10);

  const totalPorCliente = new Map<string, number>();
  const ultimoPorCliente = new Map<string, { data: string; prestadorNome: string }>();
  for (const clienteId of idsClientes) {
    const doCliente = servicosRaw.filter((s) => s.cliente_id === clienteId);
    totalPorCliente.set(clienteId, doCliente.length);
    if (doCliente.length === 0) continue;
    const maisRecente = [...doCliente].sort((a, b) => dataDe(b).localeCompare(dataDe(a)))[0]!;
    ultimoPorCliente.set(clienteId, { data: dataDe(maisRecente), prestadorNome: nomePorPrestador.get(maisRecente.prestador_id) ?? "—" });
  }

  const lista: ClienteDaLista[] = clientesRaw
    .map((c) => ({
      userId: c.user_id,
      nome: c.nome,
      fotoUrl: c.foto_url,
      flagsAprovadas: flagsAprovadasPorCliente.get(c.user_id) ?? [],
      sinalizacoesPendentes: pendentesPorCliente.get(c.user_id) ?? 0,
      suspensaoAtiva: suspensaoPorCliente.get(c.user_id) ?? null,
      totalServicos: totalPorCliente.get(c.user_id) ?? 0,
      ultimoServico: ultimoPorCliente.get(c.user_id) ?? null,
    }))
    .filter((c) => !busca || c.nome.toLowerCase().includes(busca.toLowerCase()))
    .sort((a, b) => {
      const sinalizadoA = a.flagsAprovadas.length > 0 || a.sinalizacoesPendentes > 0;
      const sinalizadoB = b.flagsAprovadas.length > 0 || b.sinalizacoesPendentes > 0;
      if (sinalizadoA !== sinalizadoB) return sinalizadoA ? -1 : 1;
      return a.nome.localeCompare(b.nome, "pt-BR");
    });

  return (
    <div className="flex flex-col gap-5">
      <PracaAbas atual="/praca/clientes" pracaNome={praca.nome} cidade={praca.cidade} estado={praca.estado} />

      <div>
        <h1 className="text-xl font-semibold">Clientes da praça</h1>
        <p className="text-sm text-muted">Clientes de {praca.cidade ?? "sua cidade"} — quem tem sinalização aparece primeiro.</p>
      </div>

      <form method="get" className="flex items-end gap-2">
        <div className="flex flex-1 flex-col gap-1 sm:max-w-xs">
          <label htmlFor="busca-cliente" className="label">
            Buscar por nome
          </label>
          <input id="busca-cliente" type="search" name="q" defaultValue={busca} placeholder="Nome do cliente" className="input text-sm" />
        </div>
        <button type="submit" className="btn-ghost min-h-11 px-4 py-2 text-sm">
          Buscar
        </button>
      </form>

      {lista.length === 0 ? (
        <p className="card-vazio">
          {busca ? `Nenhum cliente com nome parecido com "${busca}".` : `Nenhum cliente em ${praca.cidade ?? "sua cidade"} ainda.`}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {lista.map((c) => (
            <div key={c.userId} className="card flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <Avatar nome={c.nome} fotoUrl={c.fotoUrl} />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Link href={`/perfil/${c.userId}`} className="truncate text-sm font-semibold hover:underline">
                      {c.nome}
                    </Link>
                    <FlagsPessoa flags={c.flagsAprovadas} />
                  </div>
                  {c.sinalizacoesPendentes > 0 ? (
                    <p className="text-xs font-medium text-tint-warn-ink">
                      {c.sinalizacoesPendentes} {c.sinalizacoesPendentes === 1 ? "sinalização" : "sinalizações"} pendente
                      {c.sinalizacoesPendentes === 1 ? "" : "s"}
                    </p>
                  ) : null}
                  <p className="text-xs text-muted">
                    {c.totalServicos} {c.totalServicos === 1 ? "serviço" : "serviços"} com prestadores da praça
                  </p>
                  {c.ultimoServico ? (
                    <p className="text-xs text-muted">
                      Último serviço: {formatData(c.ultimoServico.data)} · com {c.ultimoServico.prestadorNome}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                <SuspensaoControle
                  userId={c.userId}
                  nome={c.nome}
                  papel="cliente"
                  suspensaoAtiva={c.suspensaoAtiva}
                  suspender={suspenderClienteAction}
                  encerrar={encerrarSuspensaoAction}
                />
                <LimparRedFlags userId={c.userId} nome={c.nome} quantidade={c.flagsAprovadas.length} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
