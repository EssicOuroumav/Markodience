import { redirect } from "next/navigation";

/** La charte graphique fait désormais partie de l'Identité de marque. */
export default function CharterPage() {
  redirect("/dashboard/identity#charter");
}
