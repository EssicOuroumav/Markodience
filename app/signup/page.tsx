import AuthShell from "@/components/AuthShell";
import OnboardingFlow from "@/components/OnboardingFlow";

export default function SignupPage() {
  return (
    <AuthShell>
      <OnboardingFlow />
    </AuthShell>
  );
}
