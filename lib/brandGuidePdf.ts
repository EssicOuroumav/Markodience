import { jsPDF } from "jspdf";
import { parseFoundations, parseVisualGuide } from "./identity";
import { normalizeObjectives } from "./objectives";
import { accentFrom, parseHex } from "./theme";

export type BrandGuideInput = {
  brandName: string;
  color?: string | null;
  identity: {
    positioning?: string | null;
    target_segments?: unknown;
    visual_palette?: unknown;
    marketing_objectives?: unknown;
    foundations?: unknown;
    visual_guide?: unknown;
  } | null;
  pillars?: { name: string | null; description: string | null; examples?: unknown }[];
  tone?: { do_list?: unknown; dont_list?: unknown } | null;
  exportDate?: string; // YYYY-MM-DD
  watermark?: boolean;
};

const INK: [number, number, number] = [29, 29, 31];
const MUTED: [number, number, number] = [110, 110, 115];
const MARGIN = 20;

export function brandGuideFileName(brandName: string): string {
  const clean = brandName.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "");
  return `GuideDeMarque_${clean || "Marque"}.pdf`;
}

/** Le PDF utilise Helvetica (jeu Windows-1252) : on remplace ce qu'elle ne sait pas dessiner. */
export function pdfText(v: unknown): string {
  return String(v ?? "")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, "...")
    .replace(/[–—]/g, "-")
    .replace(/ | /g, " ")
    .replace(/[^\x09\x0A\x0D\x20-\x7E¡-ÿŒœ€]/g, "");
}

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.map(pdfText).filter(Boolean) : []);

