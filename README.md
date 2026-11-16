# Hobbook - Sports Venue Booking & Community Platform

Hobbook ist eine Fullstack-Webanwendung zum Buchen von Sportstätten und zum Erstellen/Beitreten von spontanen Sportveranstaltungen. Das System verbindet Nutzer mit verfügbaren Venues und ermöglicht Spieler, zufällige Matches zu organisieren.

---

## Inhaltsverzeichnis

1. [Hauptfunktionen](#hauptfunktionen)
2. [Technischer Stack](#technischer-stack)
3. [Installation & Quick Start](#installation--quick-start)
4. [Projektstruktur](#projektstruktur)
5. [Datenmodell](#datenmodell)
6. [API-Endpoints](#api-endpoints)
7. [Benutzerrollen & Zugriff](#benutzerrollen--zugriff)
8. [Authentifizierung](#authentifizierung)
9. [Konfiguration & Umgebungsvariablen](#konfiguration--umgebungsvariablen)

---

## Hauptfunktionen

### Benutzer-Features

1. Registrierung und Login mit E-Mail-Authentifizierung
2. Profilverwaltung (Stadt, Telefon, Sportarten-Interessen)
3. Venues durchsuchen und filtern nach Sport-Typ
4. Venue-Details anschauen (Adresse, Öffnungszeiten, Ausstattung, Preisangabe)
5. Zeitslots-Verfügbarkeit für Venues prüfen
6. Buchungen erstellen für Venues mit verfügbaren Zeitslots
7. Eigene Bookings verwalten (anzeigen, stornieren)
8. Connect Events erstellen (spontane Spiele)
9. Connect Events durchsuchen und filtern (nach Sport, Zeit, Skill-Level)
10. Bei Events beitreten und austreten
11. Favoriten speichern (nur Venues)
12. Dashboard mit Übersicht persönlicher Aktivitäten

### Admin-Features

1. Venues erstellen, bearbeiten, löschen
2. Alle Bookings einsehen und verwalten
3. Connect Events moderieren (genehmigen, ablehnen)
4. Alle Events und Bookings übersehen

---

## Technischer Stack

Frontend:
- React 18 mit TypeScript
- Vite als Build-Tool
- Axios für HTTP-Requests
- Context API für State Management
- CSS-Module für Styling
- React Router für Navigation

Backend:
- Node.js mit Express.js
- Port: 5000
- Middleware: Helmet (Sicherheit), CORS, Morgan (Logging), JWT-Authentication
- Mongoose als ODM für MongoDB

Datenbank:
- MongoDB Atlas (Cloud-Datenbank)
- Collections: User, Venue, Booking, ConnectEvent, Favorite

---

## Installation & Quick Start

### Voraussetzungen

- Node.js 16+ (https://nodejs.org/)
- MongoDB Atlas Account (kostenloses Tier: https://www.mongodb.com/cloud/atlas)
- Git (https://git-scm.com/)
- MongoDB Database Tools (für Datenbank-Import: https://www.mongodb.com/try/download/database-tools)

### Schritt 1: Projekt klonen

```bash
git clone <repository-url>
cd hobbook
```

### Schritt 2: Backend setup

```bash
cd backend

# Dependencies installieren
npm install

# .env-Datei erstellen und konfigurieren
# (siehe Abschnitt "Konfiguration & Umgebungsvariablen")
```

### Schritt 3: Frontend setup

```bash
cd ../frontend

# Dependencies installieren
npm install
```

### Schritt 4: Datenbank konfigurieren

Siehe README_MONGODB.md für detaillierte MongoDB Atlas-Setup-Anleitung.

Nach Setup und Datenimport:

### Schritt 5: Anwendung starten

Terminal 1 - Backend:
```bash
cd backend
npm start
# Output: Server läuft auf Port 5000
```

Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
# Output: Local: http://localhost:5174
```

### Schritt 6: Browser öffnen

http://localhost:5174

### Test-Accounts

Admin-Account:
- Email: admin@admin.com
- Passwort: admin1

Beispiel-Nutzer:
- Email: user@example.com
- Passwort: password123

---

## Projektstruktur

### Frontend

```
frontend/
├── src/
│   ├── api/                          Axios-Konfiguration & API-Calls
│   │   ├── axiosInstance.ts          Base-Konfiguration mit JWT-Interceptor
│   │   ├── authApi.ts                Register, Login
│   │   ├── venueApi.ts               Venue CRUD & Suche
│   │   ├── bookingApi.ts             Booking CRUD
│   │   ├── connectEventApi.ts        Event Join/Leave/Create
│   │   ├── favoriteApi.ts            Favorites Add/Remove
│   │   └── userApi.ts                User-Profil
│   │
│   ├── components/                   Wiederverwendbare React Components
│   │   ├── common/                   
│   │   │   ├── Button.tsx            Standard Button
│   │   │   ├── Input.tsx             Standard Input-Feld
│   │   │   ├── LoadingSpinner.tsx    Loading-Indikator
│   │   │   ├── ErrorMessage.tsx      Fehler-Anzeige
│   │   │   └── EmptyState.tsx        Leere Liste Anzeige
│   │   │
│   │   ├── layout/
│   │   │   ├── Navbar.tsx            Navigationsleiste
│   │   │   └── ProtectedRoute.tsx    Route-Guard für Auth
│   │   │
│   │   └── venue/
│   │       ├── VenueCard.tsx         Venue-Anzeige Karte
│   │       ├── SearchBar.tsx         Suchfeld
│   │       └── FilterPanel.tsx       Filter-Optionen
│   │
│   ├── pages/                        Seiten (=Routen)
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx
│   │   │   └── RegisterPage.tsx
│   │   │
│   │   ├── main/
│   │   │   ├── HomePage.tsx          Startseite
│   │   │   ├── DashboardPage.tsx     Nutzer-Dashboard
│   │   │   ├── SearchPage.tsx        Venues durchsuchen
│   │   │   ├── VenueDetailPage.tsx   Venue-Details
│   │   │   ├── BookingsPage.tsx      Meine Buchungen
│   │   │   ├── FavoritesPage.tsx     Lieblings-Venues
│   │   │   └── ProfilePage.tsx       Profil-Verwaltung
│   │   │
│   │   ├── connect/
│   │   │   ├── ConnectPage.tsx       Events durchsuchen
│   │   │   └── CreateEventPage.tsx   Event erstellen
│   │   │
│   │   └── admin/
│   │       ├── AdminDashboardPage.tsx  Admin Übersicht
│   │       ├── VenueListAdminPage.tsx  Venues verwalten
│   │       ├── VenueFormPage.tsx       Venue erstellen/bearbeiten
│   │       ├── ConnectEventListAdminPage.tsx  Events genehmigen
│   │       ├── ConnectEventFormAdminPage.tsx  Event bearbeiten
│   │       └── BookingsAdminPage.tsx   Alle Bookings
│   │
│   ├── store/                        State Management (Context API)
│   │   ├── AuthContext.tsx           Auth-State & Login/Logout
│   │   ├── VenueContext.tsx          Venue-State
│   │   └── EventContext.tsx          Event-State
│   │
│   ├── constants/
│   │   ├── config.ts                 API-Base-URL
│   │   └── theme.ts                  Farben, Fonts
│   │
│   ├── App.tsx                       Root-Component mit Routes
│   ├── main.tsx                      Entry-Point
│   └── index.css                     Global Styles
│
├── vite.config.ts
├── tsconfig.json
└── package.json
```

### Backend

```
backend/
├── config/
│   └── db.js                         MongoDB Connection

├── controllers/                      Business-Logik
│   ├── authController.js             Register, Login, Token
│   ├── venueController.js            Venue CRUD
│   ├── bookingController.js          Booking CRUD & Slot-Prüfung
│   ├── connectEventController.js     Event Join/Leave/Create
│   ├── favoriteController.js         Favorite Add/Remove
│   └── userController.js             User-Profil Update

├── middleware/
│   ├── auth.js                       JWT-Validierung
│   ├── isAdmin.js                    Admin-Role Check
│   └── errorHandler.js               Zentrale Fehlerbehandlung

├── models/                           MongoDB Schemas
│   ├── User.js                       User-Schema mit Auth
│   ├── Venue.js                      Venue-Schema
│   ├── Booking.js                    Booking-Schema
│   ├── ConnectEvent.js               Event-Schema
│   ├── Favorite.js                   Favorite-Schema (Venue-Refs)
│   └── index.js                      Exports

├── routes/                           API-Route Definition
│   ├── authRoutes.js                 Auth-Endpoints
│   ├── venueRoutes.js                Venue-Endpoints
│   ├── bookingRoutes.js              Booking-Endpoints
│   ├── connectEventRoutes.js         Event-Endpoints
│   ├── favoriteRoutes.js             Favorite-Endpoints
│   └── userRoutes.js                 User-Endpoints

├── server.js                         Entry-Point
├── .env                              Umgebungsvariablen
└── package.json
```

---

## Datenmodell

### User Collection

```javascript
{
  _id: ObjectId,
  name: String,                    // "Max Mustermann"
  email: String (unique),          // "max@example.com"
  password: String (hashed),       // bcrypt mit 12 Salts
  role: String,                    // "user" oder "admin"
  sports: [String],                // ["football", "basketball"]
  city: String,                    // "Frankfurt"
  phone: String,                   // "+49 123 456789"
  avatar: String or null,          // Profil-Bild URL
  isActive: Boolean,               // true/false
  favorites: [ObjectId],           // Array von Venue-IDs
  createdAt: Date,
  updatedAt: Date
}
```

### Venue Collection

```javascript
{
  _id: ObjectId,
  name: String,                    // "Stadion Frankfurt"
  description: String,
  sport: String,                   // "football", "basketball", oder "both"
  address: {
    street: String,
    city: String,
    zip: String,
    state: String
  },
  location: {
    type: "Point",                 // GeoJSON Point
    coordinates: [Number]          // [longitude, latitude]
  },
  images: [String],                // URLs zu Bildern
  pricePerHour: Number,            // 15.50
  capacity: Number,                // max. Spieler
  status: String,                  // "active", "draft", "archived"
  amenities: [String],             // z.B. "parking", "lighting", "showers"
  openingHours: [                  // Öffnungszeiten pro Tag
    {
      day: String,
      start: String,               // "08:00"
      end: String                  // "22:00"
    }
  ],
  createdAt: Date,
  updatedAt: Date
}
```

### Booking Collection

```javascript
{
  _id: ObjectId,
  user: ObjectId,                  // Nutzer-ID
  venue: ObjectId,                 // Venue-ID
  bookingDate: Date,               // Buchungs-Datum
  startTime: String,               // "09:00"
  endTime: String,                 // "11:00"
  duration: Number,                // Minuten (z.B. 120)
  totalPrice: Number,              // pricePerHour * duration
  status: String,                  // "pending", "confirmed", "cancelled"
  notes: String,                   // Zusätz-Infos
  createdAt: Date,
  updatedAt: Date
}
```

### ConnectEvent Collection

```javascript
{
  _id: ObjectId,
  creator: ObjectId,               // Ersteller-ID
  title: String,                   // "Freitag Fußball"
  sport: String,                   // "football" oder "basketball"
  description: String,
  location: {                      // Veranstaltungs-Ort
    name: String,
    address: String,
    city: String,
    coordinates: {
      type: "Point",
      coordinates: [Number]
    }
  },
  date: Date,                      // Veranstaltungs-Datum
  startTime: String,               // "18:00"
  endTime: String,                 // "20:00"
  maxParticipants: Number,         // z.B. 8
  participants: [ObjectId],        // Array von User-IDs
  skillLevel: String,              // "beginner", "intermediate", "advanced", "all"
  status: String,                  // "open", "full", "cancelled"
  createdAt: Date,
  updatedAt: Date
}
```

### Favorite Collection

```javascript
{
  _id: ObjectId,
  user: ObjectId,                  // Nutzer-ID
  venue: ObjectId,                 // Venue-ID
  addedAt: Date
}
```

---

## API-Endpoints

### Authentifizierung

| Methode | Endpoint | Beschreibung | Authentifizierung |
|---------|----------|-------------|-------------------|
| POST | /api/auth/register | Neues Konto erstellen | Keine |
| POST | /api/auth/login | Login & JWT-Token erhalten | Keine |

### Venues

| Methode | Endpoint | Beschreibung | Authentifizierung |
|---------|----------|-------------|-------------------|
| GET | /api/venues | Alle Venues anzeigen | Keine |
| GET | /api/venues/:id | Venue-Details anschauen | Keine |
| POST | /api/venues | Neue Venue erstellen | Admin |
| PUT | /api/venues/:id | Venue aktualisieren | Admin |
| DELETE | /api/venues/:id | Venue löschen | Admin |

### Bookings

| Methode | Endpoint | Beschreibung | Authentifizierung |
|---------|----------|-------------|-------------------|
| POST | /api/bookings | Buchung erstellen | Nutzer |
| GET | /api/bookings/my | Meine Buchungen anschauen | Nutzer |
| GET | /api/bookings/venue/:venueId/slots | Verfügbare Zeitslots | Keine |
| GET | /api/bookings/:id | Buchungs-Details | Nutzer |
| PUT | /api/bookings/:id/cancel | Buchung stornieren | Nutzer |
| GET | /api/bookings | Alle Bookings (Admin-Übersicht) | Admin |

### Connect Events

| Methode | Endpoint | Beschreibung | Authentifizierung |
|---------|----------|-------------|-------------------|
| GET | /api/events | Alle Events anschauen | Nutzer |
| GET | /api/events/:id | Event-Details | Nutzer |
| POST | /api/events | Event erstellen | Nutzer |
| PUT | /api/events/:id/join | Bei Event beitreten | Nutzer |
| PUT | /api/events/:id/leave | Event verlassen | Nutzer |
| DELETE | /api/events/:id | Event löschen | Creator oder Admin |
| PUT | /api/events/:id/approve | Event genehmigen | Admin |
| PUT | /api/events/:id/reject | Event ablehnen | Admin |

### Favorites

| Methode | Endpoint | Beschreibung | Authentifizierung |
|---------|----------|-------------|-------------------|
| GET | /api/favorites | Meine Favoriten | Nutzer |
| POST | /api/favorites | Zu Favoriten hinzufügen | Nutzer |
| DELETE | /api/favorites/:venueId | Aus Favoriten entfernen | Nutzer |

### Nutzer

| Methode | Endpoint | Beschreibung | Authentifizierung |
|---------|----------|-------------|-------------------|
| GET | /api/users/me | Mein Profil | Nutzer |
| PUT | /api/users/me | Profil aktualisieren | Nutzer |

---

## Benutzerrollen & Zugriff

### Nutzer-Rolle (Standard)

Berechtigungen:
- Sich registrieren und anmelden
- Venues durchsuchen und Details anschauen
- Bookings erstellen und verwalten (eigene)
- Events erstellen, durchsuchen, beitreten, verlassen
- Favoriten speichern und verwalten
- Profil bearbeiten

### Admin-Rolle

Berechtigungen:
- Alle Funktionen der Nutzer-Rolle
- Venues erstellen, bearbeiten, löschen
- Alle Bookings einsehen und verwalten
- Events moderieren (genehmigen/ablehnen)
- Admin-Dashboard mit Übersichten

Zugang zum Admin-Dashboard:
- Login mit Admin-Account (admin@admin.com / admin1)
- Navigation zu /admin/dashboard

---

## Authentifizierung

Das System verwendet JWT (JSON Web Tokens) für stateless Authentifizierung:

### Login-Ablauf

1. Nutzer füllt Email + Passwort aus
2. Backend validiert Daten und prüft Passwort (bcrypt-Vergleich)
3. Bei erfolgreicher Authentifizierung: JWT-Token wird generiert
4. Token wird im Browser localStorage gespeichert
5. Token wird bei jedem API-Request im Authorization-Header mitgesendet
6. Backend validiert Token und identifiziert Nutzer

### Token-Format

Header:
```
Authorization: Bearer <jwt-token>
```

Token-Lebensdauer: 30 Tage

### Passwort-Sicherheit

- Passwörter werden mit Bcrypt gehashed (12 Salt-Rounds)
- Passwörter werden niemals im Klartext übertragen
- Mindestlänge: 6 Zeichen

---

## Konfiguration & Umgebungsvariablen

### Backend (.env)

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB Atlas
MONGODB_URI=mongodb+srv://rogers:mongodb@hobbook.sgfzn1e.mongodb.net/hobbook?retryWrites=true&w=majority

# JWT
JWT_SECRET=hobbook_super_secret_jwt_key_change_this_in_prod_2024
JWT_EXPIRES_IN=30d

# CORS
CLIENT_URL=http://localhost:8081
```

Erklärung:
- MONGODB_URI: Connection String zur MongoDB Atlas Datenbank
- JWT_SECRET: Geheimer Schlüssel für Token-Signatur (in Produktion ändern!)
- JWT_EXPIRES_IN: Token verfällt nach 30 Tagen
- CLIENT_URL: Erlaubte Frontend-URL für CORS

### Frontend (Konfiguration)

Die API-Base-URL wird in `src/constants/config.ts` definiert:
```typescript
const API_BASE_URL = 'http://localhost:5000/api';
```

---

## Geschäftslogik Details

### Venue Booking

Wenn ein Nutzer versucht, einen Zeitslot zu buchen:
1. System prüft, ob Zeitslot für Venue verfügbar ist
2. System validiert, dass Booking-Zeit in der Zukunft liegt
3. Booking wird erstellt mit Status "pending"
4. Nutzer kann später Booking stornieren

### Connect Events

Wenn ein Nutzer einem Event beitritt:
1. System prüft, ob Event nicht voll ist
2. System prüft, ob Nutzer noch nicht beigetreten ist
3. Nutzer wird zur participants[]-Liste hinzugefügt
4. Falls maxParticipants erreicht: Status wechselt zu "full"

Wenn ein Nutzer ein Event verlässt:
1. System prüft, ob Nutzer Mitglied ist
2. System prüft, dass Nutzer nicht der Creator ist (Creator können nicht austreten)
3. Nutzer wird aus participants[]-Liste entfernt
4. Falls Status "full" war: Status wechselt zurück zu "open"

### Favorites

Nur Venues können als Favoriten gespeichert werden. Events werden nicht favorisiert—Beitritt ist das Zeichen von Interesse.

---

## Sicherheit

Das System implementiert folgende Sicherheitsmaßnahmen:

- JWT-basierte Authentifizierung für API-Zugriff
- Bcrypt-Passwort-Hashing mit 12 Salt-Rounds
- Role-based Access Control (RBAC) für Admin-Funktionen
- Helmet.js für HTTP-Security-Headers
- CORS-Validierung für Cross-Origin-Requests
- Input-Validierung durch Mongoose-Schemas
- Fehlerbehandlung ohne Sicherheitslecks

---

## MongoDB Atlas Setup

Detaillierte Anleitung siehe **README_MONGODB.md**

Kurz:
1. MongoDB Atlas Account erstellen
2. kostenlosen Cluster starten
3. Database User erstellen (beispiel: rogers/mongodb)
4. IP-Whitelisting auf 0.0.0.0/0 setzen (für Entwicklung)
5. Connection String kopieren und in .env eintragen
6. mongodump durchführen um /dump zu erstellen
7. mongorestore für Import nutzen

---

## Wichtige Hinweise

Dieses Projekt demonstriert Fullstack-Webentwicklung mit:
- Frontend-State-Management via Context API
- RESTful API Design
- Authentifizierung und Autorisierung
- NoSQL Datenbankdesign
- Responsive Web-Design
- Production-ready Code-Struktur

Für Produktion notwendige Optimierungen:
- JWT_SECRET sollte aus Environment-Variable kommen
- IP-Whitelisting auf spezifische Server begrenzen
- Starkes Passwort für Database User
- HTTPS erzwingen
- Rate Limiting auf API-Endpoints
- Input-Validierung erweitern
- Error-Messages für Nutzer bessern
- Logging und Monitoring setup
- Datenbank-Backups automatisieren

---

Version: 1.0
Letztes Update: März 2026

### Problemstellung
Sportstättenverwaltung ist fragmentiert: Die Buchung von Plätzen erfolgt oft über verschiedene kanäle, während spontane Spielgruppen keine zentrale Anlaufstelle haben. **Hobbook** löst diese Probleme durch eine vereinheitlichte, benutzerfreundliche Plattform.

### Lösung
Hobbook ist eine **Zwei-Säulen-Plattform**:

| Säule | Beschreibung |
|-------|-------------|
| **Venue Booking** | Nutzer können Sportstätten reservieren und ihre Lieblingsorte speichern |
| **Connect Events** | Spieler können spontane Matches erstellen und beitreten, um lokale Mitstreiter zu finden |

### Vision
Eine lebendige Community-Plattform für Sportbegeisterte, die **Orte und Menschen verbindet**—für spontane Fußball- und Basketball-Spiele, organisiert von der Community, für die Community.

---

## Kern-Logik & Geschäftslogik

### 1. Venue-Booking-System

**Wie es funktioniert:**

```
Sportstättenbetreiber
        ↓
[Admin erstellt Venue mit Details]
        ↓
Frontend: Nutzer durchsucht Venues nach:
  - Sport (Fußball, Basketball)
  - Amenities (Parkplatz, Beleuchtung, Umkleiden)
  - Preisen und Öffnungszeiten
        ↓
[Nutzer wählt Slot & erstellt Booking]
        ↓
Backend: Booking wird gespeichert
  - Check: Zeitslot nicht doppelt gebucht
  - Status: 'pending' → 'confirmed' → 'completed'
        ↓
Nutzer speichert Venue als Favorit für Wiederverwendung
```

**Validierungen:**
- Keine Doppelbuchungen in demselben Zeitslot
- Nutzer können nur zukünftige Buchungen erstellen
- Admins können Bookings verwalten und stornieren

---

### 2. Connect Events System

**Wie es funktioniert:**

```
Spieler A möchte Match:
        ↓
[Event erstellen: Datum, Uhrzeit, Ort, Skill-Level, max. Spieler]
        ↓
Event Status: 'open' (wenn Plätze frei)
        ↓
Andere Spieler [Beitreten]
        ↓
Backend Logic:
  - participants[] Array wird aktualisiert
  - Bei maxParticipants erreicht: Status → 'full'
  - Nur Basis-Spieler können Event verlassen
  - Bei Verlassen anderer: Status 'full' → 'open'
        ↓
Event Status: 'full' oder vorhanden
  - Weitere Beitritte werden abgelehnt
```

**Geschäftslogik:**
- **Creator-Bindung:** Der Ersteller kann das Event nicht verlassen (verhindert Chaos)
- **Automatische Statusübergänge:** 'open' ↔ 'full' basierend auf Teilnehmerzahl
- **Skill-Matching:** Events filtern nach Anfänger/Mittel/Fortgeschritten

---

### 3. Favorites & Persistierung

**Kern-Konzept:**

| Favoriten-Typ | Speicherung | Zweck |
|---------------|------------|--------|
| **Venue Favorites** | `User.favorites[]` (Venue Refs) | Schneller Zugriff auf lieblings-Sportstätten |
| **Event Join** | `ConnectEvent.participants[]` | Tracking von Event-Mitgliedern |

⚠️ **Wichtig:** Events können nicht als "Favorit" gespeichert werden—**Beitreten ist das Favorisieren** (via participants Array).

---

### 4. Admin-System

**Rollen:**

| Rolle | Permissions |
|-------|------------|
| **User** | Venues buchen, Events erstellen/beitreten, Favoriten speichern |
| **Admin** | Alles + Venues/Events verwalten, Bookings genehmigen, User verwalten |

**Admin-Dashboard Features:**
- Alle Venues anzeigen & moderieren
- Bookings-Übersicht und -Verwaltung
- Events genehmigen/ablehnen
- Nutzer-Management

---

## Technische Architektur

### Tech-Stack

```
┌─────────────────────────────────────────────────────┐
│                 FRONTEND (Client)                   │
│  React 18 + TypeScript + Vite + Axios              │
│  Context API für State Management                   │
│  CSS-Module für Styling                             │
└─────────────────────────────────────────────────────┘
                         ↕ HTTP/REST
┌─────────────────────────────────────────────────────┐
│                BACKEND (Server)                     │
│  Node.js + Express.js                              │
│  Port: 5000                                         │
│  Middleware: Helmet, CORS, Morgan, JWT             │
└─────────────────────────────────────────────────────┘
                    ↕ Mongoose ODM
┌─────────────────────────────────────────────────────┐
│          DATABASE (Data Layer)                      │
│  MongoDB Atlas (Cloud)                              │
│  Collections: Users, Venues, Bookings, Events,      │
│              Favorites, ConnectEvents               │
└─────────────────────────────────────────────────────┘
```

### Architekturmuster: Client-Server mit REST API

**Pattern:** Klassisches 3-Tier Model
- **Presentation Layer:** React Frontend (UI/UX)
- **Business Logic Layer:** Express Controllers & Middleware
- **Data Access Layer:** Mongoose Models & MongoDB

### Komponenten-Kommunikation

```
Frontend Browser
     │
     ├─→ [React Context] → State Management (AuthContext, VenueContext, EventContext)
     │
     ├─→ [React Components] → UI Rendering
     │                         ↓
     ├─→ [Axios Interceptors] → Add JWT to Headers
     │
     └──→ HTTP Request (POST/GET/PUT/DELETE)
            │
            ↓
         API Gateway (Backend Server, Port 5000)
            │
            ├─→ [Auth Middleware] → JWT Validation
            ├─→ [Role Middleware] → isAdmin Check
            │
            └──→ [Controllers] → Request Handler
                   │
                   ├─→ [Business Logic] → Validations
                   │
                   └──→ [Mongoose Models] → Query DB
                            │
                            ↓
                      MongoDB Collections
                            │
                            ↓ Response JSON
                      Back to Frontend
```

---

## Features & Funktionalität

### Benutzer-Features

#### 🔐 Authentication & Profil
- ✅ Registrierung mit E-Mail-Validierung
- ✅ Login mit JWT-Token
- ✅ Passworthashing mit Bcrypt (12 Salts)
- ✅ Profilverwaltung (Stadt, Telefon, Avatar, Sportarten)

#### 🏟️ Venue Management
- ✅ Venues durchsuchen & filtern (Sport, Stadt, Amenities)
- ✅ Detailanzeige mit Fotos, Preisen, Öffnungszeiten
- ✅ Venue als Favorit speichern/entfernen
- ✅ Bewertung & Rezensionen (Infrastruktur vorhanden)

#### 📅 Booking System
- ✅ Booking erstellen für verfügbare Zeitslots
- ✅ Buchungen verwalten (Anstehend, Abgeschlossen)
- ✅ Buchungen stornieren mit Rückerstattung
- ✅ Booking-Historie anschauen

#### ⚽ Connect Events
- ✅ Spontane Matches erstellen (Football/Basketball)
- ✅ Events filtern nach Sport, Zeit, Skill-Level
- ✅ Beitreten zu Events (Auto-Status: 'open' → 'full')
- ✅ Events verlassen (mit Creator-Schutz)
- ✅ Event-Details mit allen Teilnehmern anschauen

#### ❤️ Favorites
- ✅ Lieblings-Sportstätten speichern
- ✅ Favoriten-Liste verwalten
- ✅ Quick-Access zu bevorzugten Venues

#### 👨‍💼 Admin Features
- ✅ Admin-Dashboard mit Übersichten
- ✅ Venues erstellen, bearbeiten, löschen
- ✅ Events moderieren (genehmigen/ablehnen)
- ✅ Bookings verwalten und genehmigen
- ✅ Nutzer verwalten

---

## Quick Start

### Voraussetzungen

- **Node.js** 16+ (Download: https://nodejs.org/)
- **MongoDB Atlas Account** (kostenloses Konto: https://www.mongodb.com/cloud/atlas)
- **Git** (Optional, für Versionskontrolle)

### Installation & Setup (5 Minuten)

#### 1️⃣ Repository klonen
```bash
git clone <repository-url>
cd hobbook
```

#### 2️⃣ Backend einrichten
```bash
cd backend

# Dependencies installieren
npm install

# Umgebungsvariablen konfigurieren
# Erstelle Datei: backend/.env
# Inhalt:
# MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/hobbook
# JWT_SECRET=your_secret_key_here
# PORT=5000
# NODE_ENV=development

# Server starten
npm start
# Output: ✓ Server läuft auf Port 5000
```

#### 3️⃣ Frontend einrichten
```bash
cd ../frontend

# Dependencies installieren
npm install

# Vite Development Server starten
npm run dev
# Output: ✓ Local: http://localhost:5174
```

#### 4️⃣ In Browser öffnen
```
http://localhost:5174
```

### Datenbank initialisieren

```bash
# Im Projekt-Hauptverzeichnis
mongorestore \
  --uri "mongodb+srv://user:password@cluster.mongodb.net/hobbook?retryWrites=true&w=majority" \
  --drop \
  ./dump
```

Detaillierte Anleitung siehe: [README_MONGODB.md](README_MONGODB.md)

---

## Datenmodell

### Entity-Relationship Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         USER                                │
├─────────────────────────────────────────────────────────────┤
│ _id, name, email, password (hashed), role, sports[]         │
│ city, phone, avatar, isActive, favorites (Venue Refs)       │
│ timestamps (createdAt, updatedAt)                           │
└──────┬──────────────────┬──────────────────┬────────────────┘
       │                  │                  │
       │ creates          │ participates in  │ has
       │                  │                  │
    ┌──▼────────────┐  ┌──▼──────────┐  ┌──▼──────────┐
    │  CONNECTEVENT │  │  BOOKING    │  │  FAVORITE   │
    │  (1:N)        │  │  (1:N)      │  │  (N:M)      │
    └─────────────┘  └─────────────┘  └─────────────┘
                │
                │ references
                │
            ┌───▼──────────────┐
            │      VENUE       │
            │      (1:N)       │
            └──────────────────┘
```

### Collections im Detail

#### **User Collection**
```javascript
{
  _id: ObjectId,
  name: String,                    // "Max Mustermann"
  email: String (unique),          // "max@example.com"
  password: String (hashed),       // bcrypt hash
  role: String (user|admin),       // default: "user"
  sports: [String],                // ["football", "basketball"]
  city: String,                    // "Frankfurt"
  phone: String,                   // "+49 123 456789"
  avatar: String|null,             // URL or null
  isActive: Boolean,               // true/false
  favorites: [ObjectId → Venue],   // Array of Venue IDs
  createdAt: Date,
  updatedAt: Date
}
```

#### **Venue Collection**
```javascript
{
  _id: ObjectId,
  name: String,                       // "Stadion Frankfurt"
  description: String,
  sport: String (football|basketball|both),
  address: {
    street: String,                   // "Mainplatz 1"
    city: String,                     // "Frankfurt"
    zip: String,                      // "60311"
    state: String                     // "Hessen"
  },
  location: {
    type: "Point",                   // GeoJSON Point
    coordinates: [Number, Number]    // [longitude, latitude]
  },
  images: [String],                  // URLs
  pricePerHour: Number,              // 15.5
  capacity: Number,                  // 20
  status: String (active|draft|archived),
  amenities: [String],               // ["parking", "lighting", "showers"]
  openingHours: [
    {
      day: String,                   // "Monday"
      start: String,                 // "08:00"
      end: String                    // "22:00"
    }
  ],
  createdAt: Date,
  updatedAt: Date
}
```

#### **ConnectEvent Collection**
```javascript
{
  _id: ObjectId,
  creator: ObjectId → User,          // Event ersteller
  title: String,                     // "Freitag Fußball"
  sport: String,                     // "football"
  description: String,
  location: {
    name: String,                    // Venue-Name oder Straße
    address: String,
    city: String,
    coordinates: {
      type: "Point",
      coordinates: [Number, Number]
    }
  },
  date: Date,                        // ISO String
  startTime: String,                 // "18:00"
  endTime: String,                   // "20:00"
  maxParticipants: Number,           // 9
  participants: [ObjectId → User],   // [user1_id, user2_id, ...]
  skillLevel: String,                // "beginner" | "intermediate" | "advanced" | "all"
  status: String,                    // "open" | "full" | "cancelled"
  createdAt: Date,
  updatedAt: Date
}
```

#### **Booking Collection**
```javascript
{
  _id: ObjectId,
  user: ObjectId → User,
  venue: ObjectId → Venue,
  bookingDate: Date,                 // Datum der Buchung
  startTime: String,                 // "09:00"
  endTime: String,                   // "11:00"
  duration: Number,                  // in Minuten: 120
  totalPrice: Number,                // venue.pricePerHour * duration/60
  status: String,                    // "pending" | "confirmed" | "completed" | "cancelled"
  notes: String,
  createdAt: Date,
  updatedAt: Date
}
```

#### **Favorite Collection**
```javascript
{
  _id: ObjectId,
  user: ObjectId → User,
  venue: ObjectId → Venue,
  addedAt: Date
}
```

### Schema-Validierung & Constraints

| Feld | Constraint | Grund |
|------|-----------|-------|
| `email` | UNIQUE, valid email regex | Keine Doppel-Registrierung |
| `password` | MIN 6 chars, hashed | Sicherheit |
| `pricePerHour` | MIN 0 | Realistische Preise |
| `capacity` | MIN 1 | Mindestens 1 Person |
| `maxParticipants` | MIN 1 | Events brauchen Limits |
| `status` (Event) | ENUM (open, full, cancelled) | Konsistente States |
| `role` | ENUM (user, admin) | Klare Permissions |

---

## API-Endpoints

### Authentication

| Method | Endpoint | Beschreibung |
|--------|----------|-------------|
| POST | `/api/auth/register` | Neues Konto erstellen |
| POST | `/api/auth/login` | Login & JWT Token erhalten |

### Venues

| Method | Endpoint | Beschreibung | Auth |
|--------|----------|-------------|------|
| GET | `/api/venues` | Alle Venues anzeigen | ✓ |
| GET | `/api/venues/:id` | Venue Details | ✓ |
| POST | `/api/venues` | Neue Venue erstellen | Admin |
| PUT | `/api/venues/:id` | Venue aktualisieren | Admin |
| DELETE | `/api/venues/:id` | Venue löschen | Admin |

### Bookings

| Method | Endpoint | Beschreibung | Auth |
|--------|----------|-------------|------|
| GET | `/api/bookings` | Meine Bookings | ✓ |
| POST | `/api/bookings` | Neue Booking erstellen | ✓ |
| DELETE | `/api/bookings/:id` | Booking stornieren | ✓ |
| PUT | `/api/bookings/:id/approve` | Booking genehmigen | Admin |

### Connect Events

| Method | Endpoint | Beschreibung | Auth |
|--------|----------|-------------|------|
| GET | `/api/events` | Alle Events anzeigen | ✓ |
| GET | `/api/events/:id` | Event Details | ✓ |
| POST | `/api/events` | Event erstellen | ✓ |
| PUT | `/api/events/:id/join` | Event beitreten | ✓ |
| PUT | `/api/events/:id/leave` | Event verlassen | ✓ |
| DELETE | `/api/events/:id` | Event löschen (Creator/Admin) | ✓ |
| PUT | `/api/events/:id/approve` | Event genehmigen | Admin |
| PUT | `/api/events/:id/reject` | Event ablehnen | Admin |

### Favorites

| Method | Endpoint | Beschreibung | Auth |
|--------|----------|-------------|------|
| GET | `/api/favorites` | Meine Favoriten | ✓ |
| POST | `/api/favorites` | Venue zu Favoriten hinzufügen | ✓ |
| DELETE | `/api/favorites/:venueId` | Aus Favoriten entfernen | ✓ |

### Users

| Method | Endpoint | Beschreibung | Auth |
|--------|----------|-------------|------|
| GET | `/api/users/me` | Mein Profil | ✓ |
| PUT | `/api/users/me` | Profil aktualisieren | ✓ |
| GET | `/api/users` | Alle Users | Admin |
| PUT | `/api/users/:id/role` | User-Rolle ändern | Admin |

---

## Projektstruktur

### Frontend
```
frontend/
├── src/
│   ├── App.tsx                     # Main App Component
│   ├── main.tsx                    # Entry Point
│   ├── index.css                   # Global Styles
│   │
│   ├── api/                        # API Routes
│   │   ├── axiosInstance.ts        # Axios Config + Interceptors
│   │   ├── authApi.ts              # Auth Endpoints
│   │   ├── venueApi.ts             # Venue CRUD & Queries
│   │   ├── bookingApi.ts           # Booking Management
│   │   ├── connectEventApi.ts      # Event Join/Leave
│   │   ├── favoriteApi.ts          # Favorite Operations
│   │   └── userApi.ts              # User Profile
│   │
│   ├── components/
│   │   ├── common/                 # Reusable UI Components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── ErrorMessage.tsx
│   │   │   └── EmptyState.tsx
│   │   │
│   │   ├── layout/                 # Layout Components
│   │   │   ├── Navbar.tsx          # Navigation
│   │   │   └── ProtectedRoute.tsx  # Route Guard
│   │   │
│   │   └── venue/                  # Domain Components
│   │       ├── VenueCard.tsx       # Venue Display
│   │       ├── SearchBar.tsx       # Search Component
│   │       └── FilterPanel.tsx     # Filter UI
│   │
│   ├── pages/                      # Page Components
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx
│   │   │   └── RegisterPage.tsx
│   │   ├── main/
│   │   │   ├── HomePage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── SearchPage.tsx
│   │   │   ├── BookingsPage.tsx
│   │   │   └── FavoritesPage.tsx
│   │   ├── connect/
│   │   │   ├── ConnectPage.tsx     # Event Browse
│   │   │   ├── CreateEventPage.tsx # Event Creation
│   │   │   ├── DetailPage.tsx
│   │   │   └── MyEventsPage.tsx
│   │   └── admin/
│   │       ├── AdminDashboardPage.tsx
│   │       ├── VenueListAdminPage.tsx
│   │       ├── VenueFormPage.tsx
│   │       ├── ConnectEventListAdminPage.tsx
│   │       ├── ConnectEventFormAdminPage.tsx
│   │       └── BookingsAdminPage.tsx
│   │
│   ├── store/                      # State Management
│   │   ├── AuthContext.tsx         # Auth State & Methods
│   │   ├── VenueContext.tsx        # Venue State
│   │   └── EventContext.tsx        # Event State
│   │
│   ├── constants/
│   │   ├── config.ts               # API Base URL, Config
│   │   └── theme.ts                # Color, Font Constants
│   │
│   └── assets/
│       ├── icons/                  # SVG Icons
│       └── images/                 # Static Images

├── index.html                      # HTML Entry
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### Backend
```
backend/
├── config/
│   └── db.js                       # MongoDB Connection Setup
│
├── controllers/                    # Business Logic
│   ├── authController.js           # Register, Login, JWT
│   ├── venueController.js          # Venue CRUD
│   ├── bookingController.js        # Booking Logic
│   ├── connectEventController.js   # Event Join/Leave
│   ├── favoriteController.js       # Favorite Ops
│   └── userController.js           # User Profile Mgmt
│
├── middleware/
│   ├── auth.js                     # JWT Verification
│   ├── isAdmin.js                  # Role Check
│   └── errorHandler.js             # Global Error Handler
│
├── models/
│   ├── index.js                    # Model Exports
│   ├── User.js                     # User Schema + Methods
│   ├── Venue.js                    # Venue Schema
│   ├── Booking.js                  # Booking Schema
│   ├── ConnectEvent.js             # Event Schema
│   └── Favorite.js                 # Favorite Schema
│
├── routes/                         # API Routes Definition
│   ├── authRoutes.js
│   ├── venueRoutes.js
│   ├── bookingRoutes.js
│   ├── connectEventRoutes.js
│   ├── favoriteRoutes.js
│   └── userRoutes.js
│
├── server.js                       # Main Entry Point
├── .env                            # Environment Variables (local)
├── .env.example                    # Example Environment
├── package.json
└── package-lock.json
```

---

## Zielsetzung & Lernziele

### Was demonstriert dieses Projekt?

#### 🎯 Fullstack-Kompetenz

**Frontend:**
- ✅ React-Zustandsverwaltung mit Context API
- ✅ TypeScript für Typ-Sicherheit
- ✅ Responsive Design & CSS-Module
- ✅ Async API-Calls mit Axios & Error-Handling
- ✅ Formular-Validierung & User-Feedback

**Backend:**
- ✅ RESTful API Design & HTTP-Standards
- ✅ Express Middleware-Pattern
- ✅ Authentifizierung & Autorisierung (JWT + Bcrypt)
- ✅ Validation & Error-Handling
- ✅ Datenbank-Modellierung (Mongoose)

**Datenbank:**
- ✅ NoSQL-Design mit MongoDB
- ✅ Relationships & References (1:N, N:M)
- ✅ Indizierung & Query-Optimierung
- ✅ Schema-Validierung

#### 🔐 Sicherheit

- ✅ **Password-Hashing:** Bcrypt mit 12 Salt-Rounds
- ✅ **JWT-Authentication:** Token-basierte API-Security
- ✅ **Authorization:** Role-based Access Control (RBAC)
- ✅ **Input-Validation:** Mongoose Schemas + Controllers
- ✅ **Security Headers:** Helmet.js für HTTP-Security
- ✅ **CORS:** Cross-Origin-Request-Management

#### 💡 Architektur-Muster

- ✅ **MVC-Pattern:** Models, Controllers, Views getrennt
- ✅ **Service Layer:** Business-Logic in Controllers
- ✅ **Repository Pattern:** Mongoose für Data-Access
- ✅ **Middleware Pattern:** Express middlewares für Cross-Cutting Concerns
- ✅ **Context API:** State-Management ohne Redux
- ✅ **Separation of Concerns:** API-Layer, Service-Layer, UI-Layer

#### 🛠️ Best Practices

- ✅ **Error-Handling:** Zentrale Error-Handler, aussagekräftige Messages
- ✅ **Logging:** Morgan HTTP-Logger für Requests
- ✅ **Environment-Config:** Umgebungsvariablen für Sensible Daten
- ✅ **Code-Organisation:** Klare Folder-Struktur & Naming
- ✅ **Async/Await:** Moderne Promise-Handling
- ✅ **RESTful Conventions:** Standard HTTP-Verben & Status-Codes

### Lehr-Outcome

Nach Analyse dieses Projekts verstehen die Schüler:

| Konzept | Verständnis |
|---------|-----------|
| **Request-Response Cycle** | Komplette HTTP-Journey von UI → Server → DB |
| **JWT-Authentication** | Token-Generierung, -Validierung, -Storage |
| **NoSQL vs. SQL** | Design-Entscheidungen bei MongoDB |
| **Stateless APIs** | Warum JWT statt Sessions |
| **Race Conditions** | Booking & Event-Limits (Concurrency) |
| **Input Validation** | Client + Server Side |
| **Error Codes** | 200, 201, 400, 401, 403, 404, 500 verwenden |
| **Data Consistency** | Transaktionen in der Dokumenten-DB |

---

## Entwickler-Dokumentation

### Entwicklungs-Setup

#### IDE & Tools
- **VS Code** (empfohlen)
- **Postman** oder **Insomnia** für API-Testing
- **MongoDB Compass** für Datenbank-Browsing
- **Git** für Versionskontrolle

#### Debugging

**Backend Console Logs:**
```javascript
// server.js
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev')); // HTTP Request Logging
}
console.log('Debug: ', variable); // Manual Logging
```

**Frontend Console Logs:**
```typescript
// axiosInstance.ts
console.error('API Error:', error.response?.data);
console.log('API Success:', response.data);
```

### Build & Deployment

#### Frontend Build (Production)
```bash
cd frontend
npm run build          # Erstellt ./dist Ordner
npm run preview        # Lokaler Preview der Build
```

#### Deployment auf Vercel/Netlify
```bash
# Push zu GitHub → Auto-Deploy via Vercel
git push origin main
```

#### Backend Deployment (z.B. Render, Railway, Heroku)
```bash
# Environment-Variablen in Platform setzen:
# MONGODB_URI, JWT_SECRET, NODE_ENV=production

# Dann deployen:
# Platform wird npm start ausführen
```

### Testing (Optional)

```bash
# Unit Tests (wenn implementiert):
npm test

# Integration Tests:
# Postman Collections oder Cypress E2E-Tests
```

### Conventions & Code-Style

**Naming Conventions:**
- Components: `PascalCase` (UserProfile.tsx)
- Functions: `camelCase` (getUserData())
- Constants: `UPPER_SNAKE_CASE` (MAX_PARTICIPANTS = 9)
- Files: Komponenten als `PascalCase`, Utils als `camelCase`

**Commit-Message Format:**
```
[type] Short description

feat: Add event join functionality
fix: Fixed password validation bug
refactor: Simplified booking logic
docs: Updated README
```

---

## Lizenz & Credits

**Projekt:** Hobbook - Sports Community Platform  
**Version:** 1.0.0  
**Entwickler:** Student  
**Dozent-Feedback Integration:** Ein How-To + Datenbank-Dump für einfaches Onboarding

---

