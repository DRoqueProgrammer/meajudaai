"use client";

import { useActionState, useRef, useState } from "react";
import { publicarVagaAction } from "@/lib/actions/vagas";
import { CATEGORIAS } from "@/lib/categorias";
import { CIDADES } from "@/lib/cidades";
import { FormError } from "@/components/ui";
import { BotaoEnviar } from "@/components/botao-enviar";
import { formatBRL } from "@/lib/format";
import type { EstadoForm } from "@/lib/actions/form";

// Média usada na dica e no limite de confirmação. Acima de 3× a média um valor
// quase sempre é typo (R$ 1.500 no lugar de R$ 150) — por isso pede confirmação.
const MEDIA = 148;
const CONFIRMA_ACIMA = MEDIA * 3;

/**
 * Formulário de diária, compartilhado por publicar e editar. `action` e
 * `iniciais` são o que muda entre os dois; o resto (validação, guarda de valor,
 * caminho sem JavaScript) é idêntico.
 */
export function PublicarForm({
  action = publicarVagaAction,
  iniciais,
  titulo = "Publicar diária",
  enviarLabel = "PUBLICAR DIÁRIA",
  enviando = "Publicando…",
}: {
  action?: (estado: EstadoForm, fd: FormData) => Promise<EstadoForm>;
  iniciais?: Record<string, string>;
  titulo?: string;
  enviarLabel?: string;
  enviando?: string;
}) {
  const [estado, formAction] = useActionState(action, null);
  // Valores iniciais (edição) por baixo; o que a pessoa digitou e a action
  // recusou por cima — assim um erro de validação não descarta o que ela mudou.
  const v = { ...(iniciais ?? {}), ...(estado?.valores ?? {}) };

  // Data mínima = hoje. Diária publicada para ontem é lixo no feed de todo ajudante.
  const hoje = new Date().toLocaleDateString("sv-SE");

  // Guarda contra typo no valor: acima de 3× a média, confirma antes de enviar.
  // A checagem é no clique do botão (não no onSubmit do form): cancelar o clique
  // barra o envio de forma confiável, sem correr atrás da action do React. Sem
  // JavaScript o botão é submit normal e o teto do schema ainda barra o absurdo.
  const formRef = useRef<HTMLFormElement>(null);
  const [valorAlto, setValorAlto] = useState<number | null>(null);

  // Aviso de data passada: uma vaga aberta cuja data já passou chega à edição com
  // a data pré-preenchida inválida (min=hoje). O aviso aparece enquanto a data
  // estiver no passado e some assim que escolhem uma nova — no publicar nunca
  // dispara, porque o campo começa vazio e o picker não deixa voltar no tempo.
  const [dataAtual, setDataAtual] = useState(v.data_servico ?? "");

  function talvezConfirmar(e: React.MouseEvent<HTMLButtonElement>) {
    if (!formRef.current) return;
    const valor = Number(new FormData(formRef.current).get("valor_diaria"));
    if (Number.isFinite(valor) && valor > CONFIRMA_ACIMA) {
      e.preventDefault();
      setValorAlto(valor);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {titulo ? <h1 className="text-xl font-semibold">{titulo}</h1> : null}
      <form ref={formRef} action={formAction} className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-brand">1. Serviço</p>
        <div>
          <label className="label" htmlFor="titulo">
            Título
          </label>
          <input id="titulo" name="titulo" className="input" defaultValue={v.titulo ?? ""} placeholder="Ex.: Ajudante para instalação elétrica" required />
        </div>
        <div>
          <label className="label" htmlFor="categoria">
            Tipo de serviço
          </label>
          <select id="categoria" name="categoria" className="input" defaultValue={v.categoria ?? CATEGORIAS[0]!.slug}>
            {CATEGORIAS.map((c) => (
              <option key={c.slug} value={c.slug}>{c.nome}</option>
            ))}
          </select>
        </div>
        <p className="mt-1 text-sm font-semibold text-brand">2. Local da obra</p>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="label" htmlFor="cidade">
              Cidade
            </label>
            <select id="cidade" name="cidade" className="input" defaultValue={v.cidade ?? CIDADES[0]!.nome}>
              {CIDADES.map((c) => (
                <option key={`${c.nome}-${c.uf}`} value={c.nome}>{c.nome} - {c.uf}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="label" htmlFor="bairro">
              Bairro
            </label>
            <input id="bairro" name="bairro" className="input" defaultValue={v.bairro ?? ""} />
          </div>
        </div>
        <p className="mt-1 text-sm font-semibold text-brand">3. Data e horário</p>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="label" htmlFor="data_servico">
              Data
            </label>
            <input id="data_servico" name="data_servico" className="input" type="date" min={hoje} defaultValue={v.data_servico ?? ""} onChange={(e) => setDataAtual(e.target.value)} required />
          </div>
          <div className="flex-1">
            <label className="label" htmlFor="hora_inicio">
              Horário
            </label>
            <input id="hora_inicio" name="hora_inicio" className="input" type="time" defaultValue={v.hora_inicio ?? ""} required />
          </div>
        </div>
        {dataAtual && dataAtual < hoje ? (
          <p className="-mt-1 text-xs text-danger">
            A data desta diária já passou. Escolha uma nova data antes de salvar.
          </p>
        ) : null}
        <p className="mt-1 text-sm font-semibold text-brand">4. Valor da diária</p>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="label" htmlFor="valor_diaria">
              Valor da diária (R$)
            </label>
            <input id="valor_diaria" name="valor_diaria" className="input" type="number" inputMode="decimal" min="0" step="0.01" defaultValue={v.valor_diaria ?? ""} aria-describedby="valor-referencia" required />
          </div>
          <div className="w-28">
            <label className="label" htmlFor="quantidade_vagas">
              Vagas
            </label>
            <input id="quantidade_vagas" name="quantidade_vagas" className="input" type="number" inputMode="numeric" min="1" defaultValue={v.quantidade_vagas ?? "1"} />
          </div>
        </div>
        {/* "Quanto eu ofereço?" é a maior dúvida na hora de publicar. O número já
            estava na landing e faltava exatamente aqui, no momento da decisão. */}
        <p id="valor-referencia" className="-mt-1 text-xs text-muted">
          A diária média na plataforma é de {formatBRL(MEDIA)}. Valores abaixo da média costumam demorar mais
          para receber candidatos.
        </p>
        <p className="mt-1 text-sm font-semibold text-brand">5. Descrição (opcional)</p>
        <div>
          <label className="label" htmlFor="descricao">
            O que o ajudante vai fazer
          </label>
          <textarea id="descricao" name="descricao" className="input" rows={3} defaultValue={v.descricao ?? ""} placeholder="Ex.: passagem de fios, organização de materiais…" />
        </div>
        {estado?.erro ? <FormError>{estado.erro}</FormError> : null}
        {valorAlto !== null ? (
          // Passo de confirmação: valor bem acima da média quase sempre é typo.
          <div className="flex flex-col gap-3 rounded-xl border border-brand bg-[#e6effb] p-3">
            <p className="text-sm">
              <strong className="font-semibold">{formatBRL(valorAlto)}</strong> está bem acima da média
              ({formatBRL(MEDIA)}). Confirma esse valor da diária?
            </p>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setValorAlto(null)} className="btn-ghost px-4 text-xs">
                Voltar e corrigir
              </button>
              {/* Submit de verdade, sem onClick de intercepção: o envio segue. */}
              <BotaoEnviar className="btn-action px-4 text-xs" enviando={enviando}>
                Confirmar valor
              </BotaoEnviar>
            </div>
          </div>
        ) : (
          <BotaoEnviar className="btn-brand" enviando={enviando} onClick={talvezConfirmar}>
            {enviarLabel}
          </BotaoEnviar>
        )}
      </form>
    </div>
  );
}
