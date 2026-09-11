"use client";

import { useState } from "react";
import { OlhoFechadoIcon, OlhoIcon } from "@/components/icons";

/**
 * Campo de senha com botão de mostrar/ocultar (olhinho), reutilizável.
 *
 * Antes cada tela (login, cadastro, nova senha) reescrevia — ou não tinha — o
 * mesmo `type={mostrar ? "text" : "password"}` com um SVG de olho ao lado;
 * agora vive num lugar só (pedido do Leonardo em 10/09/2026). `aria-pressed` +
 * o `aria-label` alternado ("Mostrar senha"/"Ocultar senha") avisam quem usa
 * leitor de tela do estado atual; o botão fica DENTRO do campo, à direita, com
 * alvo de 44×44px (obra, dedo sujo, sem precisão).
 *
 * Aceita tanto uso controlado (`value`/`onChange` — login, nova senha, que
 * precisam do valor ao vivo para dicas/validação) quanto não controlado
 * (`defaultValue` — cadastro, que só lê a senha no submit).
 */
export function CampoSenha({
  id,
  name,
  label,
  autoComplete = "new-password",
  required = true,
  minLength,
  value,
  onChange,
  defaultValue,
  ariaDescribedby,
  autoFocus,
}: {
  id: string;
  name: string;
  label: string;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  defaultValue?: string;
  ariaDescribedby?: string;
  autoFocus?: boolean;
}) {
  const [mostrar, setMostrar] = useState(false);
  const controlado = value !== undefined;

  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={mostrar ? "text" : "password"}
          autoComplete={autoComplete}
          className="input pr-12"
          required={required}
          minLength={minLength}
          aria-describedby={ariaDescribedby}
          autoFocus={autoFocus}
          {...(controlado ? { value, onChange } : { defaultValue })}
        />
        <button
          type="button"
          onClick={() => setMostrar((m) => !m)}
          aria-label={mostrar ? "Ocultar senha" : "Mostrar senha"}
          aria-pressed={mostrar}
          className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          {mostrar ? <OlhoFechadoIcon className="h-5 w-5" /> : <OlhoIcon className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}
