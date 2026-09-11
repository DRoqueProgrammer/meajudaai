import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/roles";
import { createServerClient } from "@/lib/supabase/server";
import { TelaComHeader } from "@/components/ui";
import { PerfilForm } from "@/components/perfil-form";
import { LocalizacaoForm } from "@/components/localizacao-form";
import { DesativarContaBotao } from "@/components/desativar-conta-botao";
import { SeusDadosCard } from "@/components/seus-dados-card";

/**
 * Fica em /perfil/editar, antes de /perfil/[id] no roteamento do App Router
 * (segmento estático ganha do dinâmico), então não colide com o perfil público.
 */
/** Rota `/perfil/editar`: edição do próprio perfil (nome, bio, disponibilidade, cidade e foto). */
export default async function EditarPerfilPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const sb = await createServerClient();
  const { data: p } = await sb
    .from("profiles")
    .select("nome, bio, disponibilidade, cidade, estado, foto_url, tipo_base, categoria, preco_tipo, preco_valor")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!p) redirect("/inicio");

  const { data: pii } = await sb.from("profiles_pii").select("chave_pix").eq("user_id", user.id).maybeSingle();

  // Pedido de exclusão pendente (D-023), se houver — vira a data prevista e o
  // botão "Desistir" dentro de `SeusDadosCard`.
  const { data: pedido } = await sb
    .from("pedidos_exclusao")
    .select("pode_processar_em")
    .eq("user_id", user.id)
    .eq("status", "pendente")
    .maybeSingle();

  // O `CidadeSelect` guarda "Cidade|UF" num único campo escondido.
  const cidadeUf = `${p.cidade ?? ""}|${p.estado ?? ""}`;

  // Endereço + PIN exato (profile_local): cliente e prestador (busca por
  // proximidade) e o Administrador (o endereço da empresa dele — pedido do
  // Leonardo em 10/09). SysAdmin e funcionário não têm.
  const precisaLocalizacao = ["cliente", "prestador_servico", "admin"].includes(p.tipo_base);
  const { data: local } = precisaLocalizacao
    ? await sb.from("profile_local").select("endereco, lat, lng").eq("user_id", user.id).maybeSingle()
    : { data: null };

  return (
    <TelaComHeader titulo="Editar perfil" voltar={`/perfil/${user.id}`}>
      <PerfilForm
        nome={p.nome}
        bio={p.bio}
        disponibilidade={p.disponibilidade}
        cidadeUf={cidadeUf}
        fotoUrl={p.foto_url}
        ehPrestador={p.tipo_base === "prestador_servico"}
        categoria={p.categoria}
        precoTipo={p.preco_tipo}
        precoValor={p.preco_valor}
        chavePix={pii?.chave_pix}
      />
      {precisaLocalizacao ? (
        <div className="mt-4">
          <LocalizacaoForm endereco={local?.endereco ?? null} lat={local?.lat ?? null} lng={local?.lng ?? null} />
        </div>
      ) : null}
      <SeusDadosCard podeProcessarEm={pedido?.pode_processar_em ?? null} />
      {user.role !== "sysadmin" ? <DesativarContaBotao /> : null}
    </TelaComHeader>
  );
}
