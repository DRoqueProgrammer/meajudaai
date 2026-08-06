import Link from "next/link";
import { PERIODOS } from "@/lib/periodo";

/** Chips de filtro por período (?periodo=). Default = "tudo". */
export function PeriodoTabs({ base, current }: { base: string; current: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {PERIODOS.map((t) => {
        const active = current === t.value || (!current && t.value === "tudo");
        const href = t.value === "tudo" ? base : `${base}?periodo=${t.value}`;
        return (
          <Link
            key={t.value}
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
