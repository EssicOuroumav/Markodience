import Navbar from "@/components/Navbar";
import LoginForm from "@/components/LoginForm";

export default async function LoginPage(props: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await props.searchParams;
  return (
    <>
      <Navbar />
      <LoginForm
        notice={error === "confirmation" ? "Le lien de confirmation est invalide ou expiré. Connectez-vous : si votre email n'est pas confirmé, recréez votre compte." : undefined}
      />
    </>
  );
}
