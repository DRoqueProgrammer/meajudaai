import { guardModule } from "@/lib/auth/modules";
import { PublicarForm } from "@/components/publicar-form";

export default async function PublicarPage() {
  await guardModule("vagas");
  return <PublicarForm />;
}
