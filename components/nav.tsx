"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logoutAction } from "@/lib/actions/auth";
import { Logo } from "@/components/logo";
import type { AppRole } from "@/lib/auth/roles";
import { PANEL_MODULES } from "@/lib/modules";
import { ContaSheet } from "@/components/conta-sheet";
import { LinkPendente } from "@/components/link-pendente";
import { useLinkStatus } from "next/link";

interface Item {
  href: string;
  label: string;
  icon: string;
}

const NAV_ICONS: Record<string, ReactNode> = {
  home: (
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.2V21h14V9.2" />
    </>
  ),
  clipboard: (
    <>
      <rect x="6" y="4.5" width="12" height="16.5" rx="2" />
      <path d="M9 4.5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 4.5v1.5H9z" />
      <path d="M9 11h6M9 15h4" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20c0-3 2.5-4.6 5.5-4.6s5.5 1.6 5.5 4.6" />
      <path d="M16 5.3a3 3 0 0 1 0 5.7M20.5 20c0-2.4-1.4-3.9-3.5-4.4" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.4-3.4" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="16" rx="2" />
      <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" />
    </>
  ),
  bell: (
    <>
      <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </>
  ),
  chat: (
    <>
      <path d="M4 5.5h16v11H9l-5 4v-4z" />
      <path d="M8 9.5h8M8 13h5" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20c0-3.6 3.4-5.5 7.5-5.5s7.5 1.9 7.5 5.5" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  coin: (
    <>
      <ellipse cx="12" cy="6.5" rx="7" ry="3" />
      <path d="M5 6.5v11c0 1.7 3.1 3 7 3s7-1.3 7-3v-11" />
      <path d="M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3" />
    </>
  ),
  chart: (
    <>
      <path d="M4 4v16h16" />
      <path d="M8 15v-3M12 15V8M16 15v-5" />
    </>
  ),
  pulse: (
    <>
      <path d="M3 12h4l2.5-6 4 12 2.5-6H21" />
    </>
  ),
  map: (
    <>
      <path d="M9 4 3.5 6.5v13L9 17l6 2.5 5.5-2.5v-13L15 6.5 9 4z" />
      <path d="M9 4v13M15 6.5v13" />
    </>
  ),
};

function NavIcon({ name, className }: { name: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {NAV_ICONS[name] ?? NAV_ICONS.home}
    </svg>
  );
}

/** Máximo de itens no rodapé mobile. A 360px, 7 itens davam ~51px cada e
 *  "Minhas Vagas" quebrava a linha. Cinco é o teto de escolhas simultâneas. */
const MAX_RODAPE = 5;

/**
 * Contador de não-lidas.
 *
 * `aria-label` com a palavra escrita porque um "3" solto ao lado de "Mensagens"
 * não diz nada num leitor de tela. Acima de 9 vira "9+" para não empurrar o
 * rótulo — o número exato não muda a decisão, a existência dele muda.
 */
function Badge({ n, rotulo }: { n: number; rotulo: string }) {
  if (n <= 0) return null;
  return (
    <span
      aria-label={`${n} ${n === 1 ? "novo" : "novos"} em ${rotulo}`}
      className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-danger-fill px-1 text-[10px] font-bold leading-none text-white"
    >
      {n > 9 ? "9+" : n}
    </span>
  );
}

/** Troca o ícone pelo indicador enquanto a rota carrega, no mesmo espaço. */
function PendenteOuIcone({ icon }: { icon: string }) {
  const { pending } = useLinkStatus();
  if (pending) {
    return (
      <span className="grid h-[22px] w-[22px] place-items-center">
        <LinkPendente />
      </span>
    );
  }
  return <NavIcon name={icon} className="h-[22px] w-[22px]" />;
}

