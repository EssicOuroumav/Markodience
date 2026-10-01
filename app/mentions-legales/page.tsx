import type { Metadata } from "next";
import LegalField from "@/components/LegalField";
import LegalLayout, { Section } from "@/components/LegalLayout";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "Mentions légales", alternates: { canonical: "/mentions-legales" } };

export default function MentionsLegales() {
  return (
    <LegalLayout title="Mentions légales" intro="Qui édite Markodience, qui l'héberge et comment nous contacter." updated={LEGAL.lastUpdated}>
      <Section n={1} title="Éditeur du site">
        <ul>
          <li><strong>Nom ou raison sociale :</strong> <LegalField value={LEGAL.editorName} /></li>
          <li><strong>Statut :</strong> <LegalField value={LEGAL.editorStatus} /></li>
          {LEGAL.registration && <li><strong>Immatriculation :</strong> {LEGAL.registration}</li>}
          <li><strong>Adresse :</strong> <LegalField value={LEGAL.address} /></li>
          <li><strong>Directeur de la publication :</strong> <LegalField value={LEGAL.publicationDirector} /></li>
        </ul>
      </Section>
      <Section n={2} title="Contact">
        <ul>
          <li><strong>E-mail :</strong> <LegalField value={LEGAL.contactEmail} /></li>
          {LEGAL.contactPhone && <li><strong>Téléphone :</strong> {LEGAL.contactPhone}</li>}
        </ul>
      </Section>
      <Section n={3} title="Hébergement et prestataires techniques">
        <ul>
          <li><strong>Application web :</strong> Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis.</li>
          <li><strong>Base de données, fichiers et authentification :</strong> Supabase.</li>
          <li><strong>Génération de contenu par intelligence artificielle :</strong> Anthropic.</li>
          <li><strong>Paiement :</strong> PayDunya.</li>
        </ul>
        <p>Le détail des données confiées à chacun figure dans la <a href="/confidentialite">politique de confidentialité</a>.</p>
      </Section>
      <Section n={4} title="Propriété intellectuelle">
        <p>La marque Markodience, son logo, l&apos;interface, les textes, les illustrations et le code du service sont protégés. Toute reproduction ou réutilisation sans autorisation écrite de l&apos;éditeur est interdite.</p>
        <p>Les contenus que vous créez dans le service (identité de marque, piliers, plannings, rapports, fichiers) vous appartiennent, dans les conditions prévues par les <a href="/cgu">conditions d&apos;utilisation</a>.</p>
      </Section>
      <Section n={5} title="Crédits">
        <p>Icônes : bibliothèque Lucide (licence ISC). Police : Inter (licence SIL Open Font). Les illustrations de personnages sont des créations originales de l&apos;éditeur.</p>
      </Section>
      <Section n={6} title="Signaler un contenu ou un abus">
        <p>Pour signaler un contenu illicite ou une atteinte à vos droits, écrivez à l&apos;adresse de contact ci-dessus en décrivant précisément le contenu concerné.</p>
      </Section>
    </LegalLayout>
  );
}
