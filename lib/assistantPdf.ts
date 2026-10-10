import { jsPDF } from "jspdf";
import { pdfText } from "./brandGuidePdf";
import { accentFrom } from "./theme";

export type DocSection = { heading: string; body: string };
export type DocInput = { brandName: string; color?: string | null; kind: string; title: string; summary?: string; sections: DocSection[]; actions?: string[]; footer?: string; watermark?: boolean; date?: string };

const INK: [number, number, number] = [29, 29, 31];
const MUTED: [number, number, number] = [110, 110, 115];
const MARGIN = 20;

export function docFileName(brandName: string, kind: string): string {
  const clean = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "");
  return `${clean(kind) || "Document"}_${clean(brandName) || "Marque"}.pdf`;
}

/** PDF sobre : bandeau de couleur de la marque, titre, résumé, sections, actions. Texte brut uniquement. */
export function buildDocPdf({ brandName, color, kind, title, summary, sections, actions = [], footer = "Markodience", watermark = false, date }: DocInput): jsPDF {
  const ACCENT = accentFrom(color).map(Math.round) as [number, number, number];
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const width = pageW - 2 * MARGIN;
  const today = date ?? new Date().toISOString().slice(0, 10);

  doc.setFillColor(...ACCENT).rect(0, 0, pageW, 46, "F");
  doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(255, 255, 255).text(pdfText(`${kind} - ${brandName}`).toUpperCase(), MARGIN, 18);
  doc.setFont("helvetica", "bold").setFontSize(20);
  const head = doc.splitTextToSize(pdfText(title), width) as string[];
  doc.text(head.slice(0, 2), MARGIN, 30);
  doc.setFont("helvetica", "normal").setFontSize(9).text(`Édité le ${today.split("-").reverse().join("/")}`, MARGIN, 42);

  let y = 60;
  const ensure = (h: number) => { if (y + h > pageH - 22) { doc.addPage(); y = MARGIN; } };
  const para = (t: string, o: { size?: number; bold?: boolean; color?: [number, number, number]; indent?: number } = {}) => {
    const size = o.size ?? 10.5;
    doc.setFont("helvetica", o.bold ? "bold" : "normal").setFontSize(size).setTextColor(...(o.color ?? INK));
    for (const l of doc.splitTextToSize(pdfText(t), width - (o.indent ?? 0)) as string[]) { ensure(size * 0.45 + 1); doc.text(l, MARGIN + (o.indent ?? 0), y); y += size * 0.45; }
    y += 2.5;
  };
  const heading = (t: string) => { ensure(16); doc.setFont("helvetica", "bold").setFontSize(13).setTextColor(...ACCENT).text(pdfText(t), MARGIN, y); y += 7; };

  if (summary) { para(summary, { size: 11.5, bold: true }); y += 3; }
  for (const s of sections) { heading(s.heading); para(s.body); y += 2; }
  if (actions.length) { heading("Actions"); actions.forEach((a) => para(`-  ${a}`, { indent: 3 })); }

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(...MUTED);
    doc.text(pdfText(footer), MARGIN, pageH - 10);
    doc.text(`${i} / ${pages}`, pageW - MARGIN, pageH - 10, { align: "right" });
    if (watermark) { doc.setFontSize(40).setTextColor(235, 235, 238); doc.text("Markodience", pageW / 2, pageH / 2, { align: "center", angle: 35 }); }
  }
  return doc;
}
