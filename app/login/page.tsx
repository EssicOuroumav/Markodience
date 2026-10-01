import Navbar from "@/components/Navbar";
import LoginForm from "@/components/LoginForm";

export default async function LoginPage(props: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await props.searchParams;
  return (
    <>
      <Navbar />
      <LoginForm
        notice={error === "confirmation" ? "Ce lien de confirmation a déjà été utilisé ou a expiré. Si vous avez déjà cliqué dessus, votre email est confirmé : connectez-vous simplement avec votre email et votre mot de passe." : undefined}
      />
    </>
  );
}
