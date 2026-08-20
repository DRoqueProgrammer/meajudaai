import Link from "next/link";

/** Abas de filtro por status (via querystring), reutilizadas em Minhas Vagas e Minhas Diárias. */
export function StatusTabs({
  base,
  current,
  tabs,
}: {
  base: string;
  current: string;
  tabs: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((t) => {
        const active = current === t.value;
        const href = t.value ? `${base}?status=${t.value}` : base;
        return (
          <Link
            key={t.value || "todas"}
            href={href}
            className={`chip ${active ? "chip-on" : "chip-off"}`}
            aria-current={active ? "page" : undefined}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