export function buildBrandGuidePdf({ brandName, color, identity, pillars = [], tone, exportDate, watermark = false }: BrandGuideInput): jsPDF {
  const ACCENT = accentFrom(color).map(Math.round) as [number, number, number];
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const width = pageW - 2 * MARGIN;
  const today = exportDate ?? new Date().toISOString().slice(0, 10);
  const name = pdfText(brandName);

  // Couverture
  doc.setFillColor(...ACCENT).rect(0, 0, pageW, 110, "F");
  doc.setFont("helvetica", "bold").setFontSize(30).setTextColor(255, 255, 255);
  doc.text(doc.splitTextToSize(name, width) as string[], MARGIN, 60);
  doc.setFont("helvetica", "normal").setFontSize(14);
  doc.text("Guide de marque", MARGIN, 90);
  doc.setFontSize(10).setTextColor(...MUTED);
  doc.text(`Édité le ${today.split("-").reverse().join("/")}`, MARGIN, 125);

  let y = MARGIN;
  const newPage = () => { doc.addPage(); y = MARGIN; };
  const ensure = (h: number) => { if (y + h > pageH - 25) newPage(); };
  const title = (t: string) => {
    ensure(20);
    doc.setFont("helvetica", "bold").setFontSize(15).setTextColor(...ACCENT).text(pdfText(t), MARGIN, y);
    doc.setDrawColor(...ACCENT).setLineWidth(0.5).line(MARGIN, y + 2.5, pageW - MARGIN, y + 2.5);
    y += 11;
  };
  const label = (t: string) => {
    ensure(14);
    doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(...MUTED).text(pdfText(t).toUpperCase(), MARGIN, y);
    y += 5;
  };
  const para = (t: string, opts: { size?: number; bold?: boolean; indent?: number; color?: [number, number, number] } = {}) => {
    const size = opts.size ?? 10.5;
    const indent = opts.indent ?? 0;
    doc.setFont("helvetica", opts.bold ? "bold" : "normal").setFontSize(size).setTextColor(...(opts.color ?? INK));
    const lines = doc.splitTextToSize(pdfText(t), width - indent) as string[];
    const lh = size * 0.45;
    for (const l of lines) { ensure(lh + 1); doc.text(l, MARGIN + indent, y); y += lh; }
    y += 2.5;
  };
  const bullets = (items: string[]) => items.forEach((i) => para(`-  ${i}`, { indent: 3 }));

  newPage();

  const foundations = parseFoundations(identity?.foundations);
  if (identity?.positioning || foundations) {
    title("Identité de marque");
    if (identity?.positioning) { label("Positionnement"); para(identity.positioning); }
    if (foundations) {
      label("Mission"); para(foundations.mission);
      label("Vision"); para(foundations.vision);
      if (foundations.promise) { label("Promesse"); para(foundations.promise); }
      if (foundations.slogan) { label("Slogan"); para(foundations.slogan, { bold: true, size: 12 }); }
      if (foundations.key_message) { label("Message clé"); para(foundations.key_message); }
      label("Valeurs");
      foundations.values.forEach((v) => para(`${v.name}${v.description ? " : " + v.description : ""}`, { indent: 3 }));
    }
    y += 4;
  }

  const segments = Array.isArray(identity?.target_segments) ? (identity?.target_segments as Record<string, string>[]) : [];
  if (segments.length) {
    title("Cibles prioritaires");
    segments.forEach((s) => {
      para(s.name, { bold: true, size: 11.5 });
      para(s.description);
      if (s.need) para(`Besoin : ${s.need}`, { color: MUTED });
      for (const [k, l] of [["barriers", "Freins"], ["channels", "Où le toucher"], ["language", "Langue et registre"], ["best_time", "Meilleur moment"]] as const) {
        if (s[k]) para(`${l} : ${s[k]}`, { color: MUTED, indent: 3 });
      }
    });
    y += 4;
  }

  const objectives = normalizeObjectives(identity?.marketing_objectives);
  if (objectives.length) {
    title("Objectifs marketing");
    bullets(objectives.map((o) => o.text));
    y += 4;
  }

  const guide = parseVisualGuide(identity?.visual_guide);
  const palette = Array.isArray(identity?.visual_palette) ? (identity?.visual_palette as { color: string; usage: string }[]) : [];
  if (palette.length || guide) {
    newPage();
    title("Charte graphique");
    if (palette.length) {
      label("Couleurs");
      palette.forEach((c) => {
        ensure(14);
        const rgb = parseHex(c.color) ?? [200, 200, 200];
        doc.setFillColor(...rgb).setDrawColor(210, 210, 215).roundedRect(MARGIN, y - 4, 10, 10, 2, 2, "FD");
        doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(...INK).text(pdfText(c.color).toUpperCase(), MARGIN + 14, y + 1);
        doc.setFont("helvetica", "normal").setTextColor(...MUTED);
        const lines = doc.splitTextToSize(pdfText(c.usage), width - 42) as string[];
        doc.text(lines, MARGIN + 42, y + 1);
        y += Math.max(12, lines.length * 4.5 + 4);
      });
      y += 3;
    }
    if (guide) {
      label("Typographie");
      para(`Titres : ${guide.typography.heading.font}${guide.typography.heading.usage ? " - " + guide.typography.heading.usage : ""}`, { indent: 3 });
      para(`Textes : ${guide.typography.body.font}${guide.typography.body.usage ? " - " + guide.typography.body.usage : ""}`, { indent: 3 });
      y += 2;
      label("Règles d'usage du logo");
      bullets(guide.logo_rules);
      y += 2;
      label("Style de visuels");
      para(guide.imagery_style);
    }
    y += 4;
  }

  if (pillars.length) {
    title("Piliers de contenu");
    pillars.forEach((p) => {
      para(p.name ?? "", { bold: true, size: 11.5 });
      if (p.description) para(p.description);
      const ex = strings(p.examples);
      if (ex.length) para(`Exemples : ${ex.join(" ; ")}`, { color: MUTED, indent: 3 });
    });
    y += 4;
  }

  const doList = strings(tone?.do_list);
  const dontList = strings(tone?.dont_list);
  if (doList.length || dontList.length) {
    title("Tonalité et voix");
    if (doList.length) { label("On dit / On fait"); bullets(doList); }
    if (dontList.length) { label("On évite / On ne fait pas"); bullets(dontList); }
  }

  const total = doc.getNumberOfPages();
  for (let p = 2; p <= total; p++) {
    doc.setPage(p);
    doc.setDrawColor(210, 210, 215).setLineWidth(0.2).line(MARGIN, pageH - 18, pageW - MARGIN, pageH - 18);
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(...MUTED);
    doc.text(name, MARGIN, pageH - 12);
    doc.text("Markodience", pageW / 2, pageH - 12, { align: "center" });
    doc.text(`Page ${p} / ${total}`, pageW - MARGIN, pageH - 12, { align: "right" });
    if (watermark) doc.setTextColor(160, 160, 165).text("Genere avec Markodience - version gratuite", pageW / 2, pageH - 7, { align: "center" });
  }
  return doc;
}
