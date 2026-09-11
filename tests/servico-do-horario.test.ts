import { describe, it, expect } from "vitest";
import { servicoDoHorario, servicosPorHorario } from "@/lib/servico-do-horario";

describe("servicoDoHorario", () => {
  it("prefere o serviço que ocupa o horário ao cancelado", () => {
    const r = servicoDoHorario([
      { id: "a", status: "cancelado", created_at: "2026-09-01T10:00:00Z" },
      { id: "b", status: "pendente", created_at: "2026-09-02T10:00:00Z" },
    ]);
    expect(r?.id).toBe("b");
  });

  it("sem serviço ativo, fica com o cancelado mais recente", () => {
    const r = servicoDoHorario([
      { id: "a", status: "cancelado", created_at: "2026-09-01T10:00:00Z" },
      { id: "c", status: "cancelado", created_at: "2026-09-03T10:00:00Z" },
    ]);
    expect(r?.id).toBe("c");
  });

  it("agrupa por horário", () => {
    const m = servicosPorHorario([
      { slot_id: "h1", id: "a", status: "cancelado", created_at: "1" },
      { slot_id: "h1", id: "b", status: "confirmado", created_at: "2" },
      { slot_id: "h2", id: "c", status: "realizado", created_at: "1" },
    ]);
    expect(m.get("h1")?.id).toBe("b");
    expect(m.get("h2")?.id).toBe("c");
  });
});
