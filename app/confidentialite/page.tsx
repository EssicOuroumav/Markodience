import type { Metadata } from "next";
import LegalField from "@/components/LegalField";
import LegalLayout, { Section } from "@/components/LegalLayout";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "Politique de confidentialité", alternates: { canonical: "/confidentialite" } };

export default function Confidentialite() {
  return (
    <LegalLayout title="Politique de confidentialité" intro="Les données que nous collectons, pourquoi, avec qui nous les partageons, et comment vous gardez le contrôle." updated={LEGAL.lastUpdated}>
      <Section n={1} title="Responsable du traitement">
        <p><LegalField value={LEGAL.editorName} />, <LegalField value={LEGAL.editorStatus} />, <LegalField value={LEGAL.address} />. Contact pour toute question sur vos données : <LegalField value={LEGAL.contactEmail} />.</p>
      </Section>
      <Section n={2} title="Données que nous collectons">
        <ul>
          <li><strong>Votre compte :</strong> nom, adresse e-mail, numéro de téléphone, mot de passe (conservé sous forme chiffrée, jamais lisible).</li>
          <li><strong>Vos marques et contenus :</strong> noms, secteurs, logos, couleurs, identité, piliers, tonalité, lignes éditoriales, rapports d&apos;indicateurs, règles de travail, guides de lives et tout texte que vous saisissez.</li>
          <li><strong>Vos fichiers d&apos;audit :</strong> captures d&apos;écran et documents PDF que vous déposez pour analyse.</li>
          <li><strong>Vos paiements :</strong> référence, montant, palier, date et statut. Nous ne voyons ni ne conservons vos numéros de carte ou de compte mobile money : ils sont saisis chez le prestataire de paiement.</li>
          <li><strong>Données techniques :</strong> cookies de session, compteur quotidien de générations, journaux de sécurité.</li>
        </ul>
      </Section>
      <Section n={3} title="Pourquoi nous les utilisons">
        <ul>
          <li><strong>Fournir le service</strong> (création de votre espace, génération et enregistrement de vos contenus, paiement) : exécution du contrat.</li>
          <li><strong>Sécuriser le service et limiter les abus</strong> (quotas, détection d&apos;usages anormaux) : intérêt légitime.</li>
          <li><strong>Respecter nos obligations</strong> comptables et légales : obligation légale.</li>
        </ul>
        <p>Nous ne vendons pas vos données et nous ne les utilisons pas à des fins publicitaires.</p>
      </Section>
      <Section n={4} title="Avec qui nous les partageons">
        <p>Uniquement avec les prestataires nécessaires au fonctionnement du service :</p>
        <ul>
          <li><strong>Supabase</strong> : hébergement de la base de données, des fichiers et de l&apos;authentification.</li>
          <li><strong>Vercel</strong> : hébergement de l&apos;application.</li>
          <li><strong>Anthropic</strong> : génération et analyse par intelligence artificielle. Le contexte de votre marque, vos réponses au questionnaire et les fichiers que vous soumettez à l&apos;audit lui sont transmis le temps du traitement.</li>
          <li><strong>PayDunya</strong> : traitement des paiements.</li>
          <li><strong>Rappels par e-mail</strong> : votre adresse e-mail est transmise à notre prestataire d&apos;envoi (Resend) pour vous écrire, au plus une fois par jour, quand un rapport, une publication ou votre abonnement demande votre attention. Vous les désactivez à tout moment dans Mon compte.</li>
          <li><strong>Sentry</strong> : suivi des erreurs techniques, pour corriger les pannes. Seuls les détails de l&apos;erreur (page concernée, type de navigateur) sont transmis ; vos contenus, vos cookies et vos adresses e-mail sont retirés avant l&apos;envoi.</li>
        </ul>
        <p>Certains de ces prestataires sont situés hors de votre pays, notamment en Europe et aux États-Unis. Les transferts sont encadrés par les garanties contractuelles proposées par ces prestataires.</p>
      </Section>
      <Section n={5} title="Combien de temps nous les conservons">
        <p>Vos données sont conservées tant que votre compte est actif. Si vous supprimez une marque ou votre compte depuis l&apos;application, les données correspondantes sont effacées. Les justificatifs de paiement restent conservés par le prestataire de paiement pendant la durée imposée par la loi. Les copies techniques éventuelles sont purgées selon les cycles de nos prestataires.</p>
      </Section>
      <Section n={6} title="Vos droits, et comment les exercer">
        <p>Vous pouvez accéder à vos données, les rectifier, les supprimer, en demander la portabilité, vous opposer à un traitement ou en demander la limitation.</p>
        <ul>
          <li><strong>Directement dans l&apos;application</strong> (rubrique « Mon compte ») : modifier vos informations, télécharger toutes vos données au format JSON, supprimer vos marques ou votre compte.</li>
          <li><strong>Par e-mail</strong> à <LegalField value={LEGAL.contactEmail} />. Nous répondons dans un délai maximal de 30 jours.</li>
        </ul>
        <p>Si vous estimez que vos droits ne sont pas respectés, vous pouvez saisir l&apos;autorité de protection des données de votre pays (par exemple l&apos;ARTCI en Côte d&apos;Ivoire ou la CDP au Sénégal).</p>
      </Section>
      <Section n={7} title="Cookies">
        <p>Markodience n&apos;utilise que des cookies strictement nécessaires : maintien de votre session de connexion et mémorisation de la marque active. Aucun cookie publicitaire ni outil de suivi tiers n&apos;est utilisé, ce qui rend inutile un bandeau de consentement.</p>
      </Section>
      <Section n={8} title="Sécurité">
        <p>Les échanges sont chiffrés (HTTPS). Chaque compte ne peut accéder qu&apos;à ses propres données, ce que la base de données applique elle-même. Les mots de passe sont chiffrés, les clés secrètes du service ne sont jamais exposées dans l&apos;application, et l&apos;accès aux fichiers d&apos;audit est privé.</p>
      </Section>
      <Section n={9} title="Mineurs">
        <p>Le service s&apos;adresse aux personnes âgées d&apos;au moins {LEGAL.minAge} ans. Il n&apos;est pas destiné aux enfants de moins de {LEGAL.minAge} ans, dont nous ne collectons pas sciemment les données.</p>
      </Section>
      <Section n={10} title="Évolution de cette politique">
        <p>Nous pouvons modifier cette politique pour refléter l&apos;évolution du service ou de la réglementation. La date de dernière mise à jour figure en haut de la page ; en cas de changement important, nous vous en informons dans l&apos;application.</p>
      </Section>
    </LegalLayout>
  );
}
