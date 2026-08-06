"use client";

import { useFormStatus } from "react-dom";

/**
 * Botão de envio de um `<form action={serverAction}>`.
 *
 * `useFormStatus` lê o estado do formulário pai — por isso precisa ser um
 * componente separado, não pode estar no mesmo componente que renderiza o
 * `<form>`. Sem JavaScript o botão continua sendo um submit comum: o estado
 * "enviando" é enfeite, não requisito.
 */
export function BotaoEnviar({
  children,
  enviando,
  className = "btn-brand",
  desabilitado = false,
  onClick,
}: {
  children: React.ReactNode;
  /** Rótulo enquanto envia. Sem ele, o rótulo normal permanece. */
  enviando?: string;
  className?: string;
  desabilitado?: boolean;
  /**
   * Interceptar o clique é o jeito confiável de barrar o envio antes dele
   * acontecer: `preventDefault` no clique cancela o submit sem correr atrás
   * da action do React. Sem JavaScript o clique é submit normal e o onClick
   * nem roda — o caminho sem JS continua intacto.
   */
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending || desabilitado} onClick={onClick}>
      {pending && enviando ? enviando : children}
    </button>
  );
}
