import { Link } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import './legal.css'

/**
 * Operator details come from build-time environment variables (see .env.example),
 * so a private address is never committed to the repository. They are deliberately
 * NOT invented: while they are missing, both pages show a visible warning.
 *
 * The privacy text describes what this codebase and its hosting actually do.
 * It is not legal advice and should be reviewed before relying on it.
 */
const OPERATOR = {
  name: (import.meta.env.VITE_OPERATOR_NAME || '').trim(),
  address: (import.meta.env.VITE_OPERATOR_ADDRESS || '')
    .split(';')
    .map((line) => line.trim())
    .filter(Boolean),
  email: (import.meta.env.VITE_OPERATOR_EMAIL || '').trim(),
}
const operatorComplete = !!(OPERATOR.name && OPERATOR.address.length && OPERATOR.email)

function OperatorBlock() {
  return (
    <address className="legal-address">
      {OPERATOR.name}
      {OPERATOR.address.map((line) => (
        <span key={line}>
          <br />
          {line}
        </span>
      ))}
      <br />
      E-Mail: <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>
    </address>
  )
}

export function PrivacyPage() {
  return (
    <div className="page page--narrow legal">
      <h1 className="page-title">Datenschutz</h1>
      {!operatorComplete && (
        <p className="notice notice-warning">
          <AlertTriangle size={18} aria-hidden="true" />
          Entwurf: Verantwortliche Stelle und Kontaktdaten müssen vom Betreiber vor dem öffentlichen Start ergänzt und
          rechtlich geprüft werden.
        </p>
      )}
      {operatorComplete && (
        <>
          <h2>Verantwortliche Stelle</h2>
          <OperatorBlock />
        </>
      )}
      <h2>Welche Daten wir verarbeiten</h2>
      <ul>
        <li>Konto: Name, E-Mail-Adresse, Passwort (nur als sicherer Hash gespeichert), optional Stadt und Lieblingssportarten.</li>
        <li>Den Zeitpunkt, zu dem du bei der Registrierung bestätigt hast, mindestens 16 Jahre alt zu sein.</li>
        <li>Events, die du erstellst: Titel, Beschreibung, Zeit, Ort mit Koordinaten.</li>
        <li>Teilnahmen an Events und Meldungen, die du abschickst.</li>
      </ul>
      <h2>Mindestalter</h2>
      <p>Hobbook richtet sich an Personen ab 16 Jahren. Ein Konto darf nur anlegen, wer mindestens 16 Jahre alt ist.</p>
      <h2>Was öffentlich sichtbar ist</h2>
      <p>
        Bei Events wird der Name des Organisators nur als „Vorname N.“ gezeigt. Die Namen der Teilnehmenden sehen nur
        Organisator, Teilnehmende und die Moderation. E-Mail-Adressen werden nie öffentlich angezeigt.
      </p>
      <h2>Standort</h2>
      <p>
        Dein Standort wird nur abgefragt, wenn du „In meiner Nähe“ antippst und dein Browser es erlaubt. Für die Suche
        wird die Position auf etwa einen Kilometer gerundet an unseren Server gesendet und dort nicht gespeichert.
      </p>
      <h2>Hosting und Dienste Dritter</h2>
      <ul>
        <li>
          Die Website wird über Cloudflare Pages ausgeliefert, die Programmierschnittstelle läuft bei Render, die
          Datenbank bei MongoDB Atlas. Bei jedem Aufruf verarbeiten diese Anbieter technisch notwendige Daten wie deine
          IP-Adresse.
        </li>
        <li>
          Kartenkacheln werden von OpenFreeMap (tiles.openfreemap.org) geladen; dabei wird deine IP-Adresse an diesen
          Dienst übertragen. Kartendaten © OpenStreetMap-Mitwirkende.
        </li>
        <li>
          Die Ortssuche läuft über unseren Server zum Nominatim-Dienst von OpenStreetMap. Dein Browser kontaktiert
          Nominatim nicht direkt; übertragen wird nur der Suchbegriff bzw. die Koordinate.
        </li>
        <li>Schriften werden von unserem eigenen Server geladen, nicht von Google.</li>
      </ul>
      <h2>Speicherung im Browser</h2>
      <p>
        Nach der Anmeldung wird ein Sitzungs-Token im lokalen Speicher deines Browsers abgelegt, außerdem deine Wahl
        für das helle oder dunkle Farbschema. Wir verwenden keine Tracking- oder Werbe-Cookies.
      </p>
      <h2>Löschung</h2>
      <p>
        Du kannst dein Konto jederzeit im <Link to="/profil">Profil</Link> löschen. Deine anstehenden Events mit
        Anmeldungen werden dann abgesagt, alle übrigen personenbezogenen Daten werden entfernt.
      </p>
    </div>
  )
}

