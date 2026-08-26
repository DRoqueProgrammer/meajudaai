import Link from "next/link";
import { iniciais } from "@/lib/format";

/**
 * Nota em estrelas — ou o selo de quem ainda não tem nota.
 *
 * Sem avaliação, isto renderizava cinco estrelas cinzas e "0,0 (0)": todo
 * ajudante novo entrava na plataforma visualmente indistinguível de um ajudante
 * mal avaliado. Zero avaliações não é nota zero, e o card de candidato é onde
 * essa diferença decide quem trabalha.
 *
 * O amarelo #FFC107 da identidade dá 1,63:1 sobre branco — reprova em AA e até
 * no 1.4.11 (contraste de objeto gráfico). A estrela cheia, que aqui CARREGA a
 * nota, usa o amarelo escuro `accent-strong` (#B8860B, ~3,4:1); o `#FFC107` fica
 * só para enfeite. O valor numérico ao lado (5,98:1) reforça a mesma informação.
 */
export function StarRating({ nota, total }: { nota: number; total?: number }) {
  if (typeof total === "number" && total === 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-tint-info px-2 py-0.5 text-xs font-medium text-brand">
        Novo no app
      </span>
    );
  }
  const full = Math.round(nota);
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <span aria-hidden="true" className="text-accent-strong">
        {"★".repeat(full)}
        <span className="text-line-strong">{"★".repeat(Math.max(0, 5 - full))}</span>
      </span>
      <span className="text-muted">
        <span className="sr-only">Nota </span>
        {nota.toFixed(1).replace(".", ",")}
        <span className="sr-only"> de 5</span>
        {typeof total === "number" ? ` (${total})` : ""}
      </span>
    </span>
  );
}

const STATUS_STYLE: Record<string, string> = {
  aberta: "bg-tint-ok text-ok",
  aguardando: "bg-tint-warn text-tint-warn-ink",
  em_andamento: "bg-tint-info text-brand",
  aceito: "bg-tint-ok text-ok",
  finalizada: "bg-tint-neutral text-muted",
  concluida: "bg-tint-neutral text-muted",
  recusado: "bg-tint-danger text-danger",
  cancelada: "bg-tint-danger text-danger",
  cancelado: "bg-tint-danger text-danger",
};

/**
 * Rótulos escritos, não derivados do slug. Antes era `status.replace("_"," ")`
 * com `capitalize`: o nome da coluna do banco virava texto de interface, e
 * "aguardando" não dizia aguardando o quê.
 */
const STATUS_LABEL: Record<string, string> = {
  aberta: "Aberta para candidatos",
  aguardando: "Aguardando resposta",
  em_andamento: "Ajudante confirmado",
  aceito: "Você foi aceito",
  finalizada: "Diária concluída",
  concluida: "Concluída",
  recusado: "Não foi dessa vez",
  cancelada: "Vaga cancelada",
  cancelado: "Candidatura retirada",
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const cls = STATUS_STYLE[status] ?? "bg-tint-neutral text-muted";
  // `label` sobrescreve quando o rótulo padrão (POV do ajudante, ex.: "Você foi
  // aceito") não cabe no contexto — na lista de candidatos o profissional vê
  // "Confirmado", não "Você foi aceito".
  const texto = label ?? STATUS_LABEL[status] ?? status.replace(/_/g, " ");
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {texto}
    </span>
  );
}

/**
 * Foto quando existe, iniciais quando não.
 *
 * `foto_url` já está no schema (migration 0001) e nunca era lido — não há tela
 * de upload ainda, então na prática cai sempre nas iniciais. Fica pronto para
 * quando o upload existir, em vez de ser outro lugar para lembrar de mudar.
 */
export function Avatar({
  nome,
  fotoUrl,
  tamanho = "md",
}: {
  nome: string;
  fotoUrl?: string | null;
  tamanho?: "md" | "lg";
}) {
  const cls = tamanho === "lg" ? "h-16 w-16 text-lg" : "h-11 w-11 text-sm";
  if (fotoUrl) {
    const px = tamanho === "lg" ? 64 : 44;
    return (
      // `<img>` e não `next/image`: as fotos já são WebP 256px de ~10 KB, então a
      // otimização do Next só somaria uma volta pelo servidor. `width`/`height`
      // explícitos evitam reflow na lista; `lazy` porque numa lista de
      // candidatos só os primeiros aparecem na tela.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={fotoUrl}
        alt={`Foto de ${nome}`}
        width={px}
        height={px}
        loading="lazy"
        decoding="async"
        className={`shrink-0 rounded-full bg-surface object-cover ${cls}`}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-fill to-action font-semibold text-white ${cls}`}
    >
      {iniciais(nome)}
    </span>
  );
}

export function Verificado() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-tint-ok px-2 py-0.5 text-xs font-medium text-ok">
      {/* O ✔ era lido em voz alta ("marca de seleção") antes do rótulo. */}
      <span aria-hidden="true">✔</span> Perfil verificado
    </span>
  );
}

/**
 * Erro de formulário. `role="alert"` faz o leitor de tela anunciar assim que o
 * texto aparece — antes eram 12 `<p>` inseridos em silêncio, e o usuário
 * submetia de novo sem saber que tinha falhado.
 */
export function FormError({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  if (!children) return null;
  return (
    <p role="alert" className={`text-sm text-danger ${className}`}>
      {children}
    </p>
  );
}

export function PageHeader({ titulo, voltar }: { titulo: string; voltar?: string }) {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-card/90 px-4 py-3 backdrop-blur">
      {voltar ? (
        <Link
          href={voltar}
          className="-ml-2 grid h-11 w-11 shrink-0 place-items-center rounded-xl text-lg text-brand hover:bg-surface hover:text-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          aria-label="Voltar"
        >
          ←
        </Link>
      ) : null}
      <h1 className="text-base font-semibold text-ink">{titulo}</h1>
    </header>
  );
}

/**
 * Tela de detalhe com header colado no topo.
 *
 * O `-mx-4 -mt-4` fura o padding do layout pai para o header ficar de ponta a
 * ponta. Estava copiado em 6 páginas, cada uma reaplicando o padding interno
 * com um valor diferente — o acoplamento com o layout agora vive num lugar só.
 */
export function TelaComHeader({
  titulo,
  voltar,
  children,
}: {
  titulo: string;
  voltar?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="-mx-4 -mt-4">
      <PageHeader titulo={titulo} voltar={voltar} />
      <div className="px-4 py-4">{children}</div>
    </div>
  );
}
