import type { Metadata } from "next";
import { UserCog } from "lucide-react";
import AccountSettings from "@/components/AccountSettings";
import ReminderSettings from "@/components/ReminderSettings";
import { DEFAULT_PREFS, type ReminderPrefs } from "@/lib/reminders";
import PageHeader from "@/components/PageHeader";
import { getDashboardContext } from "@/lib/brand";

export const metadata: Metadata = { title: "Mon compte" };

export default async function AccountPage() {
  const { supabase, user, owner } = await getDashboardContext();
  const { data: prefs } = await supabase.from("reminder_prefs").select("email_enabled, kpi, posts, billing").eq("user_id", user.id).maybeSingle();
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader icon={UserCog} title="Mon compte" description="Vos informations personnelles, votre mot de passe et la maîtrise de vos données." />
      <ReminderSettings userId={user.id} initial={(prefs as ReminderPrefs | null) ?? DEFAULT_PREFS} />
      <AccountSettings email={user.email ?? ""} fullName={(user.user_metadata?.full_name as string | undefined) ?? ""} phone={(user.user_metadata?.phone as string | undefined) ?? ""} canDelete={!owner} />
    </div>
  );
}