export function ImprintPage() {
  return (
    <div className="page page--narrow legal">
      <h1 className="page-title">Impressum</h1>
      {operatorComplete ? (
        <>
          <h2>Angaben gemäß § 5 DDG</h2>
          <OperatorBlock />
          <p>Hobbook ist ein privates, nicht kommerzielles Community-Projekt.</p>
        </>
      ) : (
        <p className="notice notice-warning">
          <AlertTriangle size={18} aria-hidden="true" />
          Die Angaben nach § 5 DDG (Name, Anschrift, Kontakt des Betreibers) sind noch nicht hinterlegt und müssen vor
          dem öffentlichen Start ergänzt werden.
        </p>
      )}
    </div>
  )
}

export function AboutPage() {
  return (
    <div className="page page--narrow legal">
      <h1 className="page-title">So funktioniert Hobbook</h1>
      <p>
        Hobbook hilft dir, Sport in deiner Nähe zu finden und Leute dafür zu treffen. Alle Events sind kostenlos und
        werden von der Community organisiert – Hobbook verkauft keine Plätze und vermittelt keine Buchungen.
      </p>

      <ol className="legal-steps">
        <li>
          <strong>Entdecken.</strong> Sieh in Liste und Karte, was in deiner Stadt oder direkt um dich herum läuft.
        </li>
        <li>
          <strong>Mitmachen.</strong> Ein Tipp auf „Mitmachen“ reserviert deinen Platz. Kommt etwas dazwischen, trittst
          du genauso schnell wieder aus.
        </li>
        <li>
          <strong>Hingehen.</strong> Treffpunkt, Uhrzeit und Route stehen im Event – auf Wunsch auch in deinem Kalender.
        </li>
      </ol>

      <h2>Häufige Fragen</h2>
      <h3>Kostet das etwas?</h3>
      <p>Nein. Hobbook und alle Events sind kostenlos.</p>
      <h3>Brauche ich ein Konto?</h3>
      <p>Zum Stöbern nicht. Erst wenn du mitmachen oder selbst ein Event starten willst, legst du ein Konto an.</p>
      <h3>Wer sieht meinen Namen?</h3>
      <p>
        Öffentlich erscheint nur „Vorname N.“. Wer bei einem Event dabei ist, sehen nur die Teilnehmenden und der
        Organisator. Mehr dazu in den <Link to="/datenschutz">Datenschutzhinweisen</Link>.
      </p>
      <h3>Was, wenn ein Event abgesagt oder geändert wird?</h3>
      <p>Abgesagte Events bleiben mit Grund sichtbar. Ändern sich Termin oder Ort, steht das deutlich im Event.</p>
      <h3>Mir kommt ein Event komisch vor.</h3>
      <p>
        Nutze „Melden“ im Event – wir sehen uns das an. Was wir voneinander erwarten, steht in den{' '}
        <Link to="/regeln">Community-Regeln</Link>.
      </p>
      <p>
        <Link to="/entdecken" className="btn btn-primary">Events entdecken</Link>
      </p>
    </div>
  )
}

export function RulesPage() {
  return (
    <div className="page page--narrow legal">
      <h1 className="page-title">Community-Regeln</h1>
      <p>Hobbook lebt davon, dass Leute sich aufeinander verlassen können. Ein paar einfache Regeln:</p>
      <h2>Miteinander</h2>
      <ul>
        <li>Sei fair und freundlich – auf dem Platz und daneben. Alle Niveaus sind willkommen, wenn das Event es sagt.</li>
        <li>Wer zusagt, kommt. Wenn es nicht klappt, tritt rechtzeitig aus, damit der Platz frei wird.</li>
        <li>Als Organisator: Halte Angaben aktuell und sage ab, statt einfach nicht zu erscheinen.</li>
      </ul>
      <h2>Sicher treffen</h2>
      <ul>
        <li>Triff dich an öffentlichen Orten und sag jemandem Bescheid, wohin du gehst.</li>
        <li>Du machst auf eigene Verantwortung mit. Achte auf dich, deine Ausrüstung und das Wetter.</li>
        <li>Events sind kostenlos. Zahle nichts im Voraus und gib keine privaten Daten heraus.</li>
        <li>Wer unter 18 ist, spricht die Teilnahme am besten mit den Eltern ab.</li>
      </ul>
      <h2>Nicht erlaubt</h2>
      <ul>
        <li>Werbung, kommerzielle Angebote und Spam.</li>
        <li>Beleidigungen, Diskriminierung oder Belästigung.</li>
        <li>Falsche Angaben zu Ort, Zeit oder Art des Events.</li>
      </ul>
      <p>
        Fällt dir etwas auf, nutze „Melden“ im Event. Gemeldete Events werden geprüft und können entfernt werden.
      </p>
    </div>
  )
}
