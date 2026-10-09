import type { KpiStage, NetworkStage, RulesStage } from "@/lib/plan/schemas";

/** Blocs de lecture du plan stratégique : mêmes composants dans plusieurs onglets, textes courts, un coup d'œil suffit. */

export type ToneRow = { register: string; do: string; dont: string };

export function ToneSection({ rows, rewrite, logoNote }: { rows: ToneRow[]; rewrite: { avoid: string; follow: string } | null; logoNote: string | null }) {
  return (
    <div className="mt-8 space-y-6">
      <article className="card-flat">
        <h2 className="section-title">Tonalité par registre</h2>
        <p className="mt-1 text-[15px] text-ink-secondary">Ce qu&apos;on fait et ce qu&apos;on proscrit, sujet par sujet.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-[15px]">
            <thead><tr className="caption"><th className="w-1/5 py-2 pr-3">Registre</th><th className="py-2 pr-3">À faire</th><th className="py-2">À proscrire</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.register} className="border-t hairline align-top">
                  <td className="py-2.5 pr-3 font-semibold">{r.register}</td>
                  <td className="py-2.5 pr-3">{r.do}</td>
                  <td className="py-2.5 text-ink-secondary">{r.dont}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
      {rewrite && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-danger/25 bg-danger/5 p-5"><p className="caption font-semibold uppercase">Registre à éviter</p><p className="mt-2 text-[16px] italic">« {rewrite.avoid} »</p></div>
          <div className="rounded-2xl border border-success/30 bg-success/10 p-5"><p className="caption font-semibold uppercase">Registre de la marque</p><p className="mt-2 text-[16px] italic">« {rewrite.follow} »</p></div>
        </div>
      )}
      {logoNote && <div className="rounded-2xl bg-accent-soft/60 p-5 text-[15px]"><span className="font-semibold">Usage du logo.</span> {logoNote}</div>}
    </div>
  );
}

export function NetworkInfo({ profile }: { profile: NetworkStage }) {
  return (
    <div className="mt-6 space-y-4">
      <div>
        <h2 className="text-[22px] leading-tight">{profile.headline}</h2>
        <p className="mt-1 max-w-3xl text-[15px] text-ink-secondary">{profile.lead}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {[["Fréquence", profile.frequency], ["Format prioritaire", profile.format], ["Heure optimale", profile.best_hours]].map(([k, v]) => (
          <div key={k} className="rounded-2xl bg-white p-4 shadow-card"><p className="caption font-semibold uppercase">{k}</p><p className="mt-1 text-[15px] font-medium">{v}</p></div>
        ))}
      </div>
      <details className="card-flat">
        <summary className="cursor-pointer text-[16px] font-semibold">{profile.rules_title}</summary>
        <ul className="mt-3 space-y-2 text-[15px]">{profile.rules.map((r) => <li key={r.label}><span className="font-semibold">{r.label} :</span> {r.text}</li>)}</ul>
      </details>
      <p className="rounded-2xl bg-canvas px-5 py-3 text-[15px]"><span className="font-semibold">Méthode.</span> {profile.method}</p>
    </div>
  );
}

export function NumberedRules({ rules }: { rules: RulesStage["rules"] }) {
  return (
    <article className="card-flat mb-8">
      <h2 className="section-title">Règles non négociables</h2>
      <p className="mt-1 text-[15px] text-ink-secondary">Elles protègent la marque, les personnes et la qualité de la présence en ligne.</p>
      <ol className="mt-4 grid gap-3 md:grid-cols-2">
        {rules.map((r, i) => (
          <li key={r.title} className="rounded-2xl bg-canvas p-4">
            <div className="flex items-center gap-2"><span className="num flex h-7 w-7 items-center justify-center rounded-lg bg-accent-soft text-[13px] font-semibold text-accent">{String(i + 1).padStart(2, "0")}</span><span className="rounded-pill bg-white px-2.5 py-0.5 text-[12px] font-medium text-ink-secondary">{r.tag}</span></div>
            <h3 className="mt-2 text-[16px] font-semibold">{r.title}</h3>
            <p className="mt-1 text-[15px] text-ink-secondary">{r.text}</p>
          </li>
        ))}
      </ol>
    </article>
  );
}

export function KpiPlanTable({ plan }: { plan: KpiStage }) {
  const networks = [...new Set(plan.rows.flatMap((r) => r.by_network.map((n) => n.network)))];
  return (
    <article className="card-flat mb-8">
      <h2 className="section-title">Plan de suivi</h2>
      <p className="mt-1 text-[15px] text-ink-secondary">{plan.intro}</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-[14px]">
          <thead><tr className="caption"><th className="py-2 pr-3">Indicateur</th>{networks.map((n) => <th key={n} className="py-2 pr-3">{n}</th>)}<th className="py-2">Fréquence</th></tr></thead>
          <tbody>
            {plan.rows.map((r) => (
              <tr key={r.indicator} className="border-t hairline align-top">
                <td className="py-2.5 pr-3 font-semibold">{r.indicator}</td>
                {networks.map((n) => <td key={n} className="py-2.5 pr-3 text-ink-secondary">{r.by_network.find((x) => x.network === n)?.target ?? "—"}</td>)}
                <td className="py-2.5">{r.cadence}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {plan.cadences.map((c) => <div key={c.title} className="rounded-2xl bg-canvas p-4"><h3 className="text-[15px] font-semibold">{c.title}</h3><p className="mt-1 text-[14px] text-ink-secondary">{c.text}</p></div>)}
      </div>
    </article>
  );
}
