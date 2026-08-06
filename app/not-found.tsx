import Link from "next/link";
import { Logo } from "@/components/logo";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6 py-10 text-center">
      <div className="flex justify-center">
        <Logo />
      </div>
      <h1 className="text-xl font-semibold">Não encontramos essa página</h1>
      <p className="text-sm leading-relaxed text-muted">
        A vaga pode ter sido cancelada ou o link estar errado.
      </p>
      <div className="flex flex-col gap-2">
        <Link href="/inicio" className="btn-brand">
          Ir para o início
        </Link>
        <Link href="/vagas" className="link-touch">
          Ver vagas abertas
        </Link>
      </div>
    </main>
  );
}
