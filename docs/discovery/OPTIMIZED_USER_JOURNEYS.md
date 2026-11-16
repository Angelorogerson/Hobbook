# Optimized User Journeys

> Date: 2026-11-16 · Target-state journeys (RECOMMENDATION). They reuse existing building blocks where possible ([GAP_ANALYSIS.md](GAP_ANALYSIS.md)). Story IDs → [USER_STORY_MAP.md](USER_STORY_MAP.md).
> Design principle: **the WhatsApp group stays**. Hobbook replaces the poll and the chasing, not the chat.

---

## J1 — Organizer sets up a weekly game (ORG)

1. **Trigger:** The organizer is tired of the weekly WhatsApp poll, or starts a new regular game.
2. **Goal:** A game that runs every week with enough players and no chasing.
3. **Steps:**
   1. "Spiel erstellen" → pick sport.
   2. Pick a place from the directory (search by name/city) or add a new one (name, address, type).
   3. Day/time, duration, repeat weekly (default on).
   4. Max players, **min players**, **decision time** (default 24h before).
   5. Level + format tags + short "who this is for".
   6. Optional: cost per head and how to pay (text, V1).
   7. Visibility: *group only* (link) or *open spots public*.
   8. Create → share sheet with a WhatsApp-ready message and link.
4. **Decisions:** recurring or not; public or link-only; min/max; decision time.
5. **Pain points addressed:** P-01, P-03, P-09.
6. **System reactions:** creates the series and the first game instance; the organizer is the first participant; the link preview shows title, time, place and "1/10 dabei".
7. **Errors:** date in the past; min > max; place missing an address → inline validation in German.
8. **Edge cases:** the organizer can't attend one week (co-organizer in V1, or mark "not playing" while staying host); changing the time of one instance vs. the whole series; place closed → cancel the instance with notification.
9. **Success:** the link is posted to the group within 2 minutes of starting.
10. **Next step:** "Teile den Link in deiner Gruppe" → after first RSVPs, nudge: "Offene Plätze öffentlich anzeigen?"

## J2 — Group member responds from WhatsApp (ORG's group, often first contact with Hobbook)

1. **Trigger:** A link in the WhatsApp group.
2. **Goal:** Say "I'm in" in seconds.
3. **Steps:** tap link → **public game page** (no login): who's in, spots left, place, time, level → "Ich bin dabei" → quick signup (name, email, password; magic link in V1) → back on the game page, confirmed → "Zum Kalender hinzufügen".
4. **Decisions:** in, out or maybe ("maybe" not offered on purpose; see F-04 note).
5. **Pain points:** P-03 (no chasing), P-04.
6. **System reactions:** status "Du bist dabei (7/10)"; if full, "Auf Warteliste (Platz 2)"; confirmation email with `.ics`.
7. **Errors:** game full between page load and tap → atomic check → waitlist instead, clearly messaged; network error → retry.
8. **Edge cases:** already registered → login and return to the same game; link to a cancelled game → show the status and next date of the series.
9. **Success:** RSVP in under 60 seconds for an existing user and under 2 minutes for a new one (targets, to validate).
10. **Next step:** "Folge dieser Spielserie" (default on after the first RSVP) → automatic invite next week.

## J3 — Go/no-go and game day (ORG + players)

1. **Trigger:** The decision time is reached.
2. **Goal:** Everyone knows whether the game is on.
3. **Steps (system-driven):** at the decision time, if count ≥ min → status **"Findet statt"** + reminder to everyone; if < min → organizer is notified 2h before the decision time ("Noch 2 Spieler fehlen – offene Plätze öffentlich teilen?"); at the decision time still < min → auto **"Abgesagt"** (organizer can override) + notification.
4. **Decisions:** the organizer may override, extend or open spots publicly.
5. **Pain points:** P-02, P-03.
6. **System reactions:** status change, emails; dropouts after the decision time are marked "late dropout"; the waitlist auto-promotes until kick-off.
7. **Errors:** email delivery failure → visible status on the page anyway.
8. **Edge cases:** weather (organizer cancels manually, with a reason); exactly min players; organizer unreachable.
9. **Success:** nobody shows up to a cancelled game, and nobody is surprised.
10. **Next step:** after the game → J4.

## J4 — After the game: attendance and the next week (ORG)

1. **Trigger:** Game end time + 1h → "Wer war da?" prompt to the organizer (V1).
2. **Goal:** Record no-shows with one tap; next week opens.
3. **Steps:** checklist with everyone pre-ticked → untick no-shows → save. Next instance already open; players of this week who follow the series get the invite first (e.g. 48h priority window, V1).
4. **Pain points:** P-02, P-09.
5. **System reactions:** show-up rate updates (visible as "kommt zuverlässig: 9 von 10" once ≥5 games).
6. **Errors / edge cases:** the organizer ignores the prompt → no data, no penalty; disputed no-show → the player can flag it (V2).
7. **Success:** the series continues with ≥ min players for 4+ consecutive weeks (key metric).
8. **Next step:** weekly invite email.

## J5 — Drop-in player finds a game (DROP / UND)

1. **Trigger:** "I want to play this week" or a newcomer in town; arrives from search, a shared link or the home page.
2. **Goal:** Find a fitting game that will actually happen.
3. **Steps:** home (public) → city preset (from profile or chosen) → list of upcoming games with **spots left**, level, format tags, "findet statt" badge → filters: sport, day, level, format → game detail → "Ich bin dabei" → signup → confirmation.
4. **Decisions:** which game (level, distance, time, who's playing).
5. **Pain points:** P-04, P-07, P-08.
6. **System reactions:** shows the series history ("läuft seit 8 Wochen, Ø 9 Spieler"), which builds trust without fake ratings.
7. **Errors:** no games in the city → honest empty state: "Noch keine offenen Spiele in [Stadt]. Starte eins oder lass dich benachrichtigen" (V1: alert subscription).
8. **Edge cases:** link-only games are not listed; full games show the waitlist; women/FLINTA*-only tags are self-declared, with reporting.
9. **Success:** joins a game and attends.
10. **Next step:** follow the series → becomes a regular (J2 loop).

## J6 — Find a place to play (ORG / DROP)

1. **Trigger:** A new group needs a court, or a winter move indoors.
2. **Steps:** places in a city → filter by sport, type (free court / commercial hall / university / municipal), indoor/outdoor → place page: access rules (hours, adults allowed, booking needed?), price info, **external booking link**, **upcoming games here** → "Spiel hier erstellen".
3. **Pain points:** P-05, P-10.
4. **Errors:** outdated info → "Info falsch? Melden" (V1).
5. **Success:** the organizer creates a game at the place.
6. **Explicitly not in this journey:** paying or booking inside Hobbook (deferred, F-01).

## J7 — Something goes wrong (trust & safety)

1. **Trigger:** rough play, harassment or a fake game.
2. **Steps:** game or profile → "Melden" → reason + text → admin queue; the organizer can remove a participant from their game.
3. **Success:** the report is acknowledged and reviewed within a stated time (operational commitment UNKNOWN; define before launch).

---

## Journey metrics (to instrument, not to invent)

| Metric | Journey | Why |
|---|---|---|
| Time from "create" to link shared | J1 | Organizer friction |
| % of RSVPs from shared links vs. browsing | J2/J5 | Acquisition channel |
| Fill rate at the decision time; % games held | J3 | Core value |
| Series alive after 4 weeks | J4 | Retention |
| Show-up rate | J4 | Reliability |
| New players becoming regulars (≥3 games in 6 weeks) | J5 | DROP success |
