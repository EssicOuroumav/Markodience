import type { Metadata } from "next";
import LegalField from "@/components/LegalField";
import LegalLayout, { Section } from "@/components/LegalLayout";
import { LEGAL } from "@/lib/legal";
import { PLANS, formatXof } from "@/lib/plans";

export const metadata: Metadata = { title: "Conditions d’utilisation", alternates: { canonical: "/cgu" } };

const { gratuit: g, pro: p, agence: a } = PLANS;

export default function Cgu() {
  return (
    <LegalLayout title="Conditions générales d’utilisation et de vente" intro="Les règles qui encadrent l'utilisation de Markodience et l'achat d'un abonnement." updated={LEGAL.lastUpdated}>
      <Section n={1} title="Objet et acceptation">
        <p>Les présentes conditions régissent l&apos;accès et l&apos;utilisation de la plateforme Markodience, éditée par <LegalField value={LEGAL.editorName} />. En créant un compte, vous déclarez les avoir lues et vous les acceptez.</p>
      </Section>
      <Section n={2} title="Le service">
        <p>Markodience aide les community managers à structurer la stratégie de leurs marques : identité, piliers de contenu, tonalité, ligne éditoriale, audit, indicateurs, règles de travail et préparation de lives, avec l&apos;aide de l&apos;intelligence artificielle.</p>
        <p><strong>Markodience n&apos;est connecté à aucun de vos comptes de réseaux sociaux et ne publie rien à votre place.</strong> C&apos;est un outil de préparation et de pilotage.</p>
      </Section>
      <Section n={3} title="Votre compte">
        <ul>
          <li>Vous devez être majeur et fournir des informations exactes.</li>
          <li>Vous êtes responsable de la confidentialité de votre mot de passe et de toute activité réalisée depuis votre compte.</li>
          <li>Un compte est personnel. Prévenez-nous sans délai en cas d&apos;usage non autorisé.</li>
        </ul>
      </Section>
      <Section n={4} title="Paliers et prix">
        <ul>
          <li><strong>{g.label}</strong> : {formatXof(0)}. {g.maxProfiles} profil de marque, identité, piliers et tonalité, jusqu&apos;à {g.aiDailyLimit} générations par jour.</li>
          <li><strong>{p.label}</strong> : {formatXof(p.price ?? 0)} par mois. Jusqu&apos;à {p.maxProfiles} profils, tous les onglets, jusqu&apos;à {p.aiDailyLimit} générations par jour.</li>
          <li><strong>{a.label}</strong> : {formatXof(a.pricePerSeat ?? 0)} par siège et par mois, {a.minSeats} sièges minimum. Jusqu&apos;à {a.maxProfiles} profils, jusqu&apos;à {a.aiDailyLimit} générations par jour.</li>
        </ul>
        <p>Les prix sont exprimés en francs CFA (XOF). L&apos;éditeur peut les modifier ; le prix applicable est celui affiché au moment du paiement.</p>
      </Section>
      <Section n={5} title="Paiement et durée">
        <p>Le paiement s&apos;effectue en ligne, par mobile money ou carte bancaire, via le prestataire PayDunya. Chaque paiement active le palier choisi pour <strong>un mois</strong>, dès la confirmation du paiement.</p>
        <p><strong>Il n&apos;y a pas de renouvellement automatique</strong> : aucun prélèvement n&apos;est effectué sans votre action. À l&apos;échéance, votre compte repasse au palier Gratuit. Vos données sont conservées et restent consultables ; les onglets payants ne sont plus modifiables tant que vous ne renouvelez pas.</p>
      </Section>
      <Section n={6} title="Remboursement">
        <p>Le service étant fourni immédiatement après le paiement, les sommes versées ne sont pas remboursables, sauf en cas d&apos;erreur de facturation, de double paiement ou lorsque la loi applicable l&apos;impose. Pour toute demande, contactez-nous à <LegalField value={LEGAL.contactEmail} />.</p>
      </Section>
      <Section n={7} title="Contenus générés par l’intelligence artificielle">
        <ul>
          <li>Les contenus générés sont des propositions : <strong>il vous appartient de les relire, de les adapter et de vérifier leur exactitude</strong> avant tout usage.</li>
          <li>Nous ne garantissons ni un résultat commercial ni l&apos;absence d&apos;erreur.</li>
          <li>Vous conservez les droits sur les contenus que vous saisissez et sur les contenus générés pour vous, dans la mesure permise par la loi. Vous nous accordez le droit limité de les héberger et de les traiter pour fournir le service.</li>
          <li>Pour générer ou analyser un contenu, certaines données sont transmises à notre prestataire d&apos;intelligence artificielle, comme le décrit la <a href="/confidentialite">politique de confidentialité</a>.</li>
        </ul>
      </Section>
      <Section n={8} title="Usages interdits">
        <p>Vous vous engagez à ne pas :</p>
        <ul>
          <li>utiliser le service pour des contenus illicites, haineux, trompeurs ou portant atteinte aux droits de tiers ;</li>
          <li>déposer des fichiers dont vous n&apos;avez pas le droit de vous servir ;</li>
          <li>contourner les limites techniques (quotas, nombre de profils) ou perturber le fonctionnement du service ;</li>
          <li>extraire les contenus du service de manière automatisée, ou revendre l&apos;accès à votre compte.</li>
        </ul>
      </Section>
      <Section n={9} title="Disponibilité du service">
        <p>Nous mettons tout en œuvre pour assurer un service continu, sans pouvoir garantir une disponibilité permanente : des interruptions pour maintenance, des incidents chez nos prestataires ou des limites d&apos;usage du service d&apos;intelligence artificielle peuvent survenir. Le service évolue : des fonctionnalités peuvent être ajoutées, modifiées ou retirées.</p>
      </Section>
      <Section n={10} title="Suspension et résiliation">
        <p>Vous pouvez supprimer votre compte à tout moment depuis la rubrique « Mon compte ». Nous pouvons suspendre ou fermer un compte en cas de manquement grave à ces conditions, après information lorsque cela est possible.</p>
      </Section>
      <Section n={11} title="Responsabilité">
        <p>Dans les limites permises par la loi, l&apos;éditeur n&apos;est pas responsable des dommages indirects (perte de chiffre d&apos;affaires, d&apos;opportunité ou de clientèle) ni des décisions prises à partir des contenus générés. Sa responsabilité totale au titre du service est limitée aux sommes que vous avez versées au cours des douze derniers mois.</p>
      </Section>
      <Section n={12} title="Données personnelles">
        <p>Le traitement de vos données est décrit dans la <a href="/confidentialite">politique de confidentialité</a>.</p>
      </Section>
      <Section n={13} title="Modification des conditions">
        <p>Nous pouvons modifier ces conditions. La version en vigueur est celle publiée sur cette page, avec sa date de mise à jour ; en cas de modification importante, nous vous en informons dans l&apos;application. Continuer à utiliser le service vaut acceptation.</p>
      </Section>
      <Section n={14} title="Droit applicable et litiges">
        <p>Les présentes conditions sont soumises au droit de <LegalField value={LEGAL.country} />. En cas de litige, nous vous invitons à nous contacter d&apos;abord pour rechercher une solution amiable ; à défaut, les tribunaux compétents seront ceux de ce pays.</p>
      </Section>
    </LegalLayout>
  );
}
