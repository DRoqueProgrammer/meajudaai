import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/**
 * `exportarDadosDoTitular` (LGPD art. 18, VI — portabilidade/acesso; decisão
 * D-023): devolve, em um objeto serializável em JSON, tudo o que é da pessoa e
 * as atividades dela desde o cadastro. Usado por `GET /api/meus-dados`
 * (botão "Baixar meus dados" do perfil).
 *
 * Regra de ouro: TODA consulta filtra explicitamente por `userId` — nunca por
 * "tudo, exceto...". Onde uma atividade envolve outra pessoa (o prestador de
 * um serviço, quem avaliou, quem está na mesma equipe), a outra parte entra
 * NO MÁXIMO como `{ id, nome }` (nome público de `profiles`, a mesma
 * informação que `profiles_select_all` já expõe a qualquer autenticado) —
 * nunca o contato dela: `profiles_pii`, `profile_local` e `login_logs` de
 * terceiros nunca são lidos aqui.
 *
 * Recebe o client já pronto (chave de serviço, como os módulos de
 * `lib/admin/`) porque quem chama decide a credencial; esta função só decide
 * o recorte dos dados.
 */

type DB = SupabaseClient<Database>;

/** Só o que é seguro mostrar de outra pessoa: id + nome público. */
interface PessoaPublica {
  id: string;
  nome: string | null;
}

/** Mapa `user_id -> nome público`, para anotar a contraparte de uma atividade sem tocar no contato dela. */
async function nomesPublicosDe(db: DB, ids: readonly (string | null)[]): Promise<Map<string, string | null>> {
  const unicos = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (unicos.length === 0) return new Map();
  const { data } = await db.from("profiles").select("user_id, nome").in("user_id", unicos);
  return new Map((data ?? []).map((p) => [p.user_id, p.nome]));
}

function pessoa(nomes: Map<string, string | null>, id: string | null): PessoaPublica | null {
  if (!id) return null;
  return { id, nome: nomes.get(id) ?? null };
}

export interface DadosDoTitular {
  gerado_em: string;
  perfil: Database["public"]["Tables"]["profiles"]["Row"] | null;
  contato: Database["public"]["Tables"]["profiles_pii"]["Row"] | null;
  local: Database["public"]["Tables"]["profile_local"]["Row"] | null;
  servicos: Array<
    Database["public"]["Tables"]["servicos"]["Row"] & {
      papel: "cliente" | "prestador";
      outra_parte: PessoaPublica | null;
    }
  >;
  horarios: Database["public"]["Tables"]["agenda_slots"]["Row"][];
  avaliacoes: {
    feitas: Array<Database["public"]["Tables"]["avaliacoes"]["Row"] & { avaliado: PessoaPublica | null }>;
    recebidas: Array<Database["public"]["Tables"]["avaliacoes"]["Row"] & { avaliador: PessoaPublica | null }>;
  };
  mensagens_enviadas: Database["public"]["Tables"]["mensagens"]["Row"][];
  notificacoes: Database["public"]["Tables"]["notificacoes"]["Row"][];
  acessos: Database["public"]["Tables"]["login_logs"]["Row"][];
  demandas_de_busca: Database["public"]["Tables"]["demanda_servico"]["Row"][];
  // Anúncios do prestador (migration 0044): serviço ou vaga para ajudante —
  // conteúdo dela, sem outra parte envolvida, então `select *` completo (o
  // WhatsApp da vaga é dela mesma, quem escolheu expor).
  anuncios: Database["public"]["Tables"]["anuncios"]["Row"][];
  // Suspensões (migrations 0052/0054) — o motivo que ELA leu é dado pessoal
  // dela. Sinalizações (as que ela escreveu e as que a têm como alvo) e as
  // suspeitas privadas NÃO entram: são registros da administração, nunca dados
  // de prestadores ou clientes (D-045, decisão do dono em 11/09/2026).
  suspensoes: Database["public"]["Tables"]["suspensoes"]["Row"][];
  vinculos: {
    equipe: Array<
      Database["public"]["Tables"]["workspace_members"]["Row"] & {
        praca: Pick<Database["public"]["Tables"]["workspaces"]["Row"], "id" | "nome" | "cidade" | "estado"> | null;
      }
    >;
    modulos: Database["public"]["Tables"]["user_modules"]["Row"][];
  };
  pedidos_de_exclusao: Database["public"]["Tables"]["pedidos_exclusao"]["Row"][];
}

