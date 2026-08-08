import { z } from "zod";
import { ALVOS_DENUNCIA, MOTIVOS_DENUNCIA } from "./denuncias";

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
  valor_diaria: z.coerce
    .number()
    .min(0, "Valor inválido")
    .max(99999, "Valor muito alto — confira se não digitou um zero a mais."),
  quantidade_vagas: z.coerce.number().int().min(1).default(1),
});
export type VagaInput = z.infer<typeof VagaSchema>;

export const AvaliacaoSchema = z.object({
  vagaId: z.string().uuid(),
  avaliadoId: z.string().uuid(),
  nota: z.coerce.number().int().min(1).max(5),
  comentario: z.string().optional(),
});

export const DenunciaSchema = z.object({
  alvo_tipo: z.enum(ALVOS_DENUNCIA),
  alvo_id: z.string().uuid(),
  motivo: z.enum(MOTIVOS_DENUNCIA.map((m) => m.slug) as [string, ...string[]]),
  detalhe: z.string().max(1000, "Detalhe muito longo").optional(),
});

export const MensagemSchema = z.object({
  conversaId: z.string().uuid(),
  // Mensagem escrita: o texto padrão do Zod ("String must contain at most
  // 2000 character(s)") chegava ao chat em inglês.
  conteudo: z
    .string()
    .min(1, "Escreva a mensagem antes de enviar.")
    .max(2000, "Mensagem muito longa — o limite é 2000 caracteres."),
});
