/**
 * Estado devolvido por uma Server Action ligada direto num `<form action={...}>`.
 *
 * O formato existe para o formulário funcionar SEM JavaScript: o navegador faz
 * o POST nativo, a action roda no servidor e o resultado volta como estado —
 * sem `onSubmit`, sem `useState`, sem depender de hidratação.
 *
 * `valores` devolve o que a pessoa digitou para repopular os campos quando dá
 * erro. Sem isso, no caminho sem JS o formulário volta vazio e ela redigita
 * tudo. Campo de senha NUNCA entra aqui.
 */
export type EstadoForm = {
  erro?: string;
  ok?: boolean;
  valores?: Record<string, string>;
} | null;

/** Lê um campo de texto do FormData já aparado. */
export function campo(fd: FormData, nome: string): string {
  const v = fd.get(nome);
  return typeof v === "string" ? v.trim() : "";
}

/** Reaproveita os valores digitados, menos os sensíveis. */
export function valoresPreservados(fd: FormData, exceto: string[] = []): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v === "string" && !exceto.includes(k)) out[k] = v;
  }
  return out;
}
