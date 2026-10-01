import type { Metadata } from "next";
import AuthShell from "@/components/AuthShell";
import ResetPasswordForm from "@/components/ResetPasswordForm";

export const metadata: Metadata = { title: "Nouveau mot de passe", robots: { index: false } };

// Page protégée par le proxy : on n'y arrive qu'avec la session ouverte par le lien de réinitialisation.
export default function ResetPasswordPage() {
  return (
    <AuthShell>
      <ResetPasswordForm />
    </AuthShell>
  );
}
