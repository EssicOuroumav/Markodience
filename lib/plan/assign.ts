import type { Phase } from "./calendar";
import type { Role } from "./schemas";

/** Rôles de pilier qui conviennent à chaque phase : un teasing appelle à agir, un bilan rend des comptes, etc. */
export const ALLOWED: Record<Phase, Role[]> = {
  avant: ["appel", "communaute", "pedagogie"],
  pendant: ["preuve", "voix", "appel", "pedagogie"],
  apres: ["transparence", "voix", "preuve"],
  evergreen: ["pedagogie", "communaute", "voix", "transparence", "preuve", "appel"],
};

type P = { title: string; pct: number; role: Role };

/**
 * Attribue un pilier à chaque semaine, par le code : la répartition suit les pourcentages annoncés (à une semaine près) et chaque
 * pilier tombe dans une phase qui lui convient. L'IA n'écrit ensuite que le thème : elle n'a plus à « compter ».
 */
export function assignPillars(phases: Phase[], pillars: P[]): string[] {
  const n = phases.length;
  const quota = pillars.map((p) => (p.pct / 100) * n);
  const given = pillars.map(() => 0);
  const candidates = (phase: Phase) => {
    const ok = pillars.map((p, i) => (ALLOWED[phase].includes(p.role) ? i : -1)).filter((i) => i >= 0);
    return ok.length ? ok : pillars.map((_, i) => i);
  };
  const result: number[] = new Array(n).fill(-1);
  // Les semaines les plus contraintes d'abord, pour ne pas leur laisser les restes.
  const order = [...phases.keys()].sort((a, b) => candidates(phases[a]).length - candidates(phases[b]).length || a - b);
  for (const w of order) {
    const best = candidates(phases[w]).reduce((bi, i) => (quota[i] - given[i] > quota[bi] - given[bi] ? i : bi));
    result[w] = best;
    given[best]++;
  }
  // Évite deux semaines de suite sur le même pilier : échange avec une semaine ultérieure compatible.
  for (let w = 1; w < n; w++) {
    if (result[w] !== result[w - 1]) continue;
    for (let j = w + 1; j < n; j++) {
      const a = result[w], b = result[j];
      if (a === b || b === result[w - 1]) continue;
      if (result[j - 1] === a && j - 1 !== w) continue;
      if (result[j + 1] === a) continue;
      if (candidates(phases[w]).includes(b) && candidates(phases[j]).includes(a)) {
        result[w] = b;
        result[j] = a;
        break;
      }
    }
  }
  return result.map((i) => pillars[i].title);
}
