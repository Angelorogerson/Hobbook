# MongoDB-Setup für Hobbook

Diese Anleitung ermöglicht es deinem Dozenten, die Hobbook-Datenbank in weniger als 5 Minuten in seiner eigenen MongoDB Atlas-Umgebung einzurichten und die Projektdaten zu importieren.

---

## 📋 Inhaltsverzeichnis
1. [Voraussetzungen](#voraussetzungen)
2. [MongoDB Atlas Cloud-Setup](#mongodb-atlas-cloud-setup)
3. [Datenbankdaten importieren](#datenbankdaten-importieren)
4. [Projekt konfigurieren](#projekt-konfigurieren)
5. [Häufige Probleme](#häufige-probleme)
6. [Sicherheit in der Produktion](#sicherheit-in-der-produktion)

---

## Voraussetzungen

Bevor du startest, benötigst du folgende Tools:

### 1. MongoDB Database Tools
**Wichtig:** MongoDB Community Server alleine reicht nicht! Du brauchst die separaten **MongoDB Database Tools**, da `mongorestore` nicht standardmäßig enthalten ist.

**Download und Installation:**
- Gehe zu: https://www.mongodb.com/try/download/database-tools
- Lade die Version für dein Betriebssystem herunter:
  - **Windows:** `mongodb-database-tools-windows-x86_64-*.msi`
  - **macOS:** `mongodb-database-tools-macos-*.tgz`
  - **Linux:** `mongodb-database-tools-ubuntu-*-*.tgz`
- Installiere die Tools und stelle sicher, dass `mongorestore` in deinem PATH ist

**Test:** Öffne Terminal/PowerShell und führe aus:
```bash
mongorestore --version
```
Erfolg: Die Version wird angezeigt.

### 2. Git (falls noch nicht installiert)
- Download: https://git-scm.com/

### 3. Node.js & npm
- Download: https://nodejs.org/ (LTS-Version empfohlen)

---

## MongoDB Atlas Cloud-Setup

### Schritt 1: MongoDB Atlas-Konto erstellen

1. Gehe zu https://www.mongodb.com/cloud/atlas
2. Klicke auf **"Sign Up"** und erstelle ein kostenloses Konto
3. Verifiziere deine E-Mail-Adresse
4. Beantworte die „Tell us about your project"-Fragen (beliebig wählbar)

### Schritt 2: Einen kostenlosen Cluster erstellen

1. Nach dem Login siehst du die **Clusters**-Seite
2. Klicke auf **"Create"** → **"Build a Cluster"**
3. Wähle den **kostenlosen Tier** (M0 - Sandbox)
4. Wähle einen Cloud-Provider und Region (z.B. AWS, Europe (Frankfurt))
5. Klicke auf **"Create Cluster"** und warte 2–3 Minuten auf die Erstellung

### Schritt 3: Datenbankbenutzer erstellen

1. Navigiere zu **"Database Access"** (linkes Menü)
2. Klicke auf **"Add New Database User"**
3. Wähle **"Password"** als Authentifizierungsmethode
4. Erstelle einen eigenen Datenbankbenutzer mit einem starken, einzigartigen Passwort:

   | Feld | Wert |
   |------|------|
   | **Username** | Ein eigener Benutzername, z. B. `hobbook_user` |
   | **Password** | Ein starkes, einzigartiges Passwort (nicht im Repository speichern) |

5. Weise dem Benutzer nur die erforderlichen Rechte auf die Hobbook-Datenbank zu. Vergib keine Atlas-Administratorrechte für die App.
6. Klicke **"Add User"**

⚠️ **Merke dir diese Credentials!** Du brauchst sie gleich für die Connection.

### Schritt 4: IP-Adresse freigeben (WICHTIG!)

1. Gehe zu **"Network Access"** (linkes Menü)
2. Klicke auf **"Add IP Address"**
3. Gib deine aktuelle IP-Adresse frei und klicke **"Confirm"**. Verwende `0.0.0.0/0` nicht dauerhaft; es erlaubt Verbindungen von überall.

✅ Für andere Netzwerke oder wechselnde IP-Adressen musst du die Freigabe gegebenenfalls aktualisieren.

### Schritt 5: Connection String copieren

1. Gehe zurück zu **Clusters** → Klicke auf deinen Cluster
2. Klicke auf **"Connect"**
3. Wähle **"Drivers"**
4. Unter **"Connection String"** siehst du einen String wie:
   ```
   mongodb+srv://<user>:<password>@<cluster-host>/hobbook?retryWrites=true&w=majority
   ```

5. **Copiere diesen String** und ersetze `<password>` mit deinem echten Passwort.

**Beispiel (mit Beispiel-Credentials):**
```
mongodb+srv://<user>:<password>@hobbook.xxxxx.mongodb.net/hobbook?retryWrites=true&w=majority
```

---

## Datenbankdaten importieren

### Schritt 1: Terminal öffnen

1. Öffne Terminal (macOS/Linux) oder PowerShell (Windows)
2. Navigiere zum Hauptverzeichnis des Projekts:
   ```bash
   cd /path/to/hobbook
   ```
   *(oder wo du das Projekt gespeichert hast)*

### Schritt 2: mongorestore-Befehl ausführen

Führe den folgenden Befehl im **Projektwurzeverzeichnis** aus:

```bash
mongorestore \
  --uri "mongodb+srv://<user>:<password>@hobbook.xxxxx.mongodb.net/hobbook?retryWrites=true&w=majority" \
  --drop \
  ./dump
```

**Erklärung der Parameter:**

| Parameter | Bedeutung |
|-----------|-----------|
| `--uri` | Deine vollständige Connection String (mit echten Credentials) |
| `--drop` | Löscht bestehende Collections, bevor neu importiert wird (sauberer Start) |
| `./dump` | Der Pfad zum dump-Ordner im Projekt **relativ zum aktuellen Verzeichnis** |

⏳ **Wartezeit:** Der Import dauert 10–30 Sekunden je nach Datenmenge. Du siehst Progress-Ausgaben wie:
```
2026-03-31T10:15:22.123+0200   [###########.......] hobbook.users 2.1 MB / 4.2 MB
```

✅ **Erfolg:** Das Kommando endet mit eine Zusammenfassung ohne Fehler.

---

## Projekt konfigurieren

### Schritt 1: Umgebungsvariablen einrichten

1. Öffne die Datei `backend/.env` in deinem Texteditor
2. Füge deine Connection String ein:

   **Beispiel `backend/.env`:**
   ```env
   # MongoDB Connection String (dein vollständiger String von Atlas)
   MONGODB_URI=mongodb+srv://<user>:<password>@hobbook.xxxxx.mongodb.net/hobbook?retryWrites=true&w=majority

   # JWT für Authentication
   JWT_SECRET=your_jwt_secret_key_here

   # Port für Backend-Server
   PORT=5000

   # Node Umgebung
   NODE_ENV=development
   ```

3. **Speichere die Datei**

### Schritt 2: Dependencies installieren

```bash
# Im backend-Verzeichnis
cd backend
npm install

# Im frontend-Verzeichnis
cd ../frontend
npm install
```

### Schritt 3: Projekt starten

**Terminal 1 – Backend:**
```bash
cd backend
npm start
```
Erfolg: `✓ Server läuft auf Port 5000`

**Terminal 2 – Frontend:**
```bash
cd frontend
npm run dev
```
Erfolg: `✓ Local: http://localhost:5174`

### Schritt 4: In Browser öffnen

Öffne http://localhost:5174 und teste die Anwendung.

---

## Häufige Probleme

### Problem: `mongorestore: command not found`

**Lösung:**
- MongoDB Database Tools sind nicht installiert (siehe [Voraussetzungen → MongoDB Database Tools](#1-mongodb-database-tools))
- Nach Installation: Terminal neu öffnen
- Test: `mongorestore --version`

### Problem: `MongoAuthenticationError` oder `Error: authentication failed`

**Lösung:**
- ✅ Überprüfe, dass `<password>` in der Connection String durch dein echtes Passwort ersetzt ist
- ✅ Überprüfe die Datenbankbenutzer-Credentials in Atlas unter **Database Access**
- ✅ Stelle sicher, dass die IP `0.0.0.0/0` unter **Network Access** freigegeben ist

### Problem: `Error: ECONNREFUSED 127.0.0.1:27017`

**Lösung:**
- Du verbindest dich mit localhost statt MongoDB Atlas
- ✅ Überprüfe, dass deine `.env` die **vollständige Atlas Connection String** (mit `mongodb+srv://`) enthält, nicht die lokale

### Problem: Fehler beim Datenimport: `database error: code 13, errmsg: 'not authorized on admin to execute command...`

**Lösung:**
- Der Datenbankbenutzer hat nicht genug Rechte
- ✅ Gehe zu **Database Access** in Atlas
- ✅ Lösche den Benutzer und erstelle einen neuen mit **"Atlas Admin"** Role

### Problem: Verbindung zu Atlas funktioniert nicht nach 5 Minuten

**Lösung:**
- Atlas Cluster braucht manchmal 2–3 Minuten zum Starten
- ✅ Gehe zu **Clusters** und überprüfe den Status (sollte grün sein)
- ✅ Warte noch 1–2 Minuten und versuche erneut

---

## Sicherheit in der Produktion

⚠️ **WICHTIG:** Die Settings in dieser Anleitung sind für die **lokale Entwicklung und Dozenten-Korrektur** optimiert, nicht für Production!

### Für eine echte Produktion:

| Setting | Entwicklung | Production |
|---------|------------|-----------|
| **IP-Whitelisting** | `0.0.0.0/0` (überall) | Nur deine Server-IPs |
| **Database User** | Ein universeller User | Ein User pro Anwendung mit minimalen Rechten |
| **Password** | Beispiel-Passwort OK | Starkes Passwort! (30+ Zeichen) |
| **Connection Pooling** | Nicht nötig | Ja, in `.env` konfigurieren |
| **TLS/SSL** | Standardmäßig an | Erzwingen: `ssl=true` |
| **Environment** | `NODE_ENV=development` | `NODE_ENV=production` |

**Produktions-Checklist:**
- [ ] IP-Freigabe auf echte Server-IPs begrenzen
- [ ] Starkes Passwort für Database User
- [ ] Separate `.env` für Produktion (nicht in Git!)
- [ ] Database User mit minimalen Rechten (nicht Admin)
- [ ] TLS/SSL erzwingen in Atlas

---

## Support & Kontakt

Wenn der Dozent Probleme hat:

1. **Alle Schritte erneut überprüfen:** Besonders IP-Freigabe und Connection String
2. **MongoDB Atlas Status überprüfen:** https://status.mongodb.com/
3. **Logs anschauen:** Bei Error: Fehlermeldung vollständig lesen, nicht nur "Failed"

---

## Zusammenfassung

| Schritt | Zeit | Aktion |
|---------|------|--------|
| **Voraussetzungen** | 2 min | MongoDB Database Tools installieren |
| **Atlas Setup** | 3 min | Cluster, User, IP-Freigabe |
| **Datenimport** | 1 min | `mongorestore` Befehl |
| **Projekt-Config** | 1 min | `.env` anpassen |
| **Start** | 2 min | npm install + npm start |
| **Gesamt** | ~10 min | Alles funktioniert! |

---

**Version:** 1.0  
**Letzte Aktualisierung:** März 2026  
**Für Projekt:** Hobbook - Sports Community App
