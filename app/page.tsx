import Link from "next/link";
import Navbar from "@/components/Navbar";

export default function Home() {
  return (
    <>
      <Navbar>
        <Link href="/login" className="btn-secondary">
          Se connecter
        </Link>
      </Navbar>
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 text-center">
        <h1 className="text-[40px] leading-tight">
          Structurez la stratégie de vos marques
        </h1>
        <p className="mt-4 text-ink-secondary">
          Identité, piliers de contenu, ligne éditoriale, audit et reporting :
          tout au même endroit, assisté par IA.
        </p>
        <Link href="/signup" className="btn-primary mt-8">
          Créer mon espace
        </Link>
      </main>
    </>
  );
}
