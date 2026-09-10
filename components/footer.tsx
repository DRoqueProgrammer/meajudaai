import Link from "next/link";
import { LinkedInIcon, WhatsAppIcon } from "@/components/icons";
import { mailtoSuporte } from "@/lib/contato";
import pkg from "@/package.json";

/**
 * Versão do app — fonte única no `package.json`. Bumpe lá e o rodapé, o README
 * e qualquer outro consumidor acompanham; não existe segundo lugar pra
 * esquecer de atualizar. Mesmo padrão do `refs/caixa-forte-app`.
 */
export const APP_VERSION = pkg.version;

/**
 * Quem fez. `linkedin: null` = ainda não temos a URL da pessoa — o nome sai sem
 * link, em vez de apontar pro perfil errado de alguém com nome parecido.
 */
const AUTORES: { nome: string; linkedin: string | null; whatsapp?: string }[] = [
  {
    nome: "Leonardo Chalhoub",
    linkedin: "https://www.linkedin.com/in/leonardochalhoub",
    whatsapp: "https://wa.me/5521967058428",
  },
  { nome: "Matheus Monte", linkedin: "https://www.linkedin.com/in/matheus-monte-7206941b6/" },
  { nome: "Davi Roque Luiz", linkedin: "https://www.linkedin.com/in/davi-r-62908b224/" },
];

/**
 * Rodapé único do site — landing, telas de login, páginas legais e o app
 * autenticado. Crédito de quem construiu (com LinkedIn e WhatsApp quando
 * temos o link), os links legais e a versão em exibição. Antes só a landing
 * tinha rodapé, e ele não dizia nem quem fez nem qual versão estava no ar.
 */
export function Footer() {
  return (
    <footer className="border-t border-line bg-card">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-3 px-6 py-5 text-[12.5px] text-muted sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="shrink-0">Feito por</span>
          {AUTORES.map((autor, i) => (
            <span key={autor.nome} className="flex items-center gap-1.5">
              {i > 0 ? <span aria-hidden className="mr-1 text-line">·</span> : null}
              {autor.linkedin ? (
                <a
                  href={autor.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 font-medium text-ink hover:text-brand"
                >
                  {autor.nome}
                  <LinkedInIcon className="h-3.5 w-3.5 shrink-0" />
                </a>
              ) : (
                <span className="font-medium text-ink">{autor.nome}</span>
              )}
              {autor.whatsapp ? (
                <a
                  href={autor.whatsapp}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Falar com ${autor.nome} no WhatsApp`}
                  className="hover:opacity-80"
                >
                  <WhatsAppIcon className="h-3.5 w-3.5 shrink-0" />
                </a>
              ) : null}
            </span>
          ))}
        </div>

        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link href="/termos" className="hover:text-brand">
            Termos
          </Link>
          <Link href="/privacidade" className="hover:text-brand">
            Privacidade
          </Link>
          <a href={mailtoSuporte()} className="hover:text-brand">
            Suporte
          </a>
          <span aria-hidden className="text-line">
            ·
          </span>
          <span className="tabular-nums" title="Versão do Me Ajuda Aí em exibição">
            v{APP_VERSION}
          </span>
          <span>© 2026</span>
        </nav>
      </div>
    </footer>
  );
}
