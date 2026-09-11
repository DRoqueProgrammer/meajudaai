"use client";

import { useActionState, useState } from "react";
import { salvarLocalizacaoAction } from "@/lib/actions/perfil";
import { AddressMapPicker, type AddressValue } from "@/components/maps/address-map-picker-dynamic";
import { CompartilharLocal } from "@/components/maps/compartilhar-local";
import { BotaoEnviar } from "@/components/botao-enviar";
import { FormError } from "@/components/ui";

/**
 * Seção "Endereço e localização" de `/perfil/editar` (só cliente e
 * prestador_servico — ver `EditarPerfilPage`): o mesmo `AddressMapPicker` do
 * cadastro, agora com valor inicial (o pino já salvo em `profile_local`), os
 * botões de compartilhar/abrir logo abaixo do mapa e um botão de salvar
 * próprio — formulário separado de `PerfilForm` porque a action
 * (`salvarLocalizacaoAction`) grava numa tabela diferente (`profile_local`,
 * não `profiles`), com sua própria mensagem de sucesso/erro.
 */
export function LocalizacaoForm({
  endereco,
  lat,
  lng,
}: {
  endereco: string | null;
  lat: number | null;
  lng: number | null;
}) {
  const [estado, formAction] = useActionState(salvarLocalizacaoAction, null);
  const [valor, setValor] = useState<AddressValue>({ endereco: endereco ?? "", lat, lng });

  return (
    <form action={formAction} className="card flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-muted">Endereço e localização</h2>
      <input type="hidden" name="endereco" value={valor.endereco} />
      <input type="hidden" name="lat" value={valor.lat ?? ""} />
      <input type="hidden" name="lng" value={valor.lng ?? ""} />

      <AddressMapPicker inicial={{ endereco: endereco ?? "", lat, lng }} onChange={setValor} />

      {valor.lat != null && valor.lng != null ? (
        <div className="border-t border-line pt-3">
          <CompartilharLocal modo="perfil" lat={valor.lat} lng={valor.lng} />
        </div>
      ) : null}

      {estado?.erro ? <FormError>{estado.erro}</FormError> : null}
      {estado?.ok ? (
        <p role="status" className="text-sm text-ok">
          {estado.mensagem}
        </p>
      ) : null}

      <BotaoEnviar className="btn-brand" enviando="Salvando…">
        Salvar localização
      </BotaoEnviar>
    </form>
  );
}
