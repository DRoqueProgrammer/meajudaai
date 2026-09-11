"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { cadastrarAction } from "@/lib/actions/auth";
import { CidadeSelect } from "@/components/cidade-select";
import { AddressMapPicker } from "@/components/maps/address-map-picker-dynamic";
import { mascaraTelefone } from "@/lib/format";
import { Logo } from "@/components/logo";
import { CampoArquivo, FormError } from "@/components/ui";
import { CampoSenha } from "@/components/campo-senha";
import { BotaoEnviar } from "@/components/botao-enviar";

// "admin" continua no tipo por causa do cadastro por convite (owner → admin,
// ver lib/actions/auth.ts) e da querystring `?papel=` que `page.tsx` já lê —
// mas a tela pública (`PAPEIS` abaixo) não oferece mais essa opção (R-44,
// D-016: Administrador nasce só por ação do SysAdmin). `papelOfertado`
// blinda o estado do formulário contra esse valor chegando por fora.
export type Papel = "admin" | "prestador_servico" | "cliente";

export interface ConviteInfo {
  token: string;
  equipeNome: string;
  papelLabel: string;
}

/** Os nomes dos valores vêm do schema (tipo_base), não da UI. */
const PAPEIS = [
  {
    valor: "cliente" as const,
    titulo: "Preciso contratar um serviço",
    desc: "Busco um profissional e agendo direto com ele.",
    confirmacao: "Sua conta vai buscar prestadores e agendar horários.",
  },
  {
    valor: "prestador_servico" as const,
    titulo: "Quero prestar serviço",
    desc: "Ofereço minha agenda e atendo clientes direto.",
    confirmacao: "Sua conta vai montar um perfil e receber pedidos de agendamento.",
  },
];

/** Só aceita o papel se for uma das opções que a tela de fato oferece. */
function papelOfertado(valor: unknown): Papel | null {
  return valor === "cliente" || valor === "prestador_servico" ? valor : null;
}

