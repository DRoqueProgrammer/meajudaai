export function formatBRL(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatData(iso: string | null): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function formatHora(hhmm: string | null): string {
  if (!hhmm) return "";
  return hhmm.slice(0, 5);
}

/**
 * Iniciais para o avatar: "Ana Silva" → "AS", primeiro e último nome.
 * Era `nome.trim().slice(0, 2)`, que devolvia "AN" — errado em todo nome
 * composto, ou seja, em quase todo mundo.
 */
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0]!.slice(0, 2).toUpperCase();
  return (partes[0]![0]! + partes[partes.length - 1]![0]!).toUpperCase();
}

export function soDigitos(v: string): string {
  return v.replace(/\D/g, "");
}

export function mascaraCPF(v: string): string {
  return soDigitos(v)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function mascaraTelefone(v: string): string {
  return soDigitos(v)
    .slice(0, 11)
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}