/** Navegação principal: sidebar no desktop e barra inferior no mobile, com itens filtrados por papel e módulos liberados. */
export function Nav({
  role,
  userId,
  nome,
  modules,
  naoLidas = {},
}: {
  role: AppRole;
  userId: string;
  nome: string | null;
  modules?: string[];
  /** Contagem de não-lidas por href, ex.: { "/mensagens": 3 }. */
  naoLidas?: Record<string, number>;
}) {
  const path = usePathname();
  const router = useRouter();

  // Admin vê todos os módulos; funcionário só os liberados; sysadmin/ajudante têm nav próprio.
  const allowedSet = new Set(modules ?? []);
  const empresaItems: Item[] = PANEL_MODULES.filter(
    (m) => role === "admin" || allowedSet.has(m.key),
  ).map((m) => ({ href: m.href, label: m.label, icon: m.icon }));

  const meio: Item[] =
    role === "sysadmin"
      ? [
          { href: "/admin/usuarios", label: "Usuários", icon: "users" },
          { href: "/admin/denuncias", label: "Denúncias", icon: "shield" },
          { href: "/admin/demanda", label: "Demanda", icon: "chart" },
          { href: "/admin/metricas", label: "Métricas", icon: "pulse" },
        ]
      : role === "admin" || role === "funcionario"
        ? empresaItems
        : [
            { href: "/vagas", label: "Buscar", icon: "search" },
            { href: "/mapa", label: "Mapa", icon: "map" },
            { href: "/agenda", label: "Agenda", icon: "calendar" },
          ];

  // Sysadmin modera; não participa de diária, então não tem caixa de mensagens.
  const mensagens: Item[] =
    role === "sysadmin" ? [] : [{ href: "/mensagens", label: "Mensagens", icon: "chat" }];

  const items: Item[] = [
    { href: "/inicio", label: "Início", icon: "home" },
    ...meio,
    ...mensagens,
    { href: "/notificacoes", label: "Alertas", icon: "bell" },
  ];

  // O rodapé corta os módulos que sobram (eles continuam na sidebar e no
  // painel de /inicio); Início, Mensagens e Alertas nunca caem.
  const fixos = 1 + mensagens.length + 1;
  const rodape: Item[] = [
    { href: "/inicio", label: "Início", icon: "home" },
    ...meio.slice(0, Math.max(0, MAX_RODAPE - 1 - fixos)),
    ...mensagens,
    { href: "/notificacoes", label: "Alertas", icon: "bell" },
  ];

  const active = (href: string) => path === href || path.startsWith(href + "/");

  async function sair() {
    await logoutAction();
    router.push("/login");
  }

  return (
    <>
      <aside className="hidden w-60 shrink-0 flex-col gap-1 border-r border-line bg-card p-4 md:flex">
        <div className="mb-4 px-2">
          <Logo />
        </div>
        {[...items, { href: `/perfil/${userId}`, label: "Perfil", icon: "user" }].map((it) => (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active(it.href) ? "page" : undefined}
            className={`flex min-h-11 items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
              active(it.href) ? "bg-brand-fill text-white" : "text-muted hover:bg-surface"
            }`}
          >
            <NavIcon name={it.icon} className="h-5 w-5 shrink-0" />
            {it.label}
            <span className="ml-auto">
              <Badge n={naoLidas[it.href] ?? 0} rotulo={it.label} />
            </span>
          </Link>
        ))}
        <button
          onClick={sair}
          className="mt-auto flex min-h-11 items-center rounded-xl px-3 text-left text-sm text-danger hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Sair
        </button>
      </aside>

      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-20 flex items-stretch justify-around border-t border-line bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {rodape.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active(it.href) ? "page" : undefined}
            className={`flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] leading-tight focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand ${
              active(it.href) ? "text-brand" : "text-muted"
            }`}
          >
            {/* O ícone some enquanto navega: mesmo espaço, sem pulo de layout. */}
            <span className="relative">
              <PendenteOuIcone icon={it.icon} />
              <span className="absolute -right-2 -top-1">
                <Badge n={naoLidas[it.href] ?? 0} rotulo={it.label} />
              </span>
            </span>
            <span className="text-center">{it.label}</span>
          </Link>
        ))}
        <ContaSheet
          perfilHref={`/perfil/${userId}`}
          nome={nome}
          mostrarDiarias={role !== "sysadmin"}
          className={`flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] leading-tight focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand ${
            path.startsWith("/perfil") ? "text-brand" : "text-muted"
          }`}
        >
          <NavIcon name="user" className="h-[22px] w-[22px]" />
          <span className="text-center">Conta</span>
        </ContaSheet>
      </nav>
    </>
  );
}
