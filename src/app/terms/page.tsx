import Link from "next/link";

export const metadata = { title: "Nutzungsbedingungen – Mockingbird" };

export default function TermsPage() {
  return (
    <main className="legal" lang="de">
      <h1>Nutzungsbedingungen</h1>

      <h2>1. Geltungsbereich</h2>
      <p>
        Diese Nutzungsbedingungen gelten für die Nutzung von MockingBird (nachfolgend „Dienst“), angeboten von Ashraf
        Beshtawi, Pritzhagener Weg 3, 12685 Berlin (nachfolgend „Anbieter“). Mit der Anmeldung akzeptiert der Nutzer
        diese Bedingungen.
      </p>

      <h2>2. Leistungsbeschreibung</h2>
      <p>
        MockingBird ermöglicht es, Beiträge zentral zu erstellen, zu planen und über die offiziellen Schnittstellen (APIs)
        auf den eigenen Social-Media-Konten des Nutzers zu veröffentlichen. Der Dienst wird derzeit unentgeltlich
        angeboten.
      </p>
      <p>
        MockingBird ist kein eigenes soziales Netzwerk. Der Anbieter hat keinen Einfluss auf die verbundenen Plattformen,
        deren Verfügbarkeit, Regeln oder Entscheidungen.
      </p>

      <h2>3. Konto und Anmeldung</h2>
      <p>
        Die Anmeldung erfolgt über ein bestehendes Konto bei Google, GitHub oder Discord. Der Nutzer muss volljährig sein.
        Der Nutzer ist für die Sicherheit seiner Zugangsdaten und für alle Aktivitäten verantwortlich, die über sein Konto
        erfolgen.
      </p>

      <h2>4. Verbindung von Social-Media-Konten</h2>
      <p>
        Der Nutzer darf nur Konten verbinden, zu deren Nutzung er berechtigt ist. Für die verbundenen Plattformen gelten
        zusätzlich deren eigene Nutzungsbedingungen und Richtlinien; für deren Einhaltung ist der Nutzer verantwortlich.
        Verbindungen können jederzeit im Dashboard getrennt werden.
      </p>

      <h2>5. Inhalte und Pflichten des Nutzers</h2>
      <p>
        Der Nutzer ist allein verantwortlich für die Inhalte, die er über MockingBird erstellt und veröffentlicht.
        Unzulässig sind insbesondere:
      </p>
      <ul>
        <li>rechtswidrige Inhalte,</li>
        <li>Inhalte, die Rechte Dritter verletzen (z. B. Urheber-, Marken- oder Persönlichkeitsrechte),</li>
        <li>Spam sowie irreführende oder täuschende Inhalte,</li>
        <li>
          jede Nutzung, die den Betrieb des Dienstes oder der verbundenen Plattformen beeinträchtigt oder gegen deren
          Regeln verstößt (z. B. automatisierte Massenveröffentlichungen).
        </li>
      </ul>
      <p>
        Der Nutzer stellt den Anbieter von Ansprüchen Dritter frei, die auf einer schuldhaften Verletzung dieser Pflichten
        beruhen.
      </p>

      <h2>6. Verfügbarkeit und Änderungen des Dienstes</h2>
      <p>
        Der Anbieter bemüht sich um eine hohe Verfügbarkeit, garantiert diese jedoch nicht. Wartungsarbeiten, technische
        Störungen oder Änderungen an den Schnittstellen der Plattformen können die Nutzung vorübergehend einschränken. Der
        Anbieter kann Funktionen des Dienstes jederzeit ändern, erweitern oder einstellen.
      </p>

      <h2>7. Haftung</h2>
      <p>
        Der Anbieter haftet unbeschränkt bei Vorsatz und grober Fahrlässigkeit. Bei leichter Fahrlässigkeit haftet der
        Anbieter nur bei Verletzung des Lebens, des Körpers oder der Gesundheit sowie bei Verletzung wesentlicher
        Vertragspflichten, in diesem Fall begrenzt auf den vertragstypischen, vorhersehbaren Schaden.
      </p>
      <p>
        Für Inhalte der Nutzer sowie für Handlungen, Entscheidungen oder Ausfälle der verbundenen Plattformen (z. B.
        Sperrung von Konten, Ablehnung von Beiträgen) übernimmt der Anbieter keine Verantwortung.
      </p>

      <h2>8. Laufzeit, Löschung und Sperrung</h2>
      <p>
        Der Nutzer kann sein Konto jederzeit im Dashboard löschen (siehe{" "}
        <Link href="/delete-account">Account löschen</Link>). Der Anbieter kann Konten bei Verstößen gegen diese
        Bedingungen sperren oder löschen und den Dienst mit angemessener Frist einstellen.
      </p>

      <h2>9. Datenschutz</h2>
      <p>
        Informationen zur Verarbeitung personenbezogener Daten enthält die{" "}
        <Link href="/privacy">Datenschutzerklärung</Link>.
      </p>

      <h2>10. Änderungen dieser Bedingungen</h2>
      <p>
        Der Anbieter kann diese Nutzungsbedingungen anpassen, wenn sich der Funktionsumfang, die eingesetzten Dienste
        oder die rechtlichen Anforderungen ändern. Die jeweils aktuelle Fassung wird auf dieser Website veröffentlicht.
      </p>

      <h2>11. Anwendbares Recht</h2>
      <p>
        Es gilt das Recht der Bundesrepublik Deutschland. Gegenüber Verbrauchern gilt dies nur, soweit ihnen dadurch
        nicht der Schutz zwingender Vorschriften des Staates ihres gewöhnlichen Aufenthalts entzogen wird.
      </p>

      <p>Stand: September 2026</p>
    </main>
  );
}
