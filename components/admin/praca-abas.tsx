import Link from "next/link";

/** As abas administrativas da praça, na ordem do menu (pedido do Leonardo em 11/09/2026). */
export const ABAS_DA_PRACA = [
  { href: "/inicio", label: "Painel" },
  { href: "/praca/servicos", label: "Serviços" },
  { href: "/praca/clientes", label: "Clientes" },
  { href: "/praca/prestadores", label: "Prestadores" },
  { href: "/praca/financeiro", label: "Financeiro" },
] as const;

export type AbaDaPraca = (typeof ABAS_DA_PRACA)[number]["href"];

/**
 * Faixa de abas no topo das telas da praça (Painel, Serviços, Clientes,
 * Prestadores, Financeiro) — no celular o rodapé só cabe uma delas, então a
 * faixa é o caminho entre as abas. Rola na horizontal sem quebrar a página.
 * Cabeçalho com o nome e a cidade da praça, que é o recorte de tudo abaixo.
 */
export function PracaAbas({
  atual,
  pracaNome,
  cidade,
  estado,
}: {
  atual: AbaDaPraca;
  pracaNome: string;
  cidade: string | null;
  estado: string | null;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Praça</p>
        <p className="text-lg font-semibold leading-tight">
          {pracaNome}
          {cidade ? (
            <span className="ml-2 text-sm font-normal text-muted">
              {cidade}
              {estado ? ` / ${estado}` : ""}
            </span>
          ) : null}
        </p>
      </div>
      <nav aria-label="Abas da praça" className="-mx-1 overflow-x-auto px-1 pb-1">
        <ul className="flex min-w-max gap-2">
          {ABAS_DA_PRACA.map((a) => {
            const ativa = a.href === atual;
            return (
              <li key={a.href}>
                <Link href={a.href} className={`chip ${ativa ? "chip-on" : "chip-off"}`} aria-current={ativa ? "page" : undefined}>
                  {a.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

/** Estado vazio comum das abas: Administrador ainda sem praça vinculada. */
export function SemPraca() {
  return (
    <p className="card-vazio">
      Você ainda não está vinculado a uma praça. Peça ao SysAdmin para incluir você na praça da sua cidade.
    </p>
  );
}
