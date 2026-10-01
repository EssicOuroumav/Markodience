import Link from "next/link";
import { ArrowLeft, CreditCard, LayoutDashboard, Users } from "lucide-react";
import Navbar from "@/components/Navbar";
import { requireAdmin } from "@/lib/admin";

const NAV = [
  { href: "/admin", label: "Vue d’ensemble", Icon: LayoutDashboard },
  { href: "/admin/users", label: "Utilisateurs", Icon: Users },
  { href: "/admin/payments", label: "Paiements", Icon: CreditCard },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="min-h-screen bg-canvas">
      <Navbar homeHref="/admin">
        <span className="chip">Espace administrateur</span>
      </Navbar>
      <div className="mx-auto max-w-6xl px-5 pb-20 pt-24 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <nav aria-label="Administration" className="flex gap-1 rounded-pill bg-white p-1 shadow-card">
            {NAV.map(({ href, label, Icon }) => (
              <Link key={href} href={href} className="flex items-center gap-2 rounded-pill px-4 py-2 text-[15px] font-medium text-ink/80 transition hover:bg-canvas hover:text-ink">
                <Icon size={17} strokeWidth={1.9} />{label}
              </Link>
            ))}
          </nav>
          <Link href="/dashboard" className="btn-ghost"><ArrowLeft size={17} />Retour à l’application</Link>
        </div>
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}
