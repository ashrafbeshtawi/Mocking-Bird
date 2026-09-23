import Link from "next/link";

export const metadata = { title: "Account löschen – Mockingbird" };

export default function DeleteAccountPage() {
  return (
    <main className="legal" lang="de">
      <h1>Account löschen</h1>
      <p>Du kannst dein MockingBird-Konto jederzeit selbst löschen:</p>
      <ol>
        <li>Melde dich bei MockingBird an.</li>
        <li>
          Öffne das <Link href="/dashboard">Dashboard</Link>.
        </li>
        <li>
          Klicke im Abschnitt „Delete account“ auf <strong>Delete account</strong> und bestätige die Löschung.
        </li>
      </ol>
      <p>Bei der Löschung werden:</p>
      <ul>
        <li>dein MockingBird-Konto,</li>
        <li>deine gespeicherten Kontodaten,</li>
        <li>gespeicherte Social-Media-Verbindungen,</li>
        <li>OAuth-Zugriffstokens,</li>
        <li>Entwürfe, geplante Beiträge und noch nicht veröffentlichte hochgeladene Medien,</li>
        <li>dein Veröffentlichungsverlauf und</li>
        <li>sonstige deinem Konto zugeordnete Daten</li>
      </ul>
      <p>
        gelöscht, soweit keine gesetzlichen Aufbewahrungspflichten oder sonstigen rechtlichen Gründe einer Löschung
        entgegenstehen.
      </p>
      <p>Die Löschung deines MockingBird-Kontos löscht keine bereits auf Social-Media-Plattformen veröffentlichten Beiträge.</p>
      <p>
        Falls du dich nicht mehr anmelden kannst, sende eine Löschanfrage an:{" "}
        <strong>
          <a href="mailto:beshtawi.ashraf@gmail.com">beshtawi.ashraf@gmail.com</a>
        </strong>
      </p>
      <p>Stand: September 2026</p>
    </main>
  );
}
