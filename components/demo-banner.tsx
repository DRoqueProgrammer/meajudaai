import Link from "next/link";

export function DemoBanner({ nome }: { nome: string | null }) {
  return (
    // Não é sticky: disputava o topo com o PageHeader (z-30 contra z-10, ambos
    // em top-0) e o header da página ficava atrás. O aviso é de contexto, não
    // precisa acompanhar a rolagem — e a 375px ele custava altura que falta.
    <div className="border-b border-accent/50 bg-[#fff8e1]">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2 px-4">
        <p className="py-1.5 text-[12px] text-[#7a5d00]">
          <span aria-hidden="true">👁</span> <span className="font-medium">Modo demo</span> — você
          está como <span className="font-medium">{nome?.trim() || "visitante"}</span> vendo dados
          de exemplo. Nada que você clicar é salvo.
        </p>
        <Link
          href="/cadastro"
          className="inline-flex min-h-11 items-center text-[12px] font-medium text-brand underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Criar minha conta
        </Link>
      </div>
    </div>
  );
}