/** Formulário de cadastro (client): escolha de papel, dados pessoais e máscaras; no modo convite o papel vem fixado. */
export function CadastroForm({
  papelInicial,
  convite = null,
}: {
  papelInicial: Papel | null;
  convite?: ConviteInfo | null;
}) {
  const [estado, formAction] = useActionState(cadastrarAction, null);

  const v = estado?.valores ?? {};
  const [telefone, setTelefone] = useState(v.telefone ?? "");
  const [papel, setPapel] = useState<Papel | null>(
    papelOfertado(v.tipo_base) ?? papelOfertado(papelInicial),
  );
  const [endereco, setEndereco] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);

  // Sem convite, a tela só oferece cliente e prestador_servico — e os dois
  // precisam de endereço + pino pra ordenar busca por proximidade (a action já
  // exige isso pros dois). Por isso a seção aparece SEMPRE nesse caminho,
  // desde o primeiro carregamento: antes só nascia depois de escolher o papel,
  // e o Leonardo achou que "o mapa tinha sumido" (pedido de 10/09/2026). Com
  // convite (funcionário/sócio), o papel já vem fixo e não há endereço — como antes.
  const semConvite = !convite;
  const enderecoValido = endereco.trim().length > 0 && lat !== null && lng !== null;
  const desabilitado = semConvite ? !papel || !enderecoValido : false;

  /**
   * Prévia redonda da foto escolhida — só no cliente, nada sobe até o envio.
   * `revokeObjectURL` da prévia anterior evita acumular URLs de blob à toa
   * quando a pessoa troca de arquivo mais de uma vez antes de enviar.
   */
  function aoEscolherFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    setFotoPreview((antiga) => {
      if (antiga) URL.revokeObjectURL(antiga);
      return arquivo ? URL.createObjectURL(arquivo) : null;
    });
  }

  return (
    <main
      className={`mx-auto flex min-h-screen w-full flex-col justify-center gap-4 px-4 py-10 sm:px-6 ${
        semConvite ? "max-w-[1100px]" : "max-w-md"
      }`}
    >
      <Logo />
      <h1 className="text-2xl font-semibold text-brand">Criar conta</h1>
      <form action={formAction} className="flex flex-col gap-4">
        <div
          className={`grid gap-6 ${
            semConvite ? "lg:grid-cols-[1.15fr_1fr] lg:items-start lg:gap-8" : ""
          }`}
        >
          <div className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-6 shadow-[0_1px_3px_rgba(15,23,42,0.07)]">
            {convite ? (
              // Cadastro via convite: o papel é definido pelo convite, não escolhido.
              <div className="rounded-xl border border-brand bg-tint-info p-3">
                <input type="hidden" name="convite_token" value={convite.token} />
                <p className="text-sm">
                  Você foi convidado para <strong className="font-semibold">{convite.equipeNome}</strong>{" "}
                  como <strong className="font-semibold">{convite.papelLabel}</strong>. Complete o cadastro
                  — o responsável pela equipe aprova o seu acesso.
                </p>
              </div>
            ) : (
              <fieldset className="flex flex-col gap-2">
                <legend className="label mb-1">Você está aqui para quê?</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {PAPEIS.map((p) => (
                    <label
                      key={p.valor}
                      className="flex min-h-[76px] cursor-pointer flex-col justify-center gap-0.5 rounded-xl border-2 border-line bg-card px-4 py-3 text-left transition hover:border-brand has-[:checked]:border-brand has-[:checked]:bg-brand-fill has-[:checked]:text-white has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand"
                    >
                      <input
                        type="radio"
                        name="tipo_base"
                        value={p.valor}
                        checked={papel === p.valor}
                        onChange={() => setPapel(p.valor)}
                        required
                        className="sr-only"
                      />
                      <span className="text-sm font-semibold">{p.titulo}</span>
                      <span className="text-xs leading-snug text-muted [.text-white_&]:text-white">
                        {p.desc}
                      </span>
                    </label>
                  ))}
                </div>
                <p aria-live="polite" className="text-xs text-muted">
                  {papel
                    ? PAPEIS.find((p) => p.valor === papel)!.confirmacao
                    : "Dá para trocar depois, enquanto você não tiver vaga nem candidatura."}
                </p>
              </fieldset>
            )}
            <div>
              <label className="label" htmlFor="nome">
                Nome
              </label>
              <input id="nome" name="nome" autoComplete="name" className="input" defaultValue={v.nome ?? ""} required />
            </div>
            <div>
              <label className="label" htmlFor="email">
                E-mail
              </label>
              <input id="email" name="email" autoComplete="email" className="input" type="email" defaultValue={v.email ?? ""} required />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <CampoSenha id="senha" name="senha" label="Senha" autoComplete="new-password" minLength={6} />
              <CampoSenha
                id="confirmacao_senha"
                name="confirmacao_senha"
                label="Confirme a senha"
                autoComplete="new-password"
                minLength={6}
              />
            </div>
            <div>
              <label className="label" htmlFor="telefone">
                Telefone
              </label>
              <input
                id="telefone"
                name="telefone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                className="input"
                placeholder="(21) 99888-4455"
                value={telefone}
                onChange={(e) => setTelefone(mascaraTelefone(e.target.value))}
                aria-describedby="pii-motivo"
                required
              />
            </div>
            <p id="pii-motivo" className="-mt-1 text-xs leading-relaxed text-muted">
              Seu telefone fica guardado e <strong className="font-medium">nunca aparece</strong> no seu
              perfil. Ele serve para confirmar que você é uma pessoa real e para o contato depois que a
              diária é aceita.
            </p>
            <div>
              <label className="label" htmlFor="genero">
                Gênero
              </label>
              {/* Os valores continuam os mesmos: o app deriva deles a saudação
                  (Bem-vindo/Bem-vinda/Bem-vinde, lib/saudacao.ts) e a foto pública
                  (lib/foto-aleatoria.ts) — a pessoa só escolhe o gênero. */}
              <select id="genero" name="genero" className="input" defaultValue={v.genero ?? ""} required>
                <option value="" disabled>
                  — selecione —
                </option>
                <option value="masculino">Masculino</option>
                <option value="feminino">Feminino</option>
                <option value="prefiro_nao_responder">Prefiro não informar</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="cidade">
                Cidade
              </label>
              <CidadeSelect id="cidade" name="cidadeUf" defaultValue={v.cidadeUf ?? "Niterói|RJ"} />
            </div>
            <div>
              <label className="label" htmlFor="foto">
                Foto (opcional)
              </label>
              <div className="flex items-center gap-3">
                {fotoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element -- prévia local (blob:), next/image não se aplica
                  <img
                    src={fotoPreview}
                    alt="Prévia da foto escolhida"
                    className="h-14 w-14 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-surface text-2xl"
                  >
                    🙂
                  </span>
                )}
                <CampoArquivo
                  id="foto"
                  name="foto"
                  accept="image/jpeg,image/png,image/webp"
                  label={fotoPreview ? "Trocar foto" : "Escolher foto"}
                  className="flex-1"
                  onChange={aoEscolherFoto}
                />
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                JPG, PNG ou WEBP, até 2 MB. Se você não escolher, sua conta já nasce com uma foto pública.
              </p>
            </div>
          </div>

          {semConvite ? (
            <div className="flex flex-col gap-2 rounded-2xl border border-line bg-card p-6 shadow-[0_1px_3px_rgba(15,23,42,0.07)] lg:sticky lg:top-6">
              <h2 className="label mb-0 flex items-center gap-1">
                Endereço e localização
                <span aria-hidden="true" className="text-danger">
                  *
                </span>
                <span className="sr-only">(obrigatório)</span>
              </h2>
              <input type="hidden" name="endereco" value={endereco} />
              <input type="hidden" name="lat" value={lat ?? ""} />
              <input type="hidden" name="lng" value={lng ?? ""} />
              <AddressMapPicker
                alturaMapa="h-[260px] lg:h-[440px]"
                onChange={(val) => {
                  setEndereco(val.endereco);
                  setLat(val.lat);
                  setLng(val.lng);
                }}
              />
              <p className="text-xs leading-relaxed text-muted">
                Obrigatório: é o que permite ordenar buscas por proximidade. O endereço exato só
                aparece pra quem você aceitar um serviço.
              </p>
            </div>
          ) : null}
        </div>

        {estado?.erro ? <FormError>{estado.erro}</FormError> : null}
        <p className="text-xs leading-relaxed text-muted">
          Ao criar conta, você concorda com os{" "}
          <Link href="/termos" className="text-brand underline">
            Termos de Uso
          </Link>{" "}
          e a{" "}
          <Link href="/privacidade" className="text-brand underline">
            Política de Privacidade
          </Link>
          .
        </p>
        <BotaoEnviar className="btn-brand mt-1" enviando="Criando…" desabilitado={desabilitado}>
          CRIAR CONTA
        </BotaoEnviar>
        <Link href="/login" className="link-touch">
          Já tenho conta
        </Link>
      </form>
    </main>
  );
}
