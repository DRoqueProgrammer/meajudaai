import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { hojeEmSaoPaulo } from "@/lib/datas";

/**
 * `anonimizarTitular` (LGPD art. 18, VI — eliminação; decisão D-023): tira o
 * dado pessoal e MANTÉM os ids. Nunca deletamos a pessoa do Auth — várias
 * tabelas (`servicos.cliente_id`, `profiles.user_id`, ...) referenciam
 * `auth.users(id) on delete cascade`, e apagar o usuário apagaria com ele o
 * histórico de serviços e avaliações da OUTRA parte. Em vez disso: o e-mail
 * do Auth vira um endereço inválido e único, a senha é trocada por uma
 * aleatória e a conta é banida — ninguém entra de novo nela.
 *
 * Idempotente: chamar duas vezes não quebra e não muda o resultado (o e-mail
 * alvo é determinístico pelo `userId`; linhas já limpas ficam como estão).
 * Nunca toca no dado pessoal da outra parte de um serviço/avaliação/equipe —
 * só filtra por `userId`, igual ao exportador.
 *
 * Falha alto: cada passo confere o erro do banco e lança
 * (`AnonimizacaoFalhou`). O pedido só vira `concluido` no último passo, então
 * uma falha no meio deixa o pedido pendente e o cron tenta de novo no dia
 * seguinte — nunca um "concluído" com dado pessoal ainda no banco.
 */

type DB = SupabaseClient<Database>;

/** Bane "para sempre" no sentido prático de um protótipo — 100 anos. */
const BANIMENTO_PERMANENTE = "876000h";

const NOME_REMOVIDO = "Pessoa removida";
const DESCRICAO_SERVICO_REMOVIDA = "Descrição removida a pedido do titular dos dados.";
const CONTEUDO_MENSAGEM_REMOVIDO = "Mensagem removida a pedido do titular dos dados.";
const MOTIVO_CANCELAMENTO = "A outra pessoa removeu a conta (pedido de exclusão de dados).";

/** Extensões possíveis da foto de perfil — o caminho no bucket é `<userId>/perfil.<ext>` (lib/actions/perfil.ts). */
const EXTENSOES_FOTO = ["jpg", "png", "webp"] as const;

/** Erro de um passo da anonimização, com o nome do passo para o log do cron. */
export class AnonimizacaoFalhou extends Error {
  constructor(passo: string, causa: { message?: string; code?: string } | null) {
    super(`anonimização parou em "${passo}": ${causa?.code ?? ""} ${causa?.message ?? "erro desconhecido"}`.trim());
    this.name = "AnonimizacaoFalhou";
  }
}

/** Lança se o resultado de uma chamada ao Supabase trouxe erro. */
function conferir(passo: string, resultado: { error: { message?: string; code?: string } | null }): void {
  if (resultado.error) throw new AnonimizacaoFalhou(passo, resultado.error);
}

/** E-mail de Auth alvo, determinístico por `userId` — o que torna a troca idempotente. */
function emailRemovido(userId: string): string {
  return `removido+${userId}@invalid.local`;
}

function senhaAleatoria(): string {
  return `removido-${crypto.randomUUID()}`;
}


