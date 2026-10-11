/**
 * Repères par réseau : des faits de plateforme stables, tenus à jour dans le code (jamais « devinés » par l'IA).
 * L'IA les adapte à la marque ; elle ne les invente pas. Les jours sont répartis pour que les réseaux ne publient pas le même jour.
 */
export type NetworkBase = { role: string; days: string[]; formats: string; hours: string; platform: string[]; rhythm: string[] };

export const NETWORK_BASES: Record<string, NetworkBase> = {
  Facebook: {
    role: "contenu long, preuve et transparence ; audience plus âgée, familles et diaspora",
    days: ["Lundi", "Mercredi", "Vendredi"],
    formats: "Carré 1080×1080 ou 4:5 (1080×1350) + texte structuré ; vidéo 1080×1080 ou 9:16",
    hours: "12h-13h ou 19h-20h (heure locale)",
    platform: ["Sous-titres obligatoires : beaucoup de vidéos sont vues sans le son", "Les 3 premières secondes décident de la lecture", "Appel à l'action dit à voix haute ET affiché en fin de vidéo", "Le texte long se lit avant la coupure « Voir plus » : l'essentiel dans les deux premières lignes"],
    rhythm: ["Lundi : ancrage informatif", "Mercredi : preuve incarnée", "Vendredi : mobilisation"],
  },
  Instagram: {
    role: "esthétique et émotion ; audience urbaine plus jeune",
    days: ["Mardi", "Jeudi", "Samedi"],
    formats: "Reels 1080×1920 (9:16), carrousels 1080×1350 (4:5), stories 9:16 quotidiennes",
    hours: "12h-14h ou 18h-21h (heure locale)",
    platform: ["3 à 5 hashtags ciblés maximum + géolocalisation", "L'accroche tient dans les deux premières lignes, avant la coupure « … plus »", "Chaque Reel a une couverture avec texte lisible, même son coupé", "Au moins un sticker interactif (sondage, quiz, question) par story", "Filtre et grille de couleurs identiques sur tout le feed"],
    rhythm: ["Mardi : carrousel informatif", "Jeudi : Reel d'émotion", "Samedi : story interactive"],
  },
  TikTok: {
    role: "terrain brut, authenticité et format court ; audience la plus jeune",
    days: ["Lundi", "Jeudi", "Dimanche"],
    formats: "Vertical 1080×1920, 15 à 45 secondes",
    hours: "18h-22h (heure locale)",
    platform: ["Les 3 premières secondes décident de la rétention : ni générique ni logo en ouverture", "Texte à l'écran sur chaque vidéo (visionnages sans le son)", "Son tendance ou musique libre de droits, jamais un titre protégé sans licence", "Appel à l'action dit à l'oral en fin de vidéo", "Répondre aux bons commentaires par une vidéo-réponse"],
    rhythm: ["Lundi : immersion terrain", "Jeudi : interview flash ou tendance", "Dimanche : récap ou compte à rebours"],
  },
  YouTube: {
    role: "contenus longs et pédagogiques, reportages et replays de lives",
    days: ["Samedi"],
    formats: "Horizontal 16:9 (1920×1080) pour les vidéos longues, 9:16 pour les Shorts ; miniature lisible",
    hours: "17h-20h (heure locale)",
    platform: ["Titre clair avec le sujet dans les premiers mots", "Miniature avec texte court et visage ou action", "Chapitres dans la description pour les vidéos longues", "Sous-titres français"],
    rhythm: ["Samedi : une vidéo de fond (reportage, explication ou replay de live)"],
  },
  LinkedIn: {
    role: "crédibilité professionnelle, partenaires et recrutement",
    days: ["Mardi", "Jeudi"],
    formats: "Publication texte + image 1200×1200 ou 1200×627, document PDF en carrousel, vidéo courte",
    hours: "8h-9h ou 12h-13h (jours ouvrés, heure locale)",
    platform: ["La première ligne donne la raison de lire", "Chiffres et résultats sourcés plutôt qu'émotion", "Mentionner les partenaires uniquement avec leur accord"],
    rhythm: ["Mardi : résultat chiffré ou apprentissage", "Jeudi : coulisses de l'équipe ou partenaire"],
  },
  WhatsApp: {
    role: "relation directe : diffusion aux fidèles, statuts, réponses",
    days: ["Mercredi"],
    formats: "Statut image ou vidéo courte ; message de diffusion avec un visuel et un lien",
    hours: "12h-13h ou 19h-21h (heure locale)",
    platform: ["Pas de spam : une diffusion par semaine au maximum", "Seuls les contacts qui ont accepté reçoivent les messages", "Un seul lien et une seule action par message"],
    rhythm: ["Mercredi : reprise du meilleur contenu de la semaine"],
  },
  "Site web": {
    role: "référence officielle : actualités, bilans, dons",
    days: ["Jeudi"],
    formats: "Article 400 à 800 mots avec photo 1200×630",
    hours: "Publication en matinée (heure locale)",
    platform: ["Titre de 60 caractères maximum avec le sujet", "Une photo légendée par article", "Bilans chiffrés datés et signés"],
    rhythm: ["Jeudi : article de fond ou bilan"],
  },
};

const DEFAULT_BASE: NetworkBase = { role: "à définir selon l'audience", days: ["Mercredi"], formats: "à définir", hours: "à confirmer avec les statistiques du compte", platform: [], rhythm: [] };

export const baseFor = (network: string): NetworkBase => NETWORK_BASES[network] ?? DEFAULT_BASE;

export const WEEKDAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"] as const;

/** Jours de la semaine cités dans un texte (ordre du calendrier, sans doublon). */
export function weekdaysIn(text: string): string[] {
  const lower = text.toLowerCase();
  return WEEKDAYS.filter((d) => new RegExp(`\\b${d.toLowerCase()}s?\\b`).test(lower));
}
