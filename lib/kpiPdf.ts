import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { dateLabel, formatNumber, monthLabel, type KpiData } from "./kpi";
import { accentFrom } from "./theme";

export type KpiPdfInput = {
  brandName: string;
  month: string; // YYYY-MM-01
  data: KpiData;
  exportDate?: string; // YYYY-MM-DD
  watermark?: boolean; // palier Gratuit
  color?: string | null; // couleur principale de la marque (en-tête et tableau)
  customIndicators?: { key: string; label: string; unit: string }[]; // indicateurs personnalisés des objectifs
  footer?: string; // nom au pied de page (marque blanche : nom de l'agence, vide = rien)
};

const INK: [number, number, number] = [29, 29, 31];
const MUTED: [number, number, number] = [110, 110, 115];
const ROW_ALT: [number, number, number] = [245, 245, 247];
const MARGIN = 20;

export function kpiFileName(brandName: string, month: string): string {
  const clean = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "");
  const [moisNom, annee] = monthLabel(month).split(" ");
  const mois = moisNom.charAt(0).toUpperCase() + moisNom.slice(1);
  return `KPI_${clean(brandName) || "Marque"}_${clean(mois)}${annee}.pdf`;
}

export function buildKpiPdf({ brandName, month, data, exportDate, watermark = false, color, customIndicators = [], footer = "Markodience" }: KpiPdfInput): jsPDF {
  const ACCENT = accentFrom(color).map(Math.round) as [number, number, number];
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const today = exportDate ?? new Date().toISOString().slice(0, 10);

  doc.setFont("helvetica", "bold").setFontSize(16).setTextColor(...INK);
  doc.text(brandName, MARGIN, MARGIN + 4);
  doc.setFont("helvetica", "bold").setFontSize(11);
  doc.text(`RAPPORT KPI - ${monthLabel(month)}`, pageW - MARGIN, MARGIN + 2, { align: "right" });
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(...MUTED);
  doc.text(`Exporté le ${dateLabel(today)}`, pageW - MARGIN, MARGIN + 8, { align: "right" });

  doc.setDrawColor(...ACCENT).setLineWidth(0.6);
  doc.line(MARGIN, MARGIN + 12, pageW - MARGIN, MARGIN + 12);

  autoTable(doc, {
    startY: MARGIN + 18,
    margin: { left: MARGIN, right: MARGIN, bottom: 25 },
    head: [["Indicateur", "Valeur"]],
    body: [
      ["Portée totale", formatNumber(data.reach)],
      ["Engagement total (likes + commentaires + partages)", formatNumber(data.engagement)],
      ["Nouveaux abonnés", formatNumber(data.new_followers)],
      ["Publications réalisées / planifiées", `${formatNumber(data.posts_done)} / ${formatNumber(data.posts_planned)}`],
      ...customIndicators.map((c): [string, string] => [c.unit ? `${c.label} (${c.unit})` : c.label, formatNumber(data.custom?.[c.key] ?? 0)]),
    ],
    styles: { font: "helvetica", fontSize: 10, textColor: INK, cellPadding: 3 },
    headStyles: { fillColor: ACCENT, textColor: 255, fontStyle: "bold" },
    bodyStyles: { fillColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: ROW_ALT },
    columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
  });

  let y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  const section = (title: string, text: string) => {
    const lines = doc.setFont("helvetica", "normal").setFontSize(10).splitTextToSize(text || "Non renseigné.", pageW - 2 * MARGIN) as string[];
    if (y + 8 + lines.length * 5 > pageH - 25) {
      doc.addPage();
      y = MARGIN;
    }
    doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(...INK);
    doc.text(title, MARGIN, y);
    doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(...INK);
    doc.text(lines, MARGIN, y + 6);
    y += 6 + lines.length * 5 + 8;
  };
  section("Meilleur contenu du mois", data.best_content);
  section("Observations", data.notes);

  // Pied de page (et filigrane du palier Gratuit) sur chaque page
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setDrawColor(210, 210, 215).setLineWidth(0.2);
    doc.line(MARGIN, pageH - 18, pageW - MARGIN, pageH - 18);
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(...MUTED);
    doc.text(brandName, MARGIN, pageH - 12);
    if (footer) doc.text(footer, pageW / 2, pageH - 12, { align: "center" });
    doc.text(`Page ${p} / ${total}`, pageW - MARGIN, pageH - 12, { align: "right" });
    if (watermark) {
      doc.setFontSize(8).setTextColor(160, 160, 165);
      doc.text("Généré avec Markodience - version gratuite", pageW / 2, pageH - 7, { align: "center" });
    }
  }
  return doc;
}