export async function anonimizarTitular(db: DB, userId: string): Promise<void> {
  // 1) Agendamentos em aberto (pendente/confirmado) de hoje em diante, nos
  // dois papéis: a pessoa não vai mais aparecer, então a outra parte não pode
  // ficar esperando. Cancela com motivo, avisa a outra parte e, quando quem
  // saiu é o CLIENTE, devolve o horário ao prestador. Agendamento passado em
  // aberto fica como está — é trabalho que pode ter acontecido.
  const hoje = hojeEmSaoPaulo();
  const abertos = await db
    .from("servicos")
    .select("id, slot_id, cliente_id, prestador_id, agenda_slots(data)")
    .or(`cliente_id.eq.${userId},prestador_id.eq.${userId}`)
    .in("status", ["pendente", "confirmado"]);
  conferir("listar agendamentos em aberto", abertos);
  const futuros = (abertos.data ?? []).filter((s) => {
    const slot = s.agenda_slots as unknown as { data: string } | null;
    return !slot || slot.data >= hoje;
  });
  for (const s of futuros) {
    conferir(
      "cancelar agendamento em aberto",
      await db
        .from("servicos")
        .update({ status: "cancelado", cancelado_motivo: MOTIVO_CANCELAMENTO, cancelado_em: new Date().toISOString() })
        .eq("id", s.id),
    );
    const quemSaiuEraCliente = s.cliente_id === userId;
    if (quemSaiuEraCliente) {
      conferir("devolver horário ao prestador", await db.from("agenda_slots").update({ status: "livre" }).eq("id", s.slot_id));
    }
    const outraParte = quemSaiuEraCliente ? s.prestador_id : s.cliente_id;
    conferir(
      "avisar a outra parte",
      await db.from("notificacoes").insert({
        user_id: outraParte,
        tipo: "servico_cancelado",
        titulo: "Um agendamento foi cancelado",
        mensagem: "A outra pessoa removeu a conta do Me Ajuda Aí, e o agendamento foi cancelado.",
        link: "/agenda",
      }),
    );
  }

  // 2) Horários livres que ela oferecia como prestadora — saem da agenda. Só
  // os que nenhum serviço referencia (a FK de servicos.slot_id é restrict, e
  // horário com serviço é histórico da outra parte). Os que sobram não são
  // reserváveis: a reserva exige prestador ativo (migration 0043).
  const livres = await db.from("agenda_slots").select("id").eq("prestador_id", userId).eq("status", "livre");
  conferir("listar horários livres", livres);
  const idsLivres = (livres.data ?? []).map((l) => l.id);
  if (idsLivres.length > 0) {
    const referenciados = await db.from("servicos").select("slot_id").in("slot_id", idsLivres);
    conferir("conferir horários com serviço", referenciados);
    const comServico = new Set((referenciados.data ?? []).map((r) => r.slot_id));
    const apagaveis = idsLivres.filter((id) => !comServico.has(id));
    if (apagaveis.length > 0) {
      conferir("apagar horários livres", await db.from("agenda_slots").delete().in("id", apagaveis));
    }
  }

  // 3) Anúncios que ela publicou como prestadora (migration 0044) — SEMPRE
  // apagados, nunca só limpos: a vaga para ajudante exige WhatsApp por
  // constraint (`anuncios_vaga_tem_whatsapp`), então um `update` que tirasse
  // o número quebraria a linha. Sem outra parte envolvida — é conteúdo dela
  // — apagar é o certo, igual ao endereço (passo 7).
  conferir("apagar anúncios", await db.from("anuncios").delete().eq("prestador_id", userId));

  // 4) profiles — nome/foto/bio/disponibilidade/gênero/localização textual
  // limpos e status 'removido' (some da busca e não recebe reserva — 0043);
  // `tipo_base` (papel) e as métricas de reputação (nota_media,
  // total_avaliacoes, servicos_realizados) ficam, porque são o histórico da
  // OUTRA parte e não identificam ninguém sozinhas.
  conferir(
    "limpar perfil",
    await db
      .from("profiles")
      .update({
        nome: NOME_REMOVIDO,
        foto_url: null,
        bio: null,
        disponibilidade: null,
        genero: null,
        cidade: null,
        estado: null,
        bairro: null,
        cidade_ibge: null,
        status: "removido",
      })
      .eq("user_id", userId),
  );

  // 5) A foto em si, no bucket — `foto_url` null não apaga o arquivo, e a URL
  // pública antiga continuaria abrindo. `remove` de caminho inexistente não
  // é erro, então repetir é seguro.
  conferir(
    "apagar foto do storage",
    await db.storage.from("avatares").remove(EXTENSOES_FOTO.map((ext) => `${userId}/perfil.${ext}`)),
  );

  // 6) profiles_pii — contato inteiro limpo (CPF já não existe mais nesta
  // tabela desde a migration 0018).
  conferir(
    "limpar contato",
    await db
      .from("profiles_pii")
      .update({ email: emailRemovido(userId), telefone: null, chave_pix: null })
      .eq("user_id", userId),
  );

  // 7) profile_local (endereço + PIN exato) — apagado, não só limpo: é uma
  // tabela 1:1 por pessoa, sem valor em manter a linha vazia.
  conferir("apagar endereço e localização", await db.from("profile_local").delete().eq("user_id", userId));

  // 8) login_logs (auditoria de acesso) — apagados; não há razão para manter
  // IP/dispositivo de uma conta que não pode mais logar.
  conferir("apagar acessos", await db.from("login_logs").delete().eq("user_id", userId));

  // 9) notificações e demandas de busca — apagadas (não são histórico de
  // ninguém além da própria pessoa).
  conferir("apagar notificações", await db.from("notificacoes").delete().eq("user_id", userId));
  conferir("apagar demandas de busca", await db.from("demanda_servico").delete().eq("user_id", userId));

  // 10) vínculos de equipe e módulos — apagados; a praça e os colegas de
  // equipe continuam existindo, só a pessoa sai.
  conferir("apagar vínculos de equipe", await db.from("workspace_members").delete().eq("user_id", userId));
  conferir("apagar módulos", await db.from("user_modules").delete().eq("user_id", userId));

  // 11) serviços em que ela é CLIENTE — endereço/coordenada (o local do
  // serviço, dado dela) e descrição (texto livre que ela escreveu) limpos.
  // `descricao` é NOT NULL, então vira um texto neutro em vez de null.
  // Serviços em que ela é PRESTADORA não entram aqui: o endereço ali é do
  // CLIENTE, não dela — apagar destruiria o histórico da outra parte.
  conferir(
    "limpar endereço dos serviços",
    await db
      .from("servicos")
      .update({ endereco: null, lat: null, lng: null, descricao: DESCRICAO_SERVICO_REMOVIDA })
      .eq("cliente_id", userId),
  );

  // 12) mensagens que ela enviou — conteúdo trocado por texto neutro; a
  // conversa e as mensagens da outra parte continuam intactas.
  conferir(
    "limpar mensagens",
    await db.from("mensagens").update({ conteudo: CONTEUDO_MENSAGEM_REMOVIDO }).eq("remetente_id", userId),
  );

  // 13) comentários que ela escreveu em avaliações — limpos; a nota fica (é o
  // histórico de reputação de quem foi avaliado).
  conferir("limpar comentários de avaliação", await db.from("avaliacoes").update({ comentario: null }).eq("avaliador_id", userId));

  // 14) Auth — nunca apaga (cascata derrubaria o histórico da outra parte).
  // Muda e-mail (determinístico, então idempotente) e senha (aleatória) e
  // bane por tempo bem longo: a pessoa não entra mais com a conta antiga.
  conferir(
    "bloquear login",
    await db.auth.admin.updateUserById(userId, {
      email: emailRemovido(userId),
      password: senhaAleatoria(),
      ban_duration: BANIMENTO_PERMANENTE,
    }),
  );

  // 15) Por último, registra a conclusão no pedido pendente, se houver. Sem
  // pedido (ex.: chamada direta, como no gabarito), não afeta nenhuma linha.
  conferir(
    "concluir pedido",
    await db
      .from("pedidos_exclusao")
      .update({ status: "concluido", concluido_em: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("status", "pendente"),
  );
}
