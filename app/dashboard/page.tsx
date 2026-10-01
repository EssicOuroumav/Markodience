import Link from "next/link";
import { ArrowRight, CalendarDays, Check, ChevronRight, Radio, ScanSearch, Sparkles } from "lucide-react";
import ScoreRing from "@/components/ScoreRing";
import { getDashboardContext } from "@/lib/brand";
import { dateLabel, deadlineFor, deadlineState, monthLabel, monthStart } from "@/lib/kpi";
import { hasFeature, type Feature } from "@/lib/plans";
import { TABS, type TabSlug } from "@/lib/tabs";
import { TAB_ICONS } from "@/lib/tabIcons";

type Step = { slug: TabSlug; label: string; done: boolean; feature: Feature };

export default async function DashboardHome() {
  const { supabase, active, plan, user } = await getDashboardContext();
  const month = monthStart(new Date());
  const [identity, pillars, tone, lines, audit, kpi, brand, guides] = await Promise.all([
    supabase.from("brand_identity").select("positioning").eq("brand_profile_id", active.id).maybeSingle(),
    supabase.from("content_pillars").select("id", { count: "exact", head: true }).eq("brand_profile_id", active.id),
    supabase.from("tone_voice").select("do_list").eq("brand_profile_id", active.id).maybeSingle(),
    supabase.from("editorial_lines").select("id, channel").eq("brand_profile_id", active.id),
    supabase.from("audits").select("report_data, created_at").eq("brand_profile_id", active.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("kpi_reports").select("submitted_at, deadline").eq("brand_profile_id", active.id).eq("month", month).maybeSingle(),
    supabase.from("brand_profiles").select("kpi_deadline_day").eq("id", active.id).single(),
    supabase.from("live_guides").select("id", { count: "exact", head: true }).eq("brand_profile_id", active.id),
  ]);

  const lineIds = (lines.data ?? []).map((l) => l.id);
  const entries = lineIds.length ? (await supabase.from("editorial_entries").select("status").in("editorial_line_id", lineIds)).data ?? [] : [];
  const weeksDone = entries.filter((e) => e.status === "termine").length;

  const steps: Step[] = [
    { slug: "identity", label: "Identité de marque", done: !!identity.data?.positioning, feature: "identity" },
    { slug: "pillars", label: "Piliers de contenu", done: (pillars.count ?? 0) > 0, feature: "pillars" },
    { slug: "tone", label: "Tonalité & voix", done: !!tone.data?.do_list, feature: "tone" },
    { slug: "editorial", label: "Ligne éditoriale", done: entries.length > 0, feature: "editorial" },
    { slug: "audit", label: "Premier audit", done: !!audit.data, feature: "audit" },
    { slug: "kpi", label: "Rapport KPI du mois", done: !!kpi.data?.submitted_at, feature: "kpi" },
  ];
  const available = steps.filter((s) => hasFeature(plan, s.feature));
  const doneCount = available.filter((s) => s.done).length;
  const percent = Math.round((doneCount / Math.max(available.length, 1)) * 100);
  const next = available.find((s) => !s.done);
  const nextTab = next ? TABS.find((t) => t.slug === next.slug) : null;

  const score = (audit.data?.report_data as { score?: number } | null)?.score;
  const day = brand.data?.kpi_deadline_day ?? 5;
  const deadline = kpi.data?.deadline ?? deadlineFor(month, day);
  const kpiState = deadlineState(new Date().toISOString().slice(0, 10), deadline, kpi.data?.submitted_at ?? null);
  const firstName = ((user.user_metadata?.full_name as string | undefined) ?? "").split(" ")[0];

  return (
    <div className="rise space-y-8">
      <header>
        <p className="eyebrow">Vue d’ensemble</p>
        <h1 className="mt-2 text-[36px] leading-tight tracking-[-0.03em]">{firstName ? `Bonjour ${firstName},` : "Bonjour,"} <span className="text-ink-secondary">voici {active.name}.</span></h1>
      </header>

      <section className="card-flat relative overflow-hidden !p-8">
        <div aria-hidden className="mesh absolute inset-0 opacity-70" />
        <div className="relative grid items-center gap-8 md:grid-cols-[auto_1fr]">
          <ScoreRing value={percent} size={132} stroke={12} label={`Stratégie complète à ${percent} %`} />
          <div>
            <h2 className="text-[26px] leading-snug tracking-[-0.02em]">{percent === 100 ? "Votre stratégie est complète." : `Votre stratégie est complète à ${percent} %.`}</h2>
            <p className="mt-1.5 max-w-xl text-[16px] text-ink-secondary">{next ? `Prochaine étape recommandée : ${next.label}.` : "Tout est en place. Continuez à alimenter votre ligne éditoriale et vos rapports."}</p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {next && nextTab && <Link href={`/dashboard/${nextTab.slug}`} className="btn-primary">{next.label} <ArrowRight size={18} /></Link>}
              <Link href="/dashboard/upgrade" className="btn-ghost">Mon palier</Link>
            </div>
          </div>
        </div>
        <ul className="relative mt-8 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((s) => {
            const Icon = TAB_ICONS[s.slug];
            const locked = !hasFeature(plan, s.feature);
            return (
              <li key={s.slug}>
                <Link href={`/dashboard/${s.slug}`} className="group flex items-center gap-3 rounded-2xl border border-white/60 bg-white/80 px-4 py-3 backdrop-blur transition hover:bg-white hover:shadow-card">
                  <span aria-hidden className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${s.done ? "bg-success text-white" : "bg-accent-soft text-accent"}`}>{s.done ? <Check size={18} strokeWidth={3} /> : <Icon size={18} strokeWidth={1.9} />}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-[15px] font-medium">{s.label}</span><span className="caption">{locked ? "Palier Pro" : s.done ? "Terminé" : "À faire"}</span></span>
                  <ChevronRight size={16} className="text-ink-secondary transition group-hover:translate-x-0.5" />
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="grid gap-6 md:grid-cols-3">
        <Link href="/dashboard/audit" className="card group flex items-center gap-5">
          {typeof score === "number" ? <ScoreRing value={score} size={76} stroke={8} /> : <span className="flex h-[76px] w-[76px] items-center justify-center rounded-full bg-canvas text-ink-secondary"><ScanSearch size={28} strokeWidth={1.6} /></span>}
          <div className="min-w-0"><p className="caption">Dernier audit</p><p className="mt-0.5 text-[18px] font-semibold leading-snug">{typeof score === "number" ? `Score de ${Math.round(score)}/100` : "Aucun audit"}</p><p className="caption mt-1">{audit.data ? dateLabel(audit.data.created_at) : "Lancez votre premier audit"}</p></div>
        </Link>
        <Link href="/dashboard/editorial" className="card group flex items-center gap-5">
          <span className="flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent"><CalendarDays size={30} strokeWidth={1.6} /></span>
          <div className="min-w-0"><p className="caption">Ligne éditoriale</p><p className="num mt-0.5 text-[18px] font-semibold leading-snug">{entries.length ? `${weeksDone} / ${entries.length} semaines` : "Pas encore planifiée"}</p><p className="caption mt-1">{(lines.data ?? []).length ? `${(lines.data ?? []).length} canal(aux)` : "Ajoutez un canal"}</p></div>
        </Link>
        <Link href="/dashboard/kpi" className="card group flex items-center gap-5">
          <span className={`flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-full ${kpiState === "late" ? "bg-danger/15 text-danger" : kpiState === "submitted" ? "bg-success/15 text-success" : "bg-warning/20 text-ink"}`}>{kpiState === "submitted" ? <Check size={30} strokeWidth={2.4} /> : <Sparkles size={28} strokeWidth={1.6} />}</span>
          <div className="min-w-0"><p className="caption">Rapport de {monthLabel(month)}</p><p className="mt-0.5 text-[18px] font-semibold leading-snug">{kpiState === "submitted" ? "Envoyé" : kpiState === "late" ? "En retard" : "À soumettre"}</p><p className="caption mt-1">{kpiState === "submitted" ? "Merci, c’est enregistré" : `Échéance le ${dateLabel(deadline)}`}</p></div>
        </Link>
      </div>

      {hasFeature(plan, "lives") && (
        <Link href="/dashboard/lives" className="card flex items-center gap-5">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-night text-white"><Radio size={24} strokeWidth={1.8} /></span>
          <div className="min-w-0 flex-1"><p className="text-[18px] font-semibold">Guide Lives</p><p className="text-[15px] text-ink-secondary">{(guides.count ?? 0) > 0 ? `${guides.count} guide(s) de live prêt(s)` : "Préparez votre prochain live : trame, équipe et scripts."}</p></div>
          <ChevronRight className="text-ink-secondary" />
        </Link>
      )}
    </div>
  );
}
