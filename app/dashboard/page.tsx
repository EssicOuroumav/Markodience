import Link from "next/link";
import { ArrowRight, Check, ChevronRight, ExternalLink, Globe, Lock, Pencil, Sparkles } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import JourneyRestore from "@/components/JourneyRestore";
import ScoreRing from "@/components/ScoreRing";
import { getDashboardContext } from "@/lib/brand";
import { hasBrandInfo } from "@/lib/brandInfo";
import { dateLabel, monthLabel } from "@/lib/kpi";
import { getOverview } from "@/lib/overview";
import { journeyComplete, journeySteps } from "@/lib/journey";
import { hasFeature } from "@/lib/plans";
import { getBrandProgress } from "@/lib/progress";
import { POST_STATUS_LABEL, type PostStatus } from "@/lib/posts";
import { TABS, TAB_GROUP, TAB_GROUPS, type TabSlug } from "@/lib/tabs";
import { TAB_ICONS } from "@/lib/tabIcons";

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

export default async function DashboardHome() {
  const { active, plan, user, owner } = await getDashboardContext();
  const [pr, ov] = await Promise.all([getBrandProgress(), getOverview()]);
  const { percent, next, auditScore, entries, weeksDone, channels, guides, kpiState, kpiDeadline, month } = pr;
  const dismissed = Array.isArray(user.user_metadata?.journey_dismissed) ? (user.user_metadata.journey_dismissed as string[]) : [];
  const guideHidden = dismissed.includes(active.id) && !journeyComplete(journeySteps(plan, { ...pr.done, kpi: pr.kpiEver }));
  const nextTab = next ? TABS.find((t) => t.slug === next.slug) : null;
  const firstName = ((user.user_metadata?.full_name as string | undefined) ?? "").split(" ")[0];
  const info = ov.info;
  const intro = info.about || ov.mission;

  // Une ligne par onglet : ce qu'il contient en ce moment, d'un coup d'œil.
  const status: Record<TabSlug, { headline: string; sub: string }> = {
    plan: { headline: ov.planBuilt ? "Plan en place" : "À construire", sub: ov.planBuilt ? "Identité, calendrier, règles et indicateurs" : "Décrivez votre organisation : l'IA bâtit le plan" },
    identity: { headline: ov.hasIdentity ? "Identité définie" : "À définir", sub: ov.mission ? ov.mission.slice(0, 90) : "Mission, valeurs, cibles et objectifs" },
    personas: { headline: ov.personas.length ? plural(ov.personas.length, "cible", "cibles") : "Aucune cible", sub: ov.personas.length ? ov.personas.slice(0, 3).map((p) => p.name).join(" · ") : "Besoins, freins, ton, leviers" },
    ideas: { headline: ov.ideas.total ? plural(ov.ideas.total, "idée", "idées") : "Banque vide", sub: ov.ideas.total ? `${ov.ideas.toSort} à trier · ${ov.ideas.kept} retenue${ov.ideas.kept > 1 ? "s" : ""}` : "Idées brutes, veille, benchmarks" },
    charter: { headline: pr.done.charter ? "Charte prête" : "À compléter", sub: "Couleurs, typographie, logo, visuels" },
    pillars: { headline: ov.pillars.length ? plural(ov.pillars.length, "pilier", "piliers") : "Aucun pilier", sub: ov.pillars.length ? ov.pillars.slice(0, 3).map((p) => (p.pct != null ? `${p.name} ${p.pct} %` : p.name)).join(" · ") : "Les grands thèmes de vos publications" },
    tone: { headline: pr.done.tone ? "Voix définie" : "À définir", sub: "Ce qu'on dit, ce qu'on évite" },
    organic: { headline: ov.organic ? `${ov.organicDone} / ${ov.organic} actions` : "Non construite", sub: "Leviers de portée sans publicité" },
    rules: { headline: ov.rules ? plural(ov.rules, "section remplie", "sections remplies") : "Aucune règle", sub: "Règles de travail de la marque" },
    editorial: { headline: entries ? `${weeksDone} / ${entries} semaines` : "Pas planifiée", sub: channels ? plural(channels, "canal", "canaux") : "Ajoutez un canal" },
    posts: { headline: plural(ov.posts.draft + ov.posts.ready + ov.posts.published, "publication", "publications"), sub: `${ov.posts.draft} brouillon · ${ov.posts.ready} prêt · ${ov.posts.published} publié` },
    library: { headline: ov.assets ? plural(ov.assets, "fichier", "fichiers") : "Vide", sub: "Logos, photos, visuels, documents" },
    lives: { headline: guides ? plural(guides, "guide", "guides") : "Aucun guide", sub: "Trame, équipe, scripts" },
    audit: { headline: typeof auditScore === "number" ? `Score ${Math.round(auditScore)}/100` : "Aucun audit", sub: "État de la marque et évolution" },
    kpi: { headline: kpiState === "submitted" ? "Rapport envoyé" : kpiState === "late" ? "Rapport en retard" : "Rapport à soumettre", sub: `${monthLabel(month)} · échéance ${dateLabel(kpiDeadline)}` },
  };

  return (
    <div className="rise space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Vue d’ensemble</p>
          <h1 className="mt-1 text-[32px] leading-tight tracking-[-0.03em]">{firstName ? `Bonjour ${firstName},` : "Bonjour,"} <span className="text-ink-secondary">voici {active.name}.</span></h1>
        </div>
        {guideHidden && <JourneyRestore brandId={active.id} dismissed={dismissed} />}
      </header>

      <section className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <article className="card-flat relative overflow-hidden">
          <span aria-hidden className="absolute inset-x-0 top-0 h-1.5" style={{ background: `linear-gradient(90deg, ${active.primary_color ?? "var(--color-accent)"}, transparent)` }} />
          <div className="flex flex-wrap items-start gap-5">
            <BrandLogo src={active.logo_url} name={active.name} color={active.primary_color} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[26px] leading-tight tracking-heading">{active.name}</h2>
                <span className="rounded-pill bg-accent-soft px-2.5 py-0.5 text-[12px] font-semibold text-accent">{active.status === "organisation" ? "Organisation" : "Freelance"}</span>
              </div>
              <p className="caption mt-0.5">{active.sector ?? "Secteur non renseigné"}</p>
              {intro ? <p className="mt-3 max-w-3xl text-[16px] leading-relaxed">{intro}</p> : <p className="mt-3 max-w-3xl text-[15px] text-ink-secondary">Ajoutez en deux phrases qui vous êtes : cela guide l&apos;IA et sert de carte de visite à votre espace.</p>}
            </div>
            <Link href={`/dashboard/brands/${active.id}`} className="btn-secondary !py-1.5"><Pencil size={15} />Modifier la fiche</Link>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2 border-t hairline pt-4">
            {hasBrandInfo(info) ? (
              <>
                {info.website && <a href={info.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-pill bg-canvas px-3 py-1.5 text-[14px] font-medium hover:bg-black/5"><Globe size={14} />Site web</a>}
                {Object.entries(info.socials).map(([n, url]) => <a key={n} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-pill bg-canvas px-3 py-1.5 text-[14px] font-medium hover:bg-black/5">{n}<ExternalLink size={12} className="text-ink-secondary" /></a>)}
                {info.links.map((l) => <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-pill bg-canvas px-3 py-1.5 text-[14px] font-medium hover:bg-black/5">{l.label}<ExternalLink size={12} className="text-ink-secondary" /></a>)}
              </>
            ) : (
              <Link href={`/dashboard/brands/${active.id}`} className="text-[14px] text-accent">Ajouter le site web, les réseaux sociaux et les documents de la marque →</Link>
            )}
            <span className="ml-auto inline-flex items-center gap-2 text-[13px] text-ink-secondary"><span aria-hidden className="h-4 w-4 rounded-full border border-black/10" style={{ background: active.primary_color ?? "var(--color-accent)" }} />Couleur de la marque</span>
          </div>
        </article>

        <article className="card-flat relative overflow-hidden">
          <div aria-hidden className="mesh absolute inset-0 opacity-60" />
          <div className="relative flex items-center gap-5">
            <ScoreRing value={percent} size={104} stroke={10} label={`Stratégie complète à ${percent} %`} />
            <div>
              <h2 className="text-[20px] leading-snug tracking-heading">{percent === 100 ? "Stratégie complète" : `Stratégie à ${percent} %`}</h2>
              <p className="mt-1 text-[15px] text-ink-secondary">{next ? `Prochaine étape : ${next.label}.` : "Tout est en place."}</p>
              {next && nextTab && <Link href={`/dashboard/${nextTab.slug}`} className="btn-primary mt-3 !py-2">{next.label} <ArrowRight size={16} /></Link>}
            </div>
          </div>
          <Link href="/dashboard/plan" className="relative mt-5 flex items-center gap-3 rounded-2xl border border-white/70 bg-white/80 px-4 py-3 transition hover:bg-white hover:shadow-card">
            <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white"><Sparkles size={17} /></span>
            <span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold">{ov.planBuilt ? "Mettre à jour le plan avec l'IA" : "Construire mon plan avec l'IA"}</span><span className="caption">Diagnostic, stratégie, calendrier, règles</span></span>
            <ChevronRight size={16} className="text-ink-secondary" />
          </Link>
        </article>
      </section>

      {TAB_GROUPS.map((g) => (
        <section key={g.id}>
          <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.12em] text-ink-secondary">{g.label}</h2>
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {TABS.filter((t) => TAB_GROUP[t.slug] === g.id).map((t) => {
              const Icon = TAB_ICONS[t.slug];
              const locked = !hasFeature(plan, t.feature);
              const done = !!pr.done[t.slug] && !locked;
              const st = status[t.slug];
              return (
                <li key={t.slug}>
                  <Link href={`/dashboard/${t.slug}`} className="card group flex h-full flex-col">
                    <div className="flex items-center justify-between">
                      <span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent"><Icon size={20} strokeWidth={1.8} /></span>
                      {locked ? <span className="inline-flex items-center gap-1 rounded-pill bg-black/[0.05] px-2 py-0.5 text-[11px] font-semibold uppercase text-ink-secondary"><Lock size={11} />Pro</span> : done ? <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success text-white"><Check size={13} strokeWidth={3.5} /></span> : null}
                    </div>
                    <p className="mt-3 text-[13px] font-medium text-ink-secondary">{t.label}</p>
                    <p className="mt-0.5 text-[19px] font-semibold leading-snug tracking-heading">{locked ? "Palier Pro" : st.headline}</p>
                    <p className="mt-1 line-clamp-2 text-[14px] text-ink-secondary">{locked ? t.description : st.sub}</p>
                    <span className="mt-auto pt-3 text-[14px] font-medium text-accent transition group-hover:translate-x-0.5">Ouvrir →</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <section className="card-flat">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="section-title">Prochaines publications</h2>
          <Link href="/dashboard/posts" className="text-[14px] font-medium text-accent">Voir le calendrier →</Link>
        </div>
        {ov.upcoming.length === 0 ? (
          <p className="mt-3 text-[15px] text-ink-secondary">Aucune publication à venir. Construisez le plan, ou ajoutez-en depuis l&apos;onglet Publications.</p>
        ) : (
          <ul className="mt-3 divide-y hairline">
            {ov.upcoming.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 py-2.5 text-[15px]">
                <span className="num w-[92px] shrink-0 font-semibold">{p.scheduled_date ? dateLabel(p.scheduled_date) : "—"}</span>
                {p.channel && <span className="rounded-pill bg-accent-soft px-2.5 py-0.5 text-[12px] font-medium text-accent">{p.channel}</span>}
                <span className="min-w-0 flex-1 truncate text-ink-secondary">{p.text || "Sans texte"}</span>
                <span className="rounded-pill bg-black/[0.06] px-2.5 py-0.5 text-[12px] font-medium">{POST_STATUS_LABEL[p.status as PostStatus] ?? p.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      {owner && <p className="caption">Mode propriétaire : aucun quota, tous les onglets ouverts.</p>}
    </div>
  );
}
