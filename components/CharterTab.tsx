"use client";

import { FileDown, Image as ImageIcon, Palette, Plus, ShieldCheck, Type, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { IdentityExtendOutput, VisualGuide } from "@/lib/identity";
import BrandLogo from "./BrandLogo";
import EditableText from "./EditableText";
import EmptyState from "./EmptyState";
import ExtendIdentity from "./ExtendIdentity";
import PageHeader from "./PageHeader";
import SaveIndicator, { type SaveState } from "./SaveIndicator";
import { notifyProgress } from "@/lib/progressEvents";

type Color = { color: string; usage: string };

function Card({ Icon, title, children, className = "" }: { Icon: typeof Palette; title: string; children: React.ReactNode; className?: string }) {
  return (
    <article className={`card-flat ${className}`}>
      <div className="flex items-center gap-3"><span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent"><Icon size={19} strokeWidth={1.8} /></span><h2 className="section-title">{title}</h2></div>
      <div className="mt-4">{children}</div>
    </article>
  );
}

export default function CharterTab({ brandId, brandName, brandColor, logoUrl, hasIdentity, palette: initialPalette, guide: initialGuide, watermark, footer, embedded = false }: {
  embedded?: boolean; brandId: string; brandName: string; brandColor: string | null; logoUrl: string | null; hasIdentity: boolean; palette: Color[]; guide: VisualGuide | null; watermark: boolean; footer?: string;
}) {
  const supabase = createClient();
  const [palette, setPalette] = useState<Color[]>(initialPalette);
  const [guide, setGuide] = useState<VisualGuide | null>(initialGuide);
  const [save, setSave] = useState<SaveState>("idle");
  const [exporting, setExporting] = useState(false);

  async function persist(patch: { visual_palette?: Color[]; visual_guide?: VisualGuide }) {
    setSave("saving");
    const { error } = await supabase.from("brand_identity").update(patch).eq("brand_profile_id", brandId);
    setSave(error ? "error" : "saved");
  }
  const saveGuide = (next: VisualGuide) => { setGuide(next); void persist({ visual_guide: next }); };
  const savePalette = (next: Color[]) => { setPalette(next); void persist({ visual_palette: next }); };

  async function exportGuide() {
    setExporting(true);
    try {
      const [{ data: id }, { data: pillars }, { data: tone }] = await Promise.all([
        supabase.from("brand_identity").select("positioning, target_segments, visual_palette, marketing_objectives, foundations, visual_guide").eq("brand_profile_id", brandId).maybeSingle(),
        supabase.from("content_pillars").select("name, description, examples").eq("brand_profile_id", brandId),
        supabase.from("tone_voice").select("do_list, dont_list").eq("brand_profile_id", brandId).maybeSingle(),
      ]);
      const { buildBrandGuidePdf, brandGuideFileName } = await import("@/lib/brandGuidePdf");
      buildBrandGuidePdf({ brandName, color: brandColor, identity: id, pillars: pillars ?? [], tone, watermark, footer }).save(brandGuideFileName(brandName));
    } finally {
      setExporting(false);
    }
  }

  // Intégrée à la page Identité : cette page propose déjà de créer l'identité et sa charte, on n'affiche rien tant qu'elles manquent.
  if (embedded && (!hasIdentity || !guide)) return null;

  if (!hasIdentity) {
    return (
      <section>
        <PageHeader tab="charter" />
        <EmptyState illustration="identity" title="Commencez par votre identité de marque" text="La charte graphique s'appuie sur votre positionnement : générez d'abord votre identité.">
          <Link href="/dashboard/identity" className="btn-primary">Aller à l&apos;identité de marque</Link>
        </EmptyState>
      </section>
    );
  }

  if (!guide) {
    return (
      <section>
        <PageHeader tab="charter" />
        <ExtendIdentity brandId={brandId} what="Typographie, règles d'usage du logo et style de visuels sont ajoutés à votre identité." onDone={(d: IdentityExtendOutput) => { setGuide(d.visual_guide); notifyProgress(); }} />
      </section>
    );
  }

  const setType = (k: "heading" | "body", f: "font" | "usage") => (v: string) => saveGuide({ ...guide, typography: { ...guide.typography, [k]: { ...guide.typography[k], [f]: v } } });

  return (
    <section className="rise">
      {(() => {
        const actions = (<><SaveIndicator state={save} /><button type="button" className="btn-primary" onClick={exportGuide} disabled={exporting}><FileDown size={17} />{exporting ? "Préparation…" : "Guide de marque (PDF)"}</button></>);
        return embedded ? (
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-[24px] leading-tight">Charte graphique</h2><p className="mt-1 text-[15px] text-ink-secondary">Couleurs, typographie, règles du logo et style de visuels.</p></div><div className="flex items-center gap-3">{actions}</div></div>
        ) : <PageHeader tab="charter">{actions}</PageHeader>;
      })()}
      <p className={`caption mb-2 ${embedded ? "mt-2" : "-mt-4"}`}>Cliquez sur un texte pour le modifier : les changements sont enregistrés automatiquement. {watermark && "Le PDF du palier Gratuit porte un filigrane."}</p>
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
        <Card Icon={Palette} title="Couleurs de la marque">
          <div className="space-y-3">
            {palette.map((c, i) => (
              <div key={i} className="flex items-start gap-3">
                <input type="color" aria-label={`Couleur ${i + 1}`} value={/^#[0-9a-fA-F]{6}$/.test(c.color) ? c.color : "#000000"}
                  onChange={(e) => setPalette(palette.map((x, j) => (j === i ? { ...x, color: e.target.value } : x)))}
                  onBlur={() => savePalette(palette)}
                  className="mt-1 h-11 w-11 shrink-0 cursor-pointer rounded-xl border border-black/10 bg-white p-1 shadow-card" />
                <div className="min-w-0 flex-1">
                  <p className="caption px-2">{c.color.toUpperCase()}</p>
                  <EditableText multiline label={`Usage de la couleur ${i + 1}`} className="text-[15px]" value={c.usage} onSave={(v) => savePalette(palette.map((x, j) => (j === i ? { ...x, usage: v } : x)))} />
                </div>
              </div>
            ))}
          </div>
          <p className="caption mt-3">Proposition de départ : vous restez libre de la modifier.</p>
        </Card>

        <Card Icon={Type} title="Typographie">
          <div className="space-y-4">
            {([["heading", "Titres"], ["body", "Textes"]] as const).map(([k, label]) => (
              <div key={k} className="rounded-xl bg-canvas p-3">
                <p className="caption font-semibold uppercase tracking-[0.1em]">{label}</p>
                <EditableText label={`Police des ${label.toLowerCase()}`} className="text-[20px] font-semibold" value={guide.typography[k].font} onSave={setType(k, "font")} />
                <EditableText multiline label={`Usage de la police des ${label.toLowerCase()}`} className="text-[15px] text-ink-secondary" value={guide.typography[k].usage} onSave={setType(k, "usage")} />
              </div>
            ))}
          </div>
        </Card>

        <Card Icon={ShieldCheck} title="Règles d'usage du logo">
          <div className="mb-4 flex items-center gap-4 rounded-xl bg-canvas p-4"><BrandLogo src={logoUrl} name={brandName} color={brandColor} size="lg" /><p className="text-[14px] text-ink-secondary">Le logo téléversé dans les paramètres de la marque. Ces règles s&apos;appliquent à toutes ses versions.</p></div>
          <ul className="space-y-1">
            {guide.logo_rules.map((r, i) => (
              <li key={i} className="flex items-start gap-1">
                <div className="min-w-0 flex-1"><EditableText multiline label={`Règle du logo ${i + 1}`} className="text-[15px]" value={r} onSave={(v) => saveGuide({ ...guide, logo_rules: guide.logo_rules.map((x, j) => (j === i ? v : x)).filter((x) => x.trim()) })} /></div>
                {guide.logo_rules.length > 1 && <button type="button" className="btn-ghost !px-2" aria-label={`Retirer la règle ${i + 1}`} onClick={() => saveGuide({ ...guide, logo_rules: guide.logo_rules.filter((_, j) => j !== i) })}><X size={15} /></button>}
              </li>
            ))}
          </ul>
          {guide.logo_rules.length < 8 && <button type="button" className="btn-ghost mt-2 !px-3 text-accent" onClick={() => saveGuide({ ...guide, logo_rules: [...guide.logo_rules, "Nouvelle règle"] })}><Plus size={16} />Ajouter une règle</button>}
        </Card>

        <Card Icon={ImageIcon} title="Style de visuels">
          <EditableText multiline label="Style de visuels" className="text-[16px] leading-relaxed" value={guide.imagery_style} onSave={(v) => saveGuide({ ...guide, imagery_style: v })} />
        </Card>
      </div>
    </section>
  );
}
