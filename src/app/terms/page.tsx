import Link from "next/link";
import { YOUTUBE_TERMS_URL } from "@/lib/youtube";

export const metadata = { title: "Terms of Service – Mockingbird" };

export default function TermsPage() {
  return (
    <main className="legal" lang="en">
      <h1>Terms of Service</h1>

      <h2>1. Scope</h2>
      <p>
        These terms of service apply to the use of MockingBird (the &ldquo;Service&rdquo;), provided by Ashraf Beshtawi,
        Pritzhagener Weg 3, 12685 Berlin, Germany (the &ldquo;Provider&rdquo;). By signing in, the user accepts these
        terms.
      </p>

      <h2>2. Description of the Service</h2>
      <p>
        MockingBird lets users create and schedule posts in one place and publish them on their own social media accounts
        through the official interfaces (APIs). The Service is currently provided free of charge.
      </p>
      <p>
        MockingBird is not a social network of its own. The Provider has no influence on the connected platforms, their
        availability, rules or decisions.
      </p>

      <h2>3. Account and sign-in</h2>
      <p>
        Users sign in with an existing Google, GitHub or Discord account. Users must be of legal age. Users are
        responsible for the security of their credentials and for all activity carried out through their account.
      </p>

      <h2>4. Connecting social media accounts</h2>
      <p>
        Users may only connect accounts they are authorized to use. The connected platforms&apos; own terms and policies
        also apply, and users are responsible for complying with them. Connecting a YouTube channel means agreeing to the{" "}
        <a href={YOUTUBE_TERMS_URL} target="_blank" rel="noopener noreferrer">
          YouTube Terms of Service
        </a>
        . Connections can be removed at any time on the dashboard.
      </p>

      <h2>5. Content and user obligations</h2>
      <p>Users are solely responsible for the content they create and publish through MockingBird. In particular, the following is not permitted:</p>
      <ul>
        <li>unlawful content,</li>
        <li>content that infringes the rights of others (e.g. copyright, trademark or personality rights),</li>
        <li>spam and misleading or deceptive content,</li>
        <li>
          any use that impairs the operation of the Service or of the connected platforms or breaks their rules (e.g.
          automated mass publishing).
        </li>
      </ul>
      <p>
        Users indemnify the Provider against third-party claims arising from a culpable breach of these obligations.
      </p>

      <h2>6. Availability and changes to the Service</h2>
      <p>
        The Provider aims for high availability but does not guarantee it. Maintenance, technical faults or changes to
        the platforms&apos; interfaces may temporarily limit use. The Provider may change, extend or discontinue features of
        the Service at any time.
      </p>

      <h2>7. Liability</h2>
      <p>
        The Provider is liable without limitation for intent and gross negligence. For slight negligence, the Provider is
        only liable for injury to life, body or health and for breach of essential contractual obligations, in the latter
        case limited to the typical, foreseeable damage.
      </p>
      <p>
        The Provider accepts no responsibility for users&apos; content or for actions, decisions or outages of the connected
        platforms (e.g. account suspensions, rejected posts).
      </p>

      <h2>8. Term, deletion and suspension</h2>
      <p>
        Users can delete their account at any time on the dashboard (see{" "}
        <Link href="/delete-account">delete your account</Link>). The Provider may suspend or delete accounts that breach
        these terms and may discontinue the Service with reasonable notice.
      </p>

      <h2>9. Privacy</h2>
      <p>
        Information on the processing of personal data is provided in the <Link href="/privacy">Privacy Policy</Link>.
      </p>

      <h2>10. Changes to these terms</h2>
      <p>
        The Provider may update these terms of service when the features, the services used or the legal requirements
        change. The current version is published on this website.
      </p>

      <h2>11. Governing law</h2>
      <p>
        The law of the Federal Republic of Germany applies. For consumers, this applies only insofar as it does not
        deprive them of the protection of mandatory provisions of the country of their habitual residence.
      </p>

      <p>Last updated: October 2026</p>
    </main>
  );
}
