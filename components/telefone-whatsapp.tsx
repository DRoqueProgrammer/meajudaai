import { formatTelefone } from "@/lib/format";
import { waLink } from "@/lib/whatsapp";

function IconeWhatsApp() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#25D366" />
      <path
        fill="#fff"
        d="M12 5.5a6.4 6.4 0 0 0-5.47 9.73L5.5 18.5l3.38-.99A6.4 6.4 0 1 0 12 5.5Zm0 1.2a5.2 5.2 0 1 1-2.68 9.65l-.19-.11-2 .58.6-1.94-.13-.2A5.2 5.2 0 0 1 12 6.7Zm-2.4 2.6c-.13 0-.34.05-.52.25-.18.2-.68.66-.68 1.6s.7 1.86.8 1.99c.1.13 1.37 2.2 3.42 2.99 1.7.65 1.7.43 2 .4.3-.03.98-.4 1.12-.79.14-.38.14-.71.1-.78-.04-.07-.14-.11-.3-.19-.16-.08-.98-.48-1.13-.54-.15-.05-.26-.08-.37.08-.11.16-.42.53-.52.64-.1.11-.19.12-.35.04-.16-.08-.68-.25-1.3-.8-.48-.43-.8-.95-.9-1.11-.09-.16-.01-.25.07-.33.07-.07.16-.19.24-.28.08-.1.1-.16.16-.27.05-.11.03-.2-.01-.28-.04-.08-.37-.9-.51-1.23-.13-.32-.27-.28-.37-.28h-.32Z"
      />
    </svg>
  );
}

/** Telefone formatado (+55 DDD 00000-0000) com ícone do WhatsApp ao lado, se for WhatsApp — abre o WhatsApp Web numa aba nova. */
export function TelefoneWhatsApp({ telefone, isWhatsapp }: { telefone: string; isWhatsapp: boolean }) {
  if (!isWhatsapp) {
    return <p className="text-sm text-muted">{formatTelefone(telefone)}</p>;
  }
  return (
    <a href={waLink(telefone)} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm text-muted hover:text-ink">
      {formatTelefone(telefone)}
      <IconeWhatsApp />
    </a>
  );
}
