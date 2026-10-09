/**
 * Faits du calendrier : des dates CALCULÉES, jamais devinées par l'IA.
 * Dates religieuses : calendrier civil saoudien (Umm al-Qura) ; l'observation de la lune peut décaler d'un jour (approx = true).
 */
export type FactKind = "religieux" | "sante" | "national" | "scolaire" | "international";
export type Fact = { date: string; end?: string; label: string; kind: FactKind; approx?: boolean; countries?: string[] };

const hijri = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", { year: "numeric", month: "numeric", day: "numeric", timeZone: "UTC" });
const DAY = 86_400_000;
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

type Hijri = { m: number; d: number };
const hijriOf = (t: number): Hijri => {
  const p = Object.fromEntries(hijri.formatToParts(new Date(t)).map((x) => [x.type, x.value]));
  return { m: Number(p.month), d: Number(p.day) };
};

/** Fêtes mobiles : chaque jour de la période est converti en date hégirienne. */
function religiousFacts(from: string, to: string): Fact[] {
  const out: Fact[] = [];
  let ramadanStart: string | null = null;
  for (let t = Date.parse(from); t <= Date.parse(to); t += DAY) {
    const h = hijriOf(t);
    if (h.m === 9 && h.d === 1) ramadanStart = iso(t);
    if (h.m === 9 && h.d === 29 || (h.m === 9 && h.d === 30)) {
      const next = hijriOf(t + DAY);
      if (next.m === 10 && ramadanStart) {
        out.push({ date: ramadanStart, end: iso(t), label: "Ramadan", kind: "religieux", approx: true });
        ramadanStart = null;
      }
    }
    if (h.m === 10 && h.d === 1) out.push({ date: iso(t), label: "Aïd el-Fitr (fin du Ramadan)", kind: "religieux", approx: true });
    if (h.m === 12 && h.d === 10) out.push({ date: iso(t), label: "Tabaski (Aïd el-Adha)", kind: "religieux", approx: true });
    if (h.m === 3 && h.d === 12) out.push({ date: iso(t), label: "Maouloud (Mawlid)", kind: "religieux", approx: true });
  }
  // Ramadan commencé avant la fenêtre ou non terminé dans la fenêtre : on garde au moins le début.
  if (ramadanStart) out.push({ date: ramadanStart, label: "Début du Ramadan", kind: "religieux", approx: true });
  return out;
}

/** Dates fixes : [mois, jour, jours de durée, libellé, type, pays]. */
const FIXED: { m: number; d: number; days?: number; label: string; kind: FactKind; countries?: string[] }[] = [
  { m: 1, d: 1, label: "Nouvel An", kind: "national" },
  { m: 2, d: 4, label: "Journée mondiale contre le cancer", kind: "sante" },
  { m: 3, d: 8, label: "Journée internationale des droits des femmes", kind: "international" },
  { m: 4, d: 7, label: "Journée mondiale de la santé", kind: "sante" },
  { m: 5, d: 1, label: "Fête du Travail", kind: "national" },
  { m: 5, d: 31, label: "Journée mondiale sans tabac", kind: "sante" },
  { m: 6, d: 14, label: "Journée mondiale du donneur de sang", kind: "sante" },
  { m: 8, d: 7, label: "Fête de l'Indépendance", kind: "national", countries: ["Côte d'Ivoire"] },
  { m: 8, d: 15, label: "Assomption (jour férié)", kind: "national", countries: ["Côte d'Ivoire"] },
  { m: 9, d: 8, label: "Journée internationale de l'alphabétisation", kind: "international" },
  { m: 10, d: 1, days: 31, label: "Octobre Rose (dépistage du cancer du sein)", kind: "sante" },
  { m: 10, d: 5, label: "Journée mondiale des enseignants", kind: "international" },
  { m: 10, d: 16, label: "Journée mondiale de l'alimentation", kind: "international" },
  { m: 11, d: 1, label: "Toussaint (jour férié)", kind: "national", countries: ["Côte d'Ivoire"] },
  { m: 11, d: 14, label: "Journée mondiale du diabète", kind: "sante" },
  { m: 11, d: 20, label: "Journée mondiale de l'enfance", kind: "international" },
  { m: 12, d: 1, label: "Journée mondiale de lutte contre le sida", kind: "sante" },
  { m: 12, d: 7, label: "Journée de la mémoire de F. Houphouët-Boigny (jour férié)", kind: "national", countries: ["Côte d'Ivoire"] },
  { m: 12, d: 25, label: "Noël (jour férié)", kind: "national" },
];

const pad = (n: number) => String(n).padStart(2, "0");

/** Tous les faits connus entre deux dates (incluses), triés. */
export function factsBetween(from: string, to: string, country = "Côte d'Ivoire"): Fact[] {
  const out: Fact[] = [...religiousFacts(from, to)];
  const y0 = Number(from.slice(0, 4));
  const y1 = Number(to.slice(0, 4));
  for (let y = y0; y <= y1; y++) {
    for (const f of FIXED) {
      if (f.countries && !f.countries.includes(country)) continue;
      const date = `${y}-${pad(f.m)}-${pad(f.d)}`;
      const end = f.days ? iso(Date.parse(date) + (f.days - 1) * DAY) : undefined;
      if ((end ?? date) < from || date > to) continue;
      out.push({ date, end, label: f.label, kind: f.kind });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
