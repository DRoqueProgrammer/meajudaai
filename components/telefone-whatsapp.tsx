import { WhatsAppIcon } from "@/components/icons";
import { formatTelefone } from "@/lib/format";
import { waLink } from "@/lib/whatsapp";

/** Telefone formatado (+55 DDD 00000-0000) com ícone do WhatsApp ao lado, se for WhatsApp — abre o WhatsApp Web numa aba nova. */
export function TelefoneWhatsApp({ telefone, isWhatsapp }: { telefone: string; isWhatsapp: boolean }) {
  if (!isWhatsapp) {
    return <p className="text-sm text-muted">{formatTelefone(telefone)}</p>;
  }
  return (
    <a href={waLink(telefone)} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm text-muted hover:text-ink">
      {formatTelefone(telefone)}
      <WhatsAppIcon />
    </a>
  );
}
