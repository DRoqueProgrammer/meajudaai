import { guardModule } from "@/lib/auth/modules";
import { PublicarForm } from "@/components/publicar-form";

/** Rota `/publicar` (capacidade publicar_vagas): formulário de publicação de nova vaga. */
export default async function PublicarPage() {
  await guardModule("vagas");
  return <PublicarForm />;
}
