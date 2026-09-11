"use client";

import { useActionState, useState } from "react";
import { criarAnuncioAction } from "@/lib/actions/anuncios";
import { CATEGORIAS } from "@/lib/categorias";
import { mascaraTelefone } from "@/lib/format";
import { FormError } from "@/components/ui";
import { BotaoEnviar } from "@/components/botao-enviar";

/** Os dois tipos de anúncio que o prestador pode publicar (migration 0044). */
const TIPOS = [
  {
    valor: "servico" as const,
    titulo: "Oferecer meu serviço",
    desc: "Aparece na busca, no seu perfil e na vitrine pública da página inicial.",
  },
  {
    valor: "vaga_ajudante" as const,
    titulo: "Necessita-se ajudante!",
    desc: "Vaga para quem ainda não tem conta no app — aparece no mural da página inicial com seu WhatsApp.",
  },
];

/**
 * Formulário de novo anúncio ("Meus anúncios", `/anuncios`): escolha do tipo
 * em dois cartões grandes, título, descrição (com contador) e categoria; o
 * campo de WhatsApp só aparece na vaga para ajudante, pré-preenchido com o
 * telefone do perfil (editável, com máscara). A validação de negócio (dono,
 * limite, moderação) é toda da action (`criarAnuncioAction`) — este
 * componente só coleta o formulário e funciona sem JavaScript.
 */
export function AnuncioForm({
  categoriaPerfil,
  telefonePerfil,
}: {
  categoriaPerfil: string | null;
  telefonePerfil: string | null;
}) {
  const [estado, formAction] = useActionState(criarAnuncioAction, null);
  const v = estado?.valores ?? {};
  const [tipo, setTipo] = useState<"servico" | "vaga_ajudante">(
    v.tipo === "vaga_ajudante" ? "vaga_ajudante" : "servico",
  );
  const [descricao, setDescricao] = useState(v.descricao ?? "");
  const [whatsapp, setWhatsapp] = useState(
    v.whatsapp ?? (telefonePerfil ? mascaraTelefone(telefonePerfil) : ""),
  );

  return (
    <form action={formAction} className="card flex flex-col gap-3">
      <h2 className="text-sm font-semibold">Novo anúncio</h2>
      <fieldset className="flex flex-col gap-2">
        <legend className="label mb-1">O que você quer anunciar?</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {TIPOS.map((t) => (
            <label
              key={t.valor}
              className="flex min-h-[92px] cursor-pointer flex-col justify-center gap-0.5 rounded-xl border-2 border-line bg-card px-4 py-3 text-left transition hover:border-brand has-[:checked]:border-brand has-[:checked]:bg-brand-fill has-[:checked]:text-white has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand"
            >
              <input
                type="radio"
                name="tipo"
                value={t.valor}
                checked={tipo === t.valor}
                onChange={() => setTipo(t.valor)}
                className="sr-only"
              />
              <span className="text-sm font-semibold">{t.titulo}</span>
              <span className="text-xs leading-snug text-muted [.text-white_&]:text-white">{t.desc}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label className="label" htmlFor="anuncio-titulo">
          Título
        </label>
        <input
          id="anuncio-titulo"
          name="titulo"
          className="input"
          maxLength={80}
          defaultValue={v.titulo ?? ""}
          placeholder={
            tipo === "servico"
              ? "Ex.: Instalação e manutenção elétrica"
              : "Ex.: Ajudante de pedreiro para obra de 3 dias"
          }
          required
        />
      </div>

      <div>
        <div className="flex items-baseline justify-between gap-2">
          <label className="label" htmlFor="anuncio-descricao">
            Descrição
          </label>
          <span className="text-xs text-muted">{descricao.length}/600</span>
        </div>
        <textarea
          id="anuncio-descricao"
          name="descricao"
          className="input"
          rows={4}
          minLength={10}
          maxLength={600}
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder={
            tipo === "servico"
              ? "Conte o que você faz, sua experiência e como trabalha."
              : "O que o ajudante vai fazer, por quanto tempo e onde."
          }
          required
        />
      </div>

      <div>
        <label className="label" htmlFor="anuncio-categoria">
          Categoria
        </label>
        <select
          id="anuncio-categoria"
          name="categoria"
          className="input"
          defaultValue={v.categoria ?? categoriaPerfil ?? CATEGORIAS[0]!.slug}
        >
          {CATEGORIAS.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.nome}
            </option>
          ))}
        </select>
      </div>

      {tipo === "vaga_ajudante" ? (
        <div>
          <label className="label" htmlFor="anuncio-whatsapp">
            WhatsApp
          </label>
          <input
            id="anuncio-whatsapp"
            name="whatsapp"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            className="input"
            value={whatsapp}
            onChange={(e) => setWhatsapp(mascaraTelefone(e.target.value))}
            required
          />
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Este número aparece no mural público da página inicial enquanto a vaga estiver ativa.
            Quanto paga e como combinam é entre vocês.
          </p>
        </div>
      ) : null}

      {estado?.erro ? <FormError>{estado.erro}</FormError> : null}
      <div className="flex items-center gap-2">
        <BotaoEnviar className="btn-brand" enviando="Publicando…">
          Publicar anúncio
        </BotaoEnviar>
        {estado?.ok ? (
          <span className="text-xs text-ok">
            Anúncio publicado <span aria-hidden="true">✓</span>
          </span>
        ) : null}
      </div>
    </form>
  );
}
