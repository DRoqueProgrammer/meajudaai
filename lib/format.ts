/** Formata um número como moeda brasileira (ex.: `1234.5` → `R$ 1.234,50`). */
export function formatBRL(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Converte data ISO `YYYY-MM-DD` em `DD/MM/YYYY`. Null/formato inesperado passam direto (sem shift de fuso). */
export function formatData(iso: string | null): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

/** Recorta `HH:MM` de um horário `HH:MM[:SS]` do banco. */
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

/** Remove tudo que não for dígito. Base das máscaras e da normalização de telefone. */
export function soDigitos(v: string): string {
  return v.replace(/\D/g, "");
}

/** Máscara progressiva de CPF (`000.000.000-00`) aplicada enquanto o usuário digita. */
export function mascaraCPF(v: string): string {
  return soDigitos(v)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

/** Máscara progressiva de telefone BR (`(00) 00000-0000`), até 11 dígitos. */
export function mascaraTelefone(v: string): string {
  return soDigitos(v)
    .slice(0, 11)
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}
