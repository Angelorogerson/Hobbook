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
        <li>
          Stammspiele: deine Mitgliedschaft, deine Antworten („dabei“ / „diesmal nicht“, mit Zeitpunkt), deinen Platz auf
          einer Warteliste und ob du ein Stammspiel stummgeschaltet hast.
        </li>
        <li>
          Nach einem Spiel: ob Organisator:innen dich als nicht erschienen eingetragen haben und ob du widersprochen
          hast.
        </li>
        <li>
          Wenn du jemanden meldest oder gemeldet wirst: die Meldung (Grund, optionaler Text). Meldungen sieht nur die
          Moderation. Organisator:innen eines Stammspiels können Mitglieder entfernen und sperren; gespeichert wird dann,
          wer gesperrt ist.
        </li>
        <li>Benachrichtigungen in der App (werden nach 60 Tagen automatisch gelöscht) und deine E-Mail-Einstellung.</li>
        <li>Wenn du Push aktivierst: die technische Push-Adresse deines Browsers (keine Telefonnummer).</li>
        <li>Ob und wann du deine E-Mail-Adresse bestätigt hast.</li>
        <li>
          Fragen und Infos, die du unter einem Event schreibst. Sie sind mit deinem Namen als „Vorname N.“ für alle
          sichtbar, die das Event öffnen können. Du kannst sie jederzeit löschen.
        </li>
        <li>Such-Alarme: die Stadt und, wenn gewählt, die Sportart, zu der du über neue Events informiert werden willst.</li>
        <li>
          Feedback, das du uns schickst: dein Text, die Art des Feedbacks, die Seite, von der du kamst, und – wenn du
          angemeldet bist – dein Konto. Das sieht nur die Moderation.
        </li>
      </ul>
      <h2>E-Mails und Benachrichtigungen</h2>
      <p>
        Wir schreiben dir nur zu Spielen, bei denen du Mitglied oder angemeldet bist: Einladung, eine Erinnerung, wenn
        du noch nicht geantwortet hast, ob das Spiel stattfindet, eine Erinnerung kurz vorher, sowie Absagen und
        Änderungen. Keine Werbung, keine Newsletter. E-Mails schaltest du im <Link to="/profil#benachrichtigungen">Profil</Link>{' '}
        ab, einzelne Stammspiele schaltest du auf ihrer Seite oder über den Link in jeder E-Mail stumm. Die Knöpfe in
        E-Mails („Ich bin dabei“) enthalten einen signierten Link, der nur für dich und nur bis zum Spielbeginn gilt.
      </p>
      <p>
        Außerdem schreiben wir dir, wenn du es auslöst oder eingestellt hast: den Link zum Bestätigen deiner
        E-Mail-Adresse nach der Registrierung, den Link zum Zurücksetzen deines Passworts (60 Minuten gültig; gespeichert
        wird nur ein Prüfwert, nicht der Link), Nachrichten von Organisator:innen an alle, die bei einem Event dabei
        sind, und Hinweise zu deinen Such-Alarmen.
      </p>
      <h2>Kalender-Abo</h2>
      <p>
        Im Profil kannst du einen persönlichen Kalender-Link erzeugen. Er enthält einen geheimen Schlüssel; wer den Link
        kennt, sieht deine Termine (Titel, Zeit, Ort), aber keine Namen anderer. Mit „Link erneuern“ wird der alte Link
        sofort ungültig. Kalender-Apps rufen den Link regelmäßig von unserem Server ab.
      </p>
      <h2>Deine Daten herunterladen</h2>
      <p>
        Im <Link to="/profil">Profil</Link> unter „Deine Daten“ kannst du jederzeit eine Kopie der Daten herunterladen,
        die wir zu deinem Konto gespeichert haben.
      </p>
      <h2>Verlässlichkeit</h2>
      <p>
        Auf deinem öffentlichen Profil steht, wie viele Spiele du in den letzten 12 Monaten zugesagt hast, wie oft du
        als nicht erschienen eingetragen wurdest (ohne Widerspruch) und wie oft du nach der Antwortfrist abgesagt hast.
        Andere sehen das erst ab 3 Spielen. Es gibt keine Sterne oder Bewertungen.
      </p>
      <h2>Mindestalter</h2>
      <p>Hobbook richtet sich an Personen ab 16 Jahren. Ein Konto darf nur anlegen, wer mindestens 16 Jahre alt ist.</p>
      <h2>Was öffentlich sichtbar ist</h2>
      <p>
        Bei Events wird der Name des Organisators nur als „Vorname N.“ gezeigt. Die Namen der Teilnehmenden sehen nur
        Organisator, Teilnehmende und die Moderation; bei Stammspielen außerdem die Mitglieder. Wer nicht Mitglied ist,
        sieht nur Zahlen. E-Mail-Adressen werden nie öffentlich angezeigt.
      </p>
      <h2>Standort</h2>
      <p>
        Dein Standort wird nur abgefragt, wenn du „In meiner Nähe“ antippst und dein Browser es erlaubt. Für die Suche
        wird die Position auf etwa einen Kilometer gerundet an unseren Server gesendet und dort nicht gespeichert.
      </p>
      <h2>Gemerkte Events</h2>
      <p>
        Wenn du dir Events merkst, speichern wir diese Liste in deinem Konto. Sie ist nur für dich sichtbar und wird mit
        deinem Konto gelöscht.
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
        <li>
          „Route“ bei einem Event ist ein Link zu Google Maps. Erst wenn du ihn antippst, öffnet sich Google Maps und
          erhält den Treffpunkt des Events.
        </li>
        <li>
          E-Mails verschicken wir über den Versanddienst Brevo (Sendinblue SAS, Paris). Dafür erhält Brevo deine
          E-Mail-Adresse, deinen Namen und den Inhalt der Nachricht.
        </li>
        <li>
          Die Wettervorhersage für ein Spiel fragt unser Server bei Open-Meteo ab; übertragen werden nur die
          Koordinaten des Treffpunkts, keine Daten über dich.
        </li>
        <li>
          Push-Nachrichten laufen über den Push-Dienst deines Browsers (z. B. Google, Mozilla oder Apple), falls du
          Push aktivierst.
        </li>
        <li>Schriften werden von unserem eigenen Server geladen, nicht von Google.</li>
      </ul>
      <h2>Speicherung im Browser</h2>
      <p>
        Nach der Anmeldung wird ein Sitzungs-Token im lokalen Speicher deines Browsers abgelegt, außerdem deine Wahl
        für das helle oder dunkle Farbschema. Damit du beim nächsten Besuch dort weitermachst, wo du gesucht hast, merkt
        sich dein Browser außerdem die zuletzt gesuchte Stadt oder deinen auf etwa einen Kilometer gerundeten Standort;
        mit „Zurücksetzen“ in der Suche löschst du das wieder. Wir verwenden keine Tracking- oder Werbe-Cookies.
      </p>
      <h2>Löschung</h2>
      <p>
        Du kannst dein Konto jederzeit im <Link to="/profil">Profil</Link> löschen. Deine anstehenden Events mit
        Anmeldungen werden dann abgesagt. Organisierst du ein Stammspiel, übernimmt es dein Co-Host; ohne Co-Host endet
        es und der offene Termin wird abgesagt. Deine Zusagen, Antworten, Mitgliedschaften und Benachrichtigungen werden
        gelöscht, frei werdende Plätze gehen an die Warteliste. Auch deine Fragen und Infos unter Events, deine
        Such-Alarme und dein Kalender-Link werden gelöscht; Feedback bleibt ohne Bezug zu deinem Konto erhalten. Alle
        übrigen personenbezogenen Daten werden entfernt.
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

      <h2>Stammspiele: jede Woche, ohne Gruppenchat-Chaos</h2>
      <p>
        Spielt ihr jede Woche zur gleichen Zeit? Leg ein Stammspiel an und teile den Link einmal in eurer Gruppe. Ab
        dann öffnet Hobbook jede Woche den nächsten Termin, fragt alle „Bist du dabei?“ (Antwort mit einem Tipp, auch
        direkt aus der E-Mail), erinnert nur die, die noch nicht geantwortet haben, und entscheidet zur Antwortfrist:
        Genug Zusagen – es findet statt. Zu wenige – alle bekommen Bescheid, dass es ausfällt. Ist ein Spiel voll, kommst
        du auf die Warteliste und rückst automatisch nach.
      </p>

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
      <p>
        Alle Angemeldeten bekommen sofort Bescheid – in der App und per E-Mail. Abgesagte Events bleiben mit Grund
        sichtbar.
      </p>
      <h3>Und bei schlechtem Wetter?</h3>
      <p>
        Für die nächsten zwei Tage zeigt jedes Spiel die Wettervorhersage. Bei Unwetter bekommen die
        Organisator:innen eine Warnung und können mit einem Tipp absagen. Hobbook sagt nie von selbst wegen Wetter ab.
      </p>
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
        <li>
          Wer zusagt, kommt. Wenn es nicht klappt, sag vor der Antwortfrist ab – dann rückt jemand von der Warteliste
          nach.
        </li>
        <li>
          Organisator:innen können bis 24 Stunden nach einem Spiel eintragen, wer trotz Zusage nicht da war. Wer
          eingetragen wird, bekommt Bescheid und kann innerhalb von 24 Stunden widersprechen; dann zählt der Eintrag
          nicht. Bitte nutze das ehrlich und nur für echte No-Shows.
        </li>
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
      <h2>Warteliste und Nachrücken</h2>
      <ul>
        <li>Ist ein Spiel voll, kannst du dich auf die Warteliste setzen. Wird ein Platz frei, rückt die erste Person automatisch nach.</li>
        <li>
          Wird ein Platz erst in den letzten 6 Stunden vor Beginn frei, musst du innerhalb von 30 Minuten bestätigen –
          sonst geht der Platz an die nächste Person. So steht niemand mit einem Platz da, den er nicht mehr nutzen kann.
        </li>
      </ul>
      <h2>Stammspiele: entfernen und sperren</h2>
      <p>
        Organisator:innen und Co-Hosts können Mitglieder entfernen und, wenn nötig, sperren. Gesperrte können nicht
        wieder beitreten oder antworten. Bei ernsten Problemen melde die Person über ihr Profil („Person melden“); die
        Moderation kann Konten sperren.
      </p>
      <p>
        Fällt dir etwas auf, nutze „Melden“ im Event. Gemeldete Events werden geprüft und können entfernt werden.
      </p>
    </div>
  )
}
