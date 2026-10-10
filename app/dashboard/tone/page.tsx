import { redirect } from "next/navigation";

/** La tonalité & voix fait désormais partie de l'Identité de marque. */
export default function TonePage() {
  redirect("/dashboard/identity#tone");
}
