import { PerfilPopover, type PerfilResumo } from "@/components/perfil-popover";
import { TelefoneWhatsApp } from "@/components/telefone-whatsapp";
import { PontosMap, type MapaPonto } from "@/components/maps/pontos-map-dynamic";
import { FlagsPessoa, type FlagPessoa } from "@/components/flags-pessoa";
import { waShareLink } from "@/lib/whatsapp";

/**
 * Dados do cliente na página de detalhe de um serviço — nome (popover de
 * perfil), red flags aprovadas (`flags_da_pessoa`, migration 0055),
 * telefone/WhatsApp, e o endereço/PIN EXATO daquele serviço
 * específico (`servicos.endereco/lat/lng`, migration 0037 — não o endereço
 * do perfil, porque o mesmo cliente pode pedir serviço em lugares
 * diferentes). Telefone vem de profiles_pii, liberado só porque há um
 * serviço em comum (`tem_servico_com`, migration 0027) — nunca pra um
 * estranho.
 */
export function ClienteDoServico({
  perfil,
  telefone,
  isWhatsapp,
  endereco,
  local,
  flags = [],
}: {
  perfil: PerfilResumo;
  telefone: string | null;
  isWhatsapp: boolean;
  endereco: string | null;
  local: { lat: number; lng: number } | null;
  /** Bandeiras aprovadas do cliente, já na ordem decrescente (vem de `sb.rpc("flags_da_pessoa", ...)`). */
  flags?: FlagPessoa[];
}) {
  const pontos: MapaPonto[] = local ? [{ id: perfil.userId, lat: local.lat, lng: local.lng, titulo: perfil.nome }] : [];
  const linkMaps = local ? `https://www.google.com/maps?q=${local.lat},${local.lng}` : null;
  const textoCompartilhar = `Local do serviço — ${perfil.nome}: ${endereco ?? ""}${linkMaps ? ` ${linkMaps}` : ""}`.trim();

  return (
    <div className="card flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Cliente</p>
      <div className="flex items-center gap-1.5">
        <PerfilPopover perfil={perfil} flags={flags} className="text-base font-semibold hover:text-brand hover:underline" />
        <FlagsPessoa flags={flags} />
      </div>
      {telefone ? <TelefoneWhatsApp telefone={telefone} isWhatsapp={isWhatsapp} /> : null}
      {endereco ? (
        <p className="text-sm text-muted">{endereco}</p>
      ) : local ? (
        <p className="text-sm text-muted">Endereço escrito não informado — use o ponto no mapa.</p>
      ) : null}

      {local ? (
        <>
          <PontosMap pontos={pontos} />
          <div className="flex gap-2">
            <a href={linkMaps!} target="_blank" rel="noreferrer" className="btn-ghost flex-1 text-center text-xs">
              Abrir no Google Maps
            </a>
            <a href={waShareLink(textoCompartilhar)} target="_blank" rel="noreferrer" className="btn-ghost flex-1 text-center text-xs">
              Compartilhar no WhatsApp
            </a>
          </div>
        </>
      ) : (
        <p className="text-xs text-muted">Sem localização exata cadastrada.</p>
      )}
    </div>
  );
}
