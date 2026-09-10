import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { listarUsuarios } from "@/lib/admin/consultas";
import { criarPracaAction, vincularAdministradorAction } from "@/lib/actions/pracas";
import { CriarPracaForm, VincularAdministradorForm, type Praca } from "@/components/admin/pracas-forms";

/**
 * Rota `/admin/pracas` (só SysAdmin): cria praças novas e vincula
 * Administradores a uma ou mais delas, com uma padrão (R-46, R-47; ADR 0013;
 * decisão D-016). Usa `criarPracaAction` e `vincularAdministradorAction`
 * (lib/actions/pracas.ts) — os formulários de cliente moram em
 * components/admin/pracas-forms.tsx.
 *
 * Mundo de exemplo (R-42, D-015): um SysAdmin de exemplo só vê praças e
 * Administradores do mundo de exemplo — mesmo recorte de `/admin/usuarios`
 * (listarUsuarios), mais o filtro de praça (dono ou algum membro de exemplo)
 * que `vincularAdministradorAction` também aplica na escrita.
 */
export default async function AdminPracasPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "sysadmin") redirect("/inicio");

  const db = createAdminClient();

  const [{ data: pracasRaw }, { data: vinculos }] = await Promise.all([
    db.from("workspaces").select("id, nome, cidade, estado, owner_id").order("nome"),
    db.from("workspace_members").select("workspace_id, user_id, padrao"),
  ]);

  const administradores = (await listarUsuarios(db, { exemplo: user.exemplo })).filter(
    (u) => u.tipo_base === "admin",
  );

  let pracas: Praca[] = (pracasRaw ?? []).map((p) => ({
    id: p.id,
    nome: p.nome,
    cidade: p.cidade,
    estado: p.estado,
  }));

  if (user.exemplo) {
    // Mesmo critério de vincularAdministradorAction: praça do mundo de
    // exemplo é a que tem dono de exemplo, ou algum membro de exemplo.
    const { data: pessoasExemplo } = await db.from("profiles").select("user_id").eq("exemplo", true);
    const idsExemplo = new Set((pessoasExemplo ?? []).map((p) => p.user_id));
    const pracasComMembroExemplo = new Set(
      (vinculos ?? []).filter((v) => idsExemplo.has(v.user_id)).map((v) => v.workspace_id),
    );
    const donoPorPraca = new Map((pracasRaw ?? []).map((p) => [p.id, p.owner_id]));
    pracas = pracas.filter(
      (p) => idsExemplo.has(donoPorPraca.get(p.id) ?? "") || pracasComMembroExemplo.has(p.id),
    );
  }

  const idsPracasVisiveis = new Set(pracas.map((p) => p.id));
  const administradoresComVinculos = administradores.map((a) => {
    const meus = (vinculos ?? []).filter((v) => v.user_id === a.user_id && idsPracasVisiveis.has(v.workspace_id));
    return {
      userId: a.user_id,
      nome: a.nome || "—",
      pracaIds: meus.map((m) => m.workspace_id),
      padraoId: meus.find((m) => m.padrao)?.workspace_id ?? null,
    };
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Praças</h1>
        <p className="text-sm text-muted">
          Crie praças novas e vincule cada Administrador a uma ou mais, com uma praça padrão — a
          que ele entra sem escolher.
        </p>
      </div>

      <CriarPracaForm action={criarPracaAction} />

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Vincular Administrador</h2>
        {administradoresComVinculos.length === 0 ? (
          <p className="card-vazio">Nenhum Administrador ainda.</p>
        ) : (
          administradoresComVinculos.map((a) => (
            <VincularAdministradorForm
              key={a.userId}
              vincular={vincularAdministradorAction}
              administrador={a}
              pracas={pracas}
            />
          ))
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Praças existentes</h2>
        {pracas.length === 0 ? (
          <p className="card-vazio">Nenhuma praça ainda.</p>
        ) : (
          pracas.map((p) => (
            <div key={p.id} className="card flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{p.nome}</p>
                <p className="text-xs text-muted">
                  {[p.cidade, p.estado].filter(Boolean).join(" / ") || "—"}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