export async function exportarDadosDoTitular(db: DB, userId: string): Promise<DadosDoTitular> {
  const [
    perfilRes,
    contatoRes,
    localRes,
    comoClienteRes,
    comoPrestadorRes,
    horariosRes,
    avaliacoesFeitasRes,
    avaliacoesRecebidasRes,
    mensagensRes,
    notificacoesRes,
    acessosRes,
    demandasRes,
    equipeRes,
    modulosRes,
    pedidosRes,
    anunciosRes,
    suspensoesRes,
  ] = await Promise.all([
    db.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
    db.from("profiles_pii").select("*").eq("user_id", userId).maybeSingle(),
    db.from("profile_local").select("*").eq("user_id", userId).maybeSingle(),
    db.from("servicos").select("*").eq("cliente_id", userId),
    db.from("servicos").select("*").eq("prestador_id", userId),
    db.from("agenda_slots").select("*").eq("prestador_id", userId),
    db.from("avaliacoes").select("*").eq("avaliador_id", userId),
    db.from("avaliacoes").select("*").eq("avaliado_id", userId),
    db.from("mensagens").select("*").eq("remetente_id", userId),
    db.from("notificacoes").select("*").eq("user_id", userId),
    db.from("login_logs").select("*").eq("user_id", userId),
    db.from("demanda_servico").select("*").eq("user_id", userId),
    db.from("workspace_members").select("*").eq("user_id", userId),
    db.from("user_modules").select("*").eq("user_id", userId),
    db.from("pedidos_exclusao").select("*").eq("user_id", userId),
    db.from("anuncios").select("*").eq("prestador_id", userId),
    db.from("suspensoes").select("*").eq("user_id", userId),
  ]);

  const comoCliente = comoClienteRes.data ?? [];
  const comoPrestador = comoPrestadorRes.data ?? [];
  const avaliacoesFeitas = avaliacoesFeitasRes.data ?? [];
  const avaliacoesRecebidas = avaliacoesRecebidasRes.data ?? [];
  const equipe = equipeRes.data ?? [];

  // Só id + nome público de quem participou de uma atividade com a pessoa —
  // nunca o contato: uma única consulta a `profiles` (pública) resolve todos
  // os nomes de uma vez.
  const nomes = await nomesPublicosDe(db, [
    ...comoCliente.map((s) => s.prestador_id),
    ...comoPrestador.map((s) => s.cliente_id),
    ...avaliacoesFeitas.map((a) => a.avaliado_id),
    ...avaliacoesRecebidas.map((a) => a.avaliador_id),
  ]);

  const idsPraca = [...new Set(equipe.map((m) => m.workspace_id))];
  const pracas = idsPraca.length
    ? ((await db.from("workspaces").select("id, nome, cidade, estado").in("id", idsPraca)).data ?? [])
    : [];
  const pracaDe = new Map(pracas.map((w) => [w.id, w]));

  return {
    gerado_em: new Date().toISOString(),
    perfil: perfilRes.data ?? null,
    contato: contatoRes.data ?? null,
    local: localRes.data ?? null,
    servicos: [
      ...comoCliente.map((s) => ({ ...s, papel: "cliente" as const, outra_parte: pessoa(nomes, s.prestador_id) })),
      // Como prestadora, o local do serviço é a casa do CLIENTE — dado pessoal
      // da outra parte, não dela: sai da exportação (o serviço e o valor ficam).
      ...comoPrestador.map((s) => ({
        ...s,
        endereco: null,
        lat: null,
        lng: null,
        papel: "prestador" as const,
        outra_parte: pessoa(nomes, s.cliente_id),
      })),
    ],
    horarios: horariosRes.data ?? [],
    avaliacoes: {
      feitas: avaliacoesFeitas.map((a) => ({ ...a, avaliado: pessoa(nomes, a.avaliado_id) })),
      recebidas: avaliacoesRecebidas.map((a) => ({ ...a, avaliador: pessoa(nomes, a.avaliador_id) })),
    },
    mensagens_enviadas: mensagensRes.data ?? [],
    notificacoes: notificacoesRes.data ?? [],
    acessos: acessosRes.data ?? [],
    demandas_de_busca: demandasRes.data ?? [],
    vinculos: {
      equipe: equipe.map((m) => ({ ...m, praca: pracaDe.get(m.workspace_id) ?? null })),
      modulos: modulosRes.data ?? [],
    },
    pedidos_de_exclusao: pedidosRes.data ?? [],
    anuncios: anunciosRes.data ?? [],
    suspensoes: suspensoesRes.data ?? [],
  };
}
