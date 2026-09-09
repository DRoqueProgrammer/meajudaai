"use client";

import { useActionState } from "react";
import Link from "next/link";
import { salvarPerfilAction } from "@/lib/actions/perfil";
import { CidadeSelect } from "@/components/cidade-select";
import { CATEGORIAS } from "@/lib/categorias";
import { Avatar, FormError } from "@/components/ui";
import { BotaoEnviar } from "@/components/botao-enviar";

/**
 * Editar o próprio perfil. Server Action no `action=`, como o resto dos
 * formulários — funciona sem JavaScript, inclusive o upload da foto
 * (`encType="multipart/form-data"` é o que o React emite nesse caso).
 */
export function PerfilForm({
  nome,
  bio,
  disponibilidade,
  cidadeUf,
  fotoUrl,
  ehPrestador,
  categoria,
  precoTipo,
  precoValor,
}: {
  nome: string;
  bio: string | null;
  disponibilidade: string | null;
  cidadeUf: string;
  fotoUrl: string | null;
  ehPrestador: boolean;
  categoria?: string | null;
  precoTipo?: string | null;
  precoValor?: number | null;
}) {
  const [estado, formAction] = useActionState(salvarPerfilAction, null);
  const v = estado?.valores ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="card flex items-center gap-4">
        <Avatar nome={nome} fotoUrl={fotoUrl} tamanho="lg" />
        <div className="min-w-0 flex-1">
          <label className="label" htmlFor="foto">
            Sua foto
          </label>
          <input
            id="foto"
            name="foto"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="input py-2 text-xs"
          />
          <p className="mt-1 text-xs leading-relaxed text-muted">
            JPG, PNG ou WEBP, até 2 MB. Quem contrata olha a foto antes de aceitar — um rosto vale
            mais que qualquer texto aqui.
          </p>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="nome">
          Nome
        </label>
        <input
          id="nome"
          name="nome"
          className="input"
          autoComplete="name"
          defaultValue={v.nome ?? nome}
          required
        />
      </div>

      <div>
        <label className="label" htmlFor="bio">
          Sobre você
        </label>
        <textarea
          id="bio"
          name="bio"
          className="input"
          rows={4}
          maxLength={600}
          defaultValue={v.bio ?? bio ?? ""}
          placeholder={
            ehPrestador
              ? "Ex.: 8 anos de obra, forte em alvenaria e acabamento. Tenho ferramenta própria."
              : "Ex.: Elétrica residencial em Niterói. Pago no fim da diária, em dinheiro ou Pix."
          }
        />
      </div>

      <div>
        <label className="label" htmlFor="disponibilidade">
          Disponibilidade
        </label>
        <input
          id="disponibilidade"
          name="disponibilidade"
          className="input"
          maxLength={120}
          defaultValue={v.disponibilidade ?? disponibilidade ?? ""}
          placeholder="Ex.: Dias de semana, a partir das 7h"
        />
      </div>

      {ehPrestador ? (
        <>
          <div>
            <label className="label" htmlFor="categoria">
              Categoria do serviço
            </label>
            <select id="categoria" name="categoria" className="input" defaultValue={v.categoria ?? categoria ?? ""}>
              <option value="">— selecione —</option>
              {CATEGORIAS.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label" htmlFor="precoTipo">
                Cobrança
              </label>
              <select
                id="precoTipo"
                name="precoTipo"
                className="input"
                defaultValue={v.precoTipo ?? precoTipo ?? "hora"}
              >
                <option value="hora">Por hora</option>
                <option value="servico">Por serviço (fechado)</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="precoValor">
                Valor (R$)
              </label>
              <input
                id="precoValor"
                name="precoValor"
                type="number"
                min="0"
                step="0.01"
                className="input"
                defaultValue={v.precoValor ?? precoValor ?? ""}
              />
            </div>
          </div>
          <p className="-mt-2 text-xs leading-relaxed text-muted">
            O valor pode ser ajustado depois de avaliar o serviço no local — deixe isso claro pro
            cliente antes de começar.
          </p>
        </>
      ) : null}

      <div>
        <label className="label" htmlFor="cidadeUf">
          Cidade
        </label>
        <CidadeSelect id="cidadeUf" name="cidadeUf" defaultValue={v.cidadeUf ?? cidadeUf} />
      </div>

      {estado?.erro ? <FormError>{estado.erro}</FormError> : null}

      <div className="flex flex-wrap gap-3">
        <BotaoEnviar className="btn-brand flex-1" enviando="Salvando…">
          SALVAR
        </BotaoEnviar>
        <Link href="/inicio" className="btn-ghost">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
