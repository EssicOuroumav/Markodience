import { PLANS, formatXof } from "./plans";

export type FaqItem = { q: string; a: string };
export type FaqCategory = { id: string; label: string; items: FaqItem[] };

const g = PLANS.gratuit;
const p = PLANS.pro;
const a = PLANS.agence;

/**
 * Questions fréquentes. Les chiffres (prix, limites) sont lus dans lib/plans.ts :
 * ils ne peuvent donc pas devenir incohérents avec l'application.
 */
export const FAQ: FaqCategory[] = [
  {
    id: "decouvrir",
    label: "Découvrir",
    items: [
      {
        q: "Qu’est-ce que Markodience ?",
        a: "Markodience est une plateforme web qui aide les community managers à structurer la stratégie de leurs marques. À partir d’un court questionnaire, elle génère l’identité de marque, les piliers de contenu, la tonalité et une ligne éditoriale par canal, puis vous accompagne avec l’audit, le suivi des KPIs, les règles de travail et la préparation des lives.",
      },
      {
        q: "Markodience publie-t-il à ma place sur les réseaux sociaux ?",
        a: "Non, jamais. Markodience n’est connecté à aucun de vos comptes et ne publie rien : c’est un outil de préparation et de pilotage. Vous gardez la main sur vos publications et vos accès. Aucun mot de passe de réseau social ne vous est demandé.",
      },
      {
        q: "À qui s’adresse Markodience ?",
        a: "Aux aspirants community managers et entrepreneurs qui gèrent leur première marque, aux community managers confirmés qui suivent plusieurs clients, et aux agences qui coordonnent une équipe. Le produit est conçu en français, pour les réalités de l’Afrique de l’Ouest francophone.",
      },
      {
        q: "Faut-il de l’expérience pour l’utiliser ?",
        a: "Non. Le démarrage se fait par un questionnaire guidé en quatre étapes, et tout ce qui est généré reste modifiable en un clic. Vous obtenez une base professionnelle que vous adaptez ensuite à votre marque.",
      },
    ],
  },
  {
    id: "fonctionnement",
    label: "Fonctionnement",
    items: [
      {
        q: "Comment fonctionne la génération par l’IA ?",
        a: "Vos réponses au questionnaire servent de contexte à un modèle d’intelligence artificielle (Claude, développé par Anthropic), qui rédige l’identité de marque, les piliers, la tonalité et les lignes éditoriales. Chaque étape s’appuie sur la précédente : la ligne éditoriale répartit par exemple vos piliers en rotation sur les semaines. Les contenus sont rédigés en français et adaptés au contexte local.",
      },
      {
        q: "Puis-je modifier ce que l’IA propose ?",
        a: "Oui, tout est éditable. Cliquez sur un texte pour le modifier : l’enregistrement est automatique. Vous pouvez aussi régénérer une seule semaine de la ligne éditoriale, ou une seule étape d’un live, sans toucher au reste.",
      },
      {
        q: "Y a-t-il une limite de générations ?",
        a: `Oui, pour maîtriser les coûts : ${g.aiDailyLimit} générations par jour avec le palier ${g.label}, ${p.aiDailyLimit} avec le palier ${p.label} et ${a.aiDailyLimit} avec le palier ${a.label}. Le compteur repart à zéro chaque jour à minuit (heure UTC, soit minuit à Abidjan). Une génération qui échoue n’est pas décomptée.`,
      },
      {
        q: "Qu’est-ce que l’audit, et que puis-je y déposer ?",
        a: "L’audit analyse vos captures d’écran ou documents PDF (jusqu’à 5 fichiers de 10 Mo) et les compare à l’identité, aux piliers et à la tonalité que vous avez définis. Vous obtenez un score sur 100, vos points forts et des priorités d’amélioration, avec un historique pour suivre votre progression.",
      },
      {
        q: "Puis-je utiliser Markodience sur mon téléphone ?",
        a: "Oui. Le site s’adapte à tous les écrans et fonctionne dans le navigateur de votre téléphone, sans application à installer. Un mode allégé, utilisable avec une connexion faible ou hors ligne, est prévu dans une prochaine étape.",
      },
    ],
  },
  {
    id: "tarifs",
    label: "Tarifs et paiement",
    items: [
      {
        q: "Quels sont les tarifs ?",
        a: `Le palier ${g.label} est à 0 XOF. Le palier ${p.label} coûte ${formatXof(p.price ?? 0)} par mois. Le palier ${a.label} coûte ${formatXof(a.pricePerSeat ?? 0)} par siège et par mois, avec ${a.minSeats} sièges minimum. Tous les prix sont en francs CFA.`,
      },
      {
        q: "Que contient chaque palier ?",
        a: `Le palier ${g.label} donne accès à l’identité de marque, aux piliers de contenu et à la tonalité, pour ${g.maxProfiles} profil. Le palier ${p.label} ajoute l’audit, la ligne éditoriale, les KPIs, les règles opérationnelles et le Guide Lives, pour ${p.maxProfiles} profils, avec des exports sans filigrane. Le palier ${a.label} reprend tout cela pour ${a.maxProfiles} profils, avec la marque blanche et l’export multi-clients.`,
      },
      {
        q: "Comment puis-je payer ?",
        a: "Par mobile money (Orange Money, MTN, Moov, Wave, selon votre pays) ou par carte bancaire, en francs CFA. Les paiements sont traités par PayDunya, un prestataire de paiement : Markodience ne voit ni ne conserve vos numéros de carte ou de compte mobile money.",
      },
      {
        q: "L’abonnement se renouvelle-t-il automatiquement ?",
        a: "Non. Chaque paiement active votre palier pour un mois, sans prélèvement automatique : vous restez libre de renouveler ou non. À l’échéance, vous repassez au palier Gratuit. Vos données sont conservées et restent consultables, mais les onglets payants ne sont plus modifiables tant que vous n’avez pas renouvelé.",
      },
      {
        q: "Existe-t-il des conditions pour les associations et les structures publiques ?",
        a: "Oui. Une remise est prévue pour les associations et ONG, sur justificatif de leur statut, ainsi qu’une facturation annuelle sur devis pour les structures publiques, afin de s’adapter à leurs procédures d’achat.",
      },
    ],
  },
  {
    id: "donnees",
    label: "Marques et données",
    items: [
      {
        q: "Combien de marques puis-je gérer ?",
        a: `${g.maxProfiles} profil avec le palier ${g.label}, jusqu’à ${p.maxProfiles} avec le palier ${p.label} et jusqu’à ${a.maxProfiles} avec le palier ${a.label}. Chaque marque a sa propre stratégie, ses audits et ses rapports, et vous passez de l’une à l’autre en un clic, sans vous déconnecter. Les marques sont incluses dans l’abonnement, sans frais supplémentaires.`,
      },
      {
        q: "Mes données sont-elles protégées ?",
        a: "Chaque compte ne peut voir que ses propres données : cette séparation est appliquée directement au niveau de la base de données, pas seulement dans l’interface. Les connexions sont chiffrées (HTTPS) et les clés secrètes du service ne sont jamais exposées dans l’application.",
      },
      {
        q: "Mes fichiers d’audit restent-ils privés ?",
        a: "Oui. Les fichiers que vous déposez sont stockés dans un espace privé, accessible uniquement depuis votre compte. Ils sont transmis au service d’intelligence artificielle le temps de l’analyse, puis seul le rapport est conservé dans votre historique.",
      },
      {
        q: "Puis-je supprimer une marque et ses données ?",
        a: "Oui. Depuis la page « Mes marques », vous pouvez supprimer une marque : son identité, ses piliers, sa ligne éditoriale, ses audits et ses rapports sont alors effacés définitivement. Par précaution, il faut saisir le nom de la marque pour confirmer.",
      },
    ],
  },
];

export const FAQ_COUNT = FAQ.reduce((n, c) => n + c.items.length, 0);

/** Données structurées schema.org (FAQPage) pour les moteurs de recherche. */
export function faqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.flatMap((c) => c.items).map((i) => ({
      "@type": "Question",
      name: i.q,
      acceptedAnswer: { "@type": "Answer", text: i.a },
    })),
  };
}
