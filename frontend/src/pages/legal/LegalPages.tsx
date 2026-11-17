import { Link } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import './legal.css'

/**
 * Datenschutz describes what this codebase actually does.
 * Operator details (name, address, contact) are deliberately NOT invented:
 * they must be filled in by the operator before a public launch.
 */
export function PrivacyPage() {
  return (
    <div className="page page--narrow legal">
      <h1 className="page-title">Datenschutz</h1>
      <p className="notice notice-warning">
        <AlertTriangle size={18} aria-hidden="true" />
        Entwurf: Verantwortliche Stelle und Kontaktdaten müssen vom Betreiber vor dem öffentlichen Start ergänzt und
        rechtlich geprüft werden.
      </p>
      <h2>Welche Daten wir verarbeiten</h2>
      <ul>
        <li>Konto: Name, E-Mail-Adresse, Passwort (nur als sicherer Hash gespeichert), optional Stadt und Lieblingssportarten.</li>
        <li>Events, die du erstellst: Titel, Beschreibung, Zeit, Ort mit Koordinaten.</li>
        <li>Teilnahmen an Events und Meldungen, die du abschickst.</li>
      </ul>
      <h2>Was öffentlich sichtbar ist</h2>
      <p>
        Bei Events wird der Name des Organisators nur als „Vorname N.“ gezeigt. Die Namen der Teilnehmenden sehen nur
        Organisator, Teilnehmende und die Moderation. E-Mail-Adressen werden nie öffentlich angezeigt.
      </p>
      <h2>Dienste Dritter</h2>
      <ul>
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
        Nach der Anmeldung wird ein Sitzungs-Token im lokalen Speicher deines Browsers abgelegt. Wir verwenden keine
        Tracking- oder Werbe-Cookies.
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
      <p className="notice notice-warning">
        <AlertTriangle size={18} aria-hidden="true" />
        Die Angaben nach § 5 DDG (Name, Anschrift, Kontakt des Betreibers) sind noch nicht hinterlegt und müssen vor
        dem öffentlichen Start ergänzt werden.
      </p>
    </div>
  )
}

export function AboutPage() {
  return (
    <div className="page page--narrow legal">
      <h1 className="page-title">Über Hobbook</h1>
      <p>
        Hobbook hilft dir, Sport in deiner Nähe zu finden: Sieh auf Liste und Karte, wo etwas los ist, mach mit – oder
        starte selbst ein Event. Alle Events sind kostenlos und werden von der Community organisiert.
      </p>
      <p>
        Hobbook ist ein Community-Projekt. Es verkauft keine Plätze und vermittelt keine kostenpflichtigen Buchungen.
      </p>
      <p>
        <Link to="/entdecken" className="btn btn-primary">Events entdecken</Link>
      </p>
    </div>
  )
}
