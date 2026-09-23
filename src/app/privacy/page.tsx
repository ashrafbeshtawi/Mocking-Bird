import Link from "next/link";

export const metadata = { title: "Datenschutzerklärung – Mockingbird" };

export default function PrivacyPage() {
  return (
    <main className="legal" lang="de">
      <h1>Datenschutzerklärung</h1>

      <h2>1. Verantwortlicher</h2>
      <p>Verantwortlicher für die Verarbeitung personenbezogener Daten im Zusammenhang mit MockingBird ist:</p>
      <address>
        <strong>Ashraf Beshtawi</strong>
        <br />
        Pritzhagener Weg 3
        <br />
        12685 Berlin
        <br />
        Deutschland
      </address>
      <p>
        E-Mail: <a href="mailto:beshtawi.ashraf@gmail.com">beshtawi.ashraf@gmail.com</a>
      </p>

      <h2>2. Über MockingBird</h2>
      <p>
        MockingBird ist eine Anwendung, mit der Nutzer Beiträge zentral erstellen, verwalten und auf ihren eigenen
        Social-Media-Konten veröffentlichen können.
      </p>
      <p>
        Hierzu können Nutzer ihre Social-Media-Konten über die von den jeweiligen Plattformen bereitgestellten
        offiziellen Schnittstellen (APIs) mit MockingBird verbinden.
      </p>
      <p>
        MockingBird greift dabei nur auf Daten und Funktionen zu, für die der Nutzer der jeweiligen Plattform eine
        entsprechende Berechtigung erteilt hat.
      </p>

      <h2>3. Welche personenbezogenen Daten werden verarbeitet?</h2>
      <p>Je nach Nutzung von MockingBird können insbesondere folgende Daten verarbeitet werden:</p>
      <ul>
        <li>Name bzw. Benutzername</li>
        <li>E-Mail-Adresse</li>
        <li>Benutzerkonto und interne Benutzer-ID</li>
        <li>Informationen über verbundene Social-Media-Konten</li>
        <li>Social-Media-Konto-IDs</li>
        <li>OAuth-Zugriffsdaten bzw. Zugriffstokens</li>
        <li>von Nutzern erstellte Beiträge</li>
        <li>Bilder, Videos und sonstige hochgeladene Inhalte</li>
        <li>geplante Veröffentlichungen</li>
        <li>technische Protokoll- und Nutzungsdaten</li>
        <li>IP-Adresse</li>
        <li>Browser- und Geräteinformationen</li>
        <li>Datum und Uhrzeit von Zugriffen und Aktionen</li>
      </ul>
      <p>
        Welche Daten tatsächlich verarbeitet werden, hängt von den vom Nutzer verwendeten Funktionen und den jeweiligen
        APIs der verbundenen Plattformen ab.
      </p>

      <h2>4. Verbindung mit Social-Media-Plattformen</h2>
      <p>MockingBird ermöglicht die Verbindung mit folgenden Social-Media-Plattformen:</p>
      <ul>
        <li>Facebook / Meta</li>
        <li>Instagram</li>
        <li>X</li>
        <li>Telegram</li>
      </ul>
      <p>
        Die Verbindung erfolgt über die von den jeweiligen Plattformen bereitgestellten Authentifizierungs- und
        API-Verfahren.
      </p>
      <p>MockingBird erhält dabei nur die Berechtigungen, denen der Nutzer gegenüber der jeweiligen Plattform zugestimmt hat.</p>
      <p>
        Die jeweiligen Plattformbetreiber verarbeiten Daten zusätzlich in eigener Verantwortung. Für deren
        Datenverarbeitung gelten die Datenschutzbestimmungen der jeweiligen Plattform.
      </p>

      <h2>5. Zweck der Verarbeitung</h2>
      <p>Personenbezogene Daten werden insbesondere verarbeitet, um:</p>
      <ul>
        <li>Nutzer bei der Anmeldung zu authentifizieren,</li>
        <li>das MockingBird-Konto bereitzustellen,</li>
        <li>Social-Media-Konten zu verbinden,</li>
        <li>Beiträge zu erstellen und zu verwalten,</li>
        <li>Beiträge auf den vom Nutzer ausgewählten Plattformen zu veröffentlichen,</li>
        <li>geplante Veröffentlichungen durchzuführen,</li>
        <li>die Sicherheit und Stabilität der Anwendung zu gewährleisten,</li>
        <li>Fehler zu erkennen und zu beheben,</li>
        <li>die technische Funktionalität von MockingBird sicherzustellen.</li>
      </ul>

      <h2>6. Rechtsgrundlagen</h2>
      <p>
        Die Verarbeitung personenbezogener Daten erfolgt abhängig vom jeweiligen Verarbeitungsvorgang insbesondere auf
        Grundlage von:
      </p>
      <ul>
        <li>
          Art. 6 Abs. 1 lit. b DSGVO, soweit die Verarbeitung zur Bereitstellung der vom Nutzer gewünschten Funktionen
          erforderlich ist;
        </li>
        <li>Art. 6 Abs. 1 lit. f DSGVO, soweit die Verarbeitung zur Wahrung berechtigter Interessen erforderlich ist;</li>
        <li>Art. 6 Abs. 1 lit. a DSGVO, soweit eine Einwilligung erforderlich ist und vom Nutzer erteilt wurde.</li>
      </ul>

      <h2>7. OAuth und Zugriffstokens</h2>
      <p>
        Die Anmeldung bei MockingBird erfolgt per OAuth über Google, GitHub oder Discord. MockingBird erhält dabei vom
        gewählten Anbieter Name, E-Mail-Adresse und Konto-ID; ein Passwort wird bei MockingBird nicht gespeichert.
      </p>
      <p>
        Wenn ein Nutzer ein Social-Media-Konto mit MockingBird verbindet, werden Authentifizierungsdaten bzw.
        Zugriffstokens verarbeitet, soweit dies für die Nutzung der jeweiligen API erforderlich ist.
      </p>
      <p>
        Diese Daten werden verwendet, um die vom Nutzer autorisierten Aktionen – beispielsweise die Veröffentlichung eines
        Beitrags – gegenüber der jeweiligen Plattform durchführen zu können.
      </p>

      <h2>8. Veröffentlichung von Beiträgen</h2>
      <p>
        Wenn ein Nutzer einen Beitrag über MockingBird veröffentlicht, werden die dafür erforderlichen Inhalte und
        technischen Informationen an die vom Nutzer ausgewählte Social-Media-Plattform übertragen.
      </p>
      <p>Die Übertragung erfolgt, damit der Beitrag auf dem vom Nutzer autorisierten Konto veröffentlicht werden kann.</p>
      <p>
        Die Verarbeitung der Daten durch die jeweilige Social-Media-Plattform erfolgt zusätzlich nach deren eigenen
        Datenschutzbestimmungen.
      </p>

      <h2>9. Hosting und technische Dienstleister</h2>
      <p>Für den Betrieb von MockingBird können externe technische Dienstleister eingesetzt werden.</p>
      <p>Hierzu können insbesondere gehören:</p>
      <ul>
        <li>Hosting-Provider</li>
        <li>Datenbankanbieter</li>
        <li>Cloud-Infrastruktur</li>
        <li>Storage-Anbieter</li>
        <li>E-Mail-Dienstleister</li>
        <li>Monitoring- und Logging-Dienste</li>
        <li>Fehleranalyse- und Sicherheitsdienste</li>
      </ul>
      <p>
        <strong>Aktuell eingesetzte Anbieter:</strong>
      </p>
      <ul>
        <li>
          <strong>Hosting:</strong> Contabo GmbH, München (Deutschland) – virtueller Server, auf dem die Anwendung und
          die Datenbank betrieben werden.
        </li>
        <li>
          <strong>Datenbank:</strong> PostgreSQL, selbst betrieben auf demselben Server; kein externer Datenbankanbieter.
        </li>
        <li>
          <strong>Medienverarbeitung:</strong> Cloudinary Ltd. – hochgeladene Bilder und Videos werden zur Verarbeitung
          und Speicherung an Cloudinary übertragen.
        </li>
        <li>
          <strong>KI-Anbieter:</strong> OpenAI bzw. Anthropic – nur, wenn der Nutzer die KI-Textumwandlung aktiviert und
          dafür einen eigenen API-Schlüssel hinterlegt hat; in diesem Fall werden die Beitragstexte an den gewählten
          Anbieter übertragen.
        </li>
        <li>
          <strong>Anmeldung (OAuth):</strong> Google, GitHub, Discord.
        </li>
        <li>
          <strong>Monitoring / Fehleranalyse:</strong> keine externen Dienste; Server- und Fehlerprotokolle verbleiben auf
          dem eigenen Server.
        </li>
      </ul>

      <h2>10. Server- und Logdaten</h2>
      <p>Beim Aufruf und bei der Nutzung von MockingBird können technisch erforderliche Informationen verarbeitet werden.</p>
      <p>Hierzu können insbesondere gehören:</p>
      <ul>
        <li>IP-Adresse</li>
        <li>Datum und Uhrzeit des Zugriffs</li>
        <li>aufgerufene URL</li>
        <li>verwendeter Browser</li>
        <li>Betriebssystem</li>
        <li>Referrer</li>
        <li>technische Statusinformationen</li>
      </ul>
      <p>Die Verarbeitung dient insbesondere der technischen Bereitstellung, Stabilität und Sicherheit der Anwendung.</p>
      <p>Die konkrete Speicherdauer richtet sich nach der eingesetzten Infrastruktur.</p>

      <h2>11. Cookies und ähnliche Technologien</h2>
      <p>MockingBird verwendet ausschließlich technisch erforderliche Cookies und Browser-Speicher:</p>
      <ul>
        <li>
          <code>authjs.session-token</code> (bzw. <code>__Secure-authjs.session-token</code>): Login-Sitzung, HttpOnly,
          Gültigkeit bis zu 30 Tage.
        </li>
        <li>
          <code>authjs.csrf-token</code>, <code>authjs.callback-url</code>: Schutz vor Cross-Site-Request-Forgery und
          Rücksprung nach dem Login; nur für die Dauer der Sitzung.
        </li>
        <li>
          <code>twitter_oauth_secret</code>, <code>temp_jwt</code>: nur während der Verbindung eines X-Kontos, Gültigkeit
          5 Minuten.
        </li>
        <li>
          Browser-Speicher (localStorage) <code>colorMode</code> (Hell-/Dunkelmodus) und <code>emojiHistory</code>{" "}
          (zuletzt verwendete Emojis): verbleiben im Browser und werden nicht an den Server übertragen.
        </li>
      </ul>
      <p>
        Beim Verbinden von Facebook-Seiten bzw. Instagram-Konten wird das JavaScript-SDK von Meta (connect.facebook.net)
        geladen; dabei kann Meta eigene Cookies setzen. Hierfür gelten die Datenschutzbestimmungen von Meta.
      </p>
      <p>Tracking- oder Analyse-Cookies werden nicht eingesetzt.</p>
      <p>
        Technisch erforderliche Cookies oder vergleichbare Technologien können eingesetzt werden, soweit sie für die
        Bereitstellung der vom Nutzer gewünschten Funktionen erforderlich sind.
      </p>
      <p>Für darüber hinausgehende Speicherungen oder Zugriffe auf das Endgerät kann eine Einwilligung erforderlich sein.</p>

      <h2>12. Speicherdauer</h2>
      <p>
        Personenbezogene Daten werden nur so lange gespeichert, wie dies für die jeweiligen Zwecke erforderlich ist oder
        gesetzliche Aufbewahrungspflichten bestehen.
      </p>
      <p>
        Nutzer können die Löschung ihres MockingBird-Kontos beantragen (siehe{" "}
        <Link href="/delete-account">Account löschen</Link>).
      </p>
      <p>
        Bei der Löschung werden die mit dem Konto verbundenen personenbezogenen Daten grundsätzlich gelöscht, soweit keine
        gesetzlichen Aufbewahrungspflichten oder andere rechtlich zulässige Gründe für eine weitere Speicherung bestehen.
      </p>

      <h2>13. Löschung und Trennung von Social-Media-Konten</h2>
      <p>Nutzer können die Verbindung zwischen MockingBird und ihren Social-Media-Konten entfernen.</p>
      <p>
        Dabei werden die bei MockingBird gespeicherten Zugangsdaten bzw. Zugriffstokens für die jeweilige Verbindung
        gelöscht, soweit keine weitere rechtliche Grundlage für deren Speicherung besteht.
      </p>
      <p>
        Die Aufhebung der Verbindung in MockingBird beendet nicht automatisch die Verarbeitung von Daten durch die
        jeweilige Social-Media-Plattform.
      </p>

      <h2>14. Rechte betroffener Personen</h2>
      <p>Nutzer haben nach Maßgabe der gesetzlichen Voraussetzungen insbesondere folgende Rechte:</p>
      <ul>
        <li>Recht auf Auskunft</li>
        <li>Recht auf Berichtigung</li>
        <li>Recht auf Löschung</li>
        <li>Recht auf Einschränkung der Verarbeitung</li>
        <li>Recht auf Datenübertragbarkeit</li>
        <li>Recht auf Widerspruch</li>
        <li>Recht auf Widerruf einer erteilten Einwilligung</li>
      </ul>
      <p>Zur Ausübung dieser Rechte kann eine Anfrage an folgende E-Mail-Adresse gesendet werden:</p>
      <p>
        <strong>
          <a href="mailto:beshtawi.ashraf@gmail.com">beshtawi.ashraf@gmail.com</a>
        </strong>
      </p>

      <h2>15. Beschwerderecht</h2>
      <p>
        Betroffene Personen haben das Recht, sich bei einer Datenschutzaufsichtsbehörde über die Verarbeitung ihrer
        personenbezogenen Daten zu beschweren.
      </p>

      <h2>16. Änderungen dieser Datenschutzerklärung</h2>
      <p>
        Diese Datenschutzerklärung kann angepasst werden, wenn sich die Funktionen von MockingBird, die eingesetzten
        technischen Dienste oder die rechtlichen Anforderungen ändern.
      </p>
      <p>Die jeweils aktuelle Version wird auf dieser Website veröffentlicht.</p>

      <p>Stand: September 2026</p>
    </main>
  );
}
