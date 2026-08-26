import { describe, it, expect } from "vitest";
import { MOTIVOS_DENUNCIA } from "../lib/denuncias";
import { CadastroSchema, VagaSchema, AvaliacaoSchema, DenunciaSchema } from "../lib/validation";

describe("CadastroSchema", () => {
  const base = {
    nome: "Cleber",
    email: "cleber@exemplo.com",
    senha: "segredo",
    telefone: "21999998888",
    cidade: "Niterói",
    estado: "RJ",
    tipo_base: "ajudante",
  };

  it("aceita dados válidos", () => {
    expect(CadastroSchema.safeParse(base).success).toBe(true);
  });

  it("rejeita e-mail inválido", () => {
    expect(CadastroSchema.safeParse({ ...base, email: "x" }).success).toBe(false);
  });

  it("rejeita senha curta", () => {
    expect(CadastroSchema.safeParse({ ...base, senha: "123" }).success).toBe(false);
  });
});

describe("VagaSchema", () => {
  const hoje = new Date().toLocaleDateString("sv-SE");
  const amanha = new Date(Date.now() + 86_400_000).toLocaleDateString("sv-SE");
  const ontem = new Date(Date.now() - 86_400_000).toLocaleDateString("sv-SE");
  const base = {
    titulo: "Ajudante",
    categoria: "ajudante_pedreiro",
    cidade: "Niterói",
    valor_diaria: 150,
    data_servico: amanha,
    hora_inicio: "07:00",
  };

  it("aceita vaga válida e faz coerce de número", () => {
    const r = VagaSchema.safeParse({ ...base, valor_diaria: "150" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.valor_diaria).toBe(150);
  });

  it("rejeita título curto", () => {
    expect(VagaSchema.safeParse({ ...base, titulo: "ab" }).success).toBe(false);
  });

  it("rejeita valor negativo", () => {
    expect(VagaSchema.safeParse({ ...base, valor_diaria: -5 }).success).toBe(false);
  });

  // Diária gratuita não existe no modelo: campo vazio (coerção → 0) e R$0 param
  // no schema, em vez de publicar oferta grátis por engano.
  it("rejeita valor zero e campo vazio", () => {
    expect(VagaSchema.safeParse({ ...base, valor_diaria: 0 }).success).toBe(false);
    expect(VagaSchema.safeParse({ ...base, valor_diaria: "" }).success).toBe(false);
  });

  // Vaga sem data/hora renderiza vazia no feed e não dá para se candidatar
  // com consciência — a regra vive no schema, não só no `required` do form.
  it("rejeita vaga sem data do serviço", () => {
    const { data_servico: _, ...semData } = base;
    expect(VagaSchema.safeParse(semData).success).toBe(false);
    expect(VagaSchema.safeParse({ ...base, data_servico: "" }).success).toBe(false);
  });

  it("rejeita vaga sem horário de início", () => {
    const { hora_inicio: _, ...semHora } = base;
    expect(VagaSchema.safeParse(semHora).success).toBe(false);
    expect(VagaSchema.safeParse({ ...base, hora_inicio: "" }).success).toBe(false);
  });

  it("rejeita data no passado e aceita hoje", () => {
    expect(VagaSchema.safeParse({ ...base, data_servico: ontem }).success).toBe(false);
    expect(VagaSchema.safeParse({ ...base, data_servico: hoje }).success).toBe(true);
  });
});

describe("AvaliacaoSchema", () => {
  const base = {
    vagaId: "00000000-0000-0000-0000-000000000001",
    avaliadoId: "00000000-0000-0000-0000-000000000002",
    nota: 5,
  };

  it("aceita nota 1..5", () => {
    expect(AvaliacaoSchema.safeParse(base).success).toBe(true);
  });

  it("rejeita nota fora da faixa", () => {
    expect(AvaliacaoSchema.safeParse({ ...base, nota: 6 }).success).toBe(false);
  });
});

describe("DenunciaSchema", () => {
  const base = {
    alvo_tipo: "usuario",
    alvo_id: "00000000-0000-0000-0000-000000000001",
    motivo: "nao_compareceu",
  };

  it("aceita denúncia válida, com e sem detalhe", () => {
    expect(DenunciaSchema.safeParse(base).success).toBe(true);
    expect(DenunciaSchema.safeParse({ ...base, detalhe: "Não apareceu na obra." }).success).toBe(true);
  });

  it("rejeita motivo fora do check constraint da tabela", () => {
    expect(DenunciaSchema.safeParse({ ...base, motivo: "nao_gostei" }).success).toBe(false);
  });

  it("rejeita alvo fora dos quatro tipos", () => {
    expect(DenunciaSchema.safeParse({ ...base, alvo_tipo: "empresa" }).success).toBe(false);
  });

  it("rejeita alvo_id que não é uuid", () => {
    expect(DenunciaSchema.safeParse({ ...base, alvo_id: "123" }).success).toBe(false);
  });

  // Todo motivo exposto na UI precisa passar no schema: um rótulo novo em
  // MOTIVOS_DENUNCIA sem o slug correspondente quebraria só em produção.
  it("aceita todos os motivos oferecidos na interface", () => {
    for (const m of MOTIVOS_DENUNCIA) {
      expect(DenunciaSchema.safeParse({ ...base, motivo: m.slug }).success).toBe(true);
    }
  });
});
