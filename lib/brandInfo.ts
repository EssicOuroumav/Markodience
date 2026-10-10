import { z } from "zod";

/** Informations facultatives de la fiche de marque : site, réseaux, autres liens, présentation. */
export const SOCIAL_NETWORKS = ["Facebook", "Instagram", "TikTok", "YouTube", "LinkedIn", "WhatsApp", "X"] as const;
export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number];

const HANDLE_URL: Partial<Record<SocialNetwork, (h: string) => string>> = {
  Instagram: (h) => `https://www.instagram.com/${h}`,
  TikTok: (h) => `https://www.tiktok.com/@${h}`,
  X: (h) => `https://x.com/${h}`,
};

export const MAX_URL = 300;
export const MAX_LINKS = 8;
export const MAX_ABOUT = 800;

/**
 * Normalise une adresse saisie par l'utilisateur : « monsite.ci » devient https://monsite.ci, « @aicha » devient l'adresse du profil,
 * un numéro devient un lien WhatsApp. Renvoie null pour un champ vide et "invalid" pour une adresse inutilisable.
 * Seuls http et https sont acceptés : jamais de « javascript: » ni de « data: ».
 */
export function cleanUrl(input: string, network?: SocialNetwork): string | null | "invalid" {
  const raw = input.trim();
  if (!raw) return null;
  if (raw.length > MAX_URL) return "invalid";
  if (network === "WhatsApp" && /^\+?[\d\s().-]{7,20}$/.test(raw)) return `https://wa.me/${raw.replace(/\D/g, "")}`;
  if (raw.startsWith("@") && network && HANDLE_URL[network]) {
    const handle = raw.slice(1);
    return /^[A-Za-z0-9._]{1,40}$/.test(handle) ? HANDLE_URL[network]!(handle) : "invalid";
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw) && !/^https?:\/\//i.test(raw)) return "invalid";
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const u = new URL(withScheme);
    if (!["http:", "https:"].includes(u.protocol)) return "invalid";
    if (!u.hostname.includes(".") || /\s/.test(u.hostname)) return "invalid";
    return u.toString().replace(/\/$/, "");
  } catch {
    return "invalid";
  }
}

export type BrandInfo = { website: string | null; socials: Record<string, string>; links: { label: string; url: string }[]; about: string | null };
export type BrandInfoInput = { website: string; socials: Record<string, string>; links: { label: string; url: string }[]; about: string };

/** Valide et normalise le formulaire ; renvoie le message d'erreur à afficher ou les valeurs à enregistrer. */
export function parseBrandInfoInput(i: BrandInfoInput): { ok: true; info: BrandInfo } | { ok: false; error: string } {
  const website = cleanUrl(i.website);
  if (website === "invalid") return { ok: false, error: "L'adresse du site web n'est pas valide (exemple : monsite.ci)." };
  const socials: Record<string, string> = {};
  for (const n of SOCIAL_NETWORKS) {
    const v = cleanUrl(i.socials[n] ?? "", n);
    if (v === "invalid") return { ok: false, error: `L'adresse ${n} n'est pas valide : collez le lien de la page${HANDLE_URL[n] ? " ou écrivez @nom" : n === "WhatsApp" ? " ou le numéro" : ""}.` };
    if (v) socials[n] = v;
  }
  const links: BrandInfo["links"] = [];
  for (const l of i.links) {
    if (!l.url.trim() && !l.label.trim()) continue;
    const url = cleanUrl(l.url);
    if (url === "invalid" || url === null) return { ok: false, error: `Le lien « ${l.label.trim() || l.url.trim() || "sans nom"} » n'est pas valide.` };
    links.push({ label: l.label.trim().slice(0, 80) || new URL(url).hostname, url });
  }
  if (links.length > MAX_LINKS) return { ok: false, error: `Au plus ${MAX_LINKS} liens supplémentaires.` };
  const about = i.about.trim();
  if (about.length > MAX_ABOUT) return { ok: false, error: `La présentation ne doit pas dépasser ${MAX_ABOUT} caractères.` };
  return { ok: true, info: { website, socials, links, about: about || null } };
}

const safeUrl = z.string().max(MAX_URL).regex(/^https?:\/\//i);
const storedInfo = z.object({
  website: safeUrl.nullable().catch(null),
  socials: z.record(z.string(), z.unknown()).catch({}),
  links: z.array(z.unknown()).catch([]),
  about: z.string().max(MAX_ABOUT).nullable().catch(null),
});

/** Lecture prudente des valeurs stockées (colonnes jsonb) : tout lien qui n'est pas http(s) est ignoré avant affichage. */
export function readBrandInfo(row: { website?: unknown; socials?: unknown; links?: unknown; about?: unknown }): BrandInfo {
  const p = storedInfo.parse({ website: row.website ?? null, socials: row.socials ?? {}, links: row.links ?? [], about: row.about ?? null });
  const socials: Record<string, string> = {};
  for (const [k, v] of Object.entries(p.socials)) if (typeof v === "string" && safeUrl.safeParse(v).success) socials[k] = v;
  const links = p.links.flatMap((l) => {
    const r = z.object({ label: z.string().max(120), url: safeUrl }).safeParse(l);
    return r.success ? [r.data] : [];
  });
  return { website: p.website, socials, links, about: p.about };
}

export const hasBrandInfo = (i: BrandInfo) => !!i.website || Object.keys(i.socials).length > 0 || i.links.length > 0 || !!i.about;
