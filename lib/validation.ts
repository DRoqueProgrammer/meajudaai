import { z } from "zod";
import { ALVOS_DENUNCIA, MOTIVOS_DENUNCIA } from "./denuncias";

/** Validação do cadastro de conta. `funcionario` só passa no fluxo via convite (a action barra fora dele). */
export const CadastroSchema = z.object({
  nome: z.string().min(2, "Informe seu nome"),
  email: z.string().email("E-mail inválido"),
  senha: z.string().min(6, "Mínimo de 6 caracteres"),
  telefone: z.string().min(10, "Telefone inválido"),
  cidade: z.string().min(2, "Informe a cidade"),
  estado: z.string().min(2).max(2),
  // "funcionario" só é válido no cadastro-via-convite (a action barra fora dele).
  tipo_base: z.enum(["admin", "ajudante", "funcionario"]),
});
export type CadastroInput = z.infer<typeof CadastroSchema>;

/** Validação de publicação/edição de vaga. Data/hora obrigatórias e sem passado; teto de valor contra digitação errada. */
export const VagaSchema = z.object({
  titulo: z.string().min(3, "Título muito curto"),
  categoria: z.string().min(2, "Selecione a categoria"),
  descricao: z.string().optional(),
  cidade: z.string().min(2, "Informe a cidade"),
  bairro: z.string().optional(),
  cep: z.string().optional(),
  // Obrigatórios: uma vaga sem data/hora aparece vazia no feed e não dá para
  // se candidatar com consciência. O `required` do form é conveniência; a regra é aqui.
  data_servico: z
    .string()
    .min(1, "Informe a data do serviço")
    .refine((d) => d >= new Date().toLocaleDateString("sv-SE"), "A data do serviço não pode estar no passado"),
  hora_inicio: z.string().min(1, "Informe o horário de início"),
  // Mínimo R$1: o modelo não tem diária gratuita, e o fallback antigo ("0" no
  // campo vazio) publicava vaga a R$0 sem querer. Zero e vazio agora param aqui
  // com mensagem clara, em vez de virar oferta grátis silenciosa.
  valor_diaria: z.coerce
    .number()
    .min(1, "Informe quanto a diária paga (a partir de R$1).")
    .max(99999, "Valor muito alto — confira se não digitou um zero a mais."),
  quantidade_vagas: z.coerce.number().int().min(1).default(1),
});
export type VagaInput = z.infer<typeof VagaSchema>;

/** Validação de avaliação: nota inteira de 1 a 5 e comentário opcional. */
export const AvaliacaoSchema = z.object({
  vagaId: z.string().uuid(),
  avaliadoId: z.string().uuid(),
  nota: z.coerce.number().int().min(1).max(5),
  comentario: z.string().optional(),
});

/** Validação de denúncia: alvo, motivo (slugs do check da tabela) e detalhe opcional. */
export const DenunciaSchema = z.object({
  alvo_tipo: z.enum(ALVOS_DENUNCIA),
  alvo_id: z.string().uuid(),
  motivo: z.enum(MOTIVOS_DENUNCIA.map((m) => m.slug) as [string, ...string[]]),
  detalhe: z.string().max(1000, "Detalhe muito longo").optional(),
});

/** Validação de mensagem do chat: 1–2000 caracteres, com erros em PT-BR. */
export const MensagemSchema = z.object({
  conversaId: z.string().uuid(),
  // Mensagem escrita: o texto padrão do Zod ("String must contain at most
  // 2000 character(s)") chegava ao chat em inglês.
  conteudo: z
    .string()
    .min(1, "Escreva a mensagem antes de enviar.")
    .max(2000, "Mensagem muito longa — o limite é 2000 caracteres."),
});
