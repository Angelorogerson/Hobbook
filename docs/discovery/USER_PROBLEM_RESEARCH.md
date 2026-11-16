# User Problem Research

> Date: 2026-11-16 · Market: Germany, recreational football + basketball.
> Research was problem-first, in German and English, run as three parallel research passes: (1) player problems, (2) venue access in Germany, (3) competitors and workarounds. Competitor details are in [COMPETITOR_ANALYSIS.md](COMPETITOR_ANALYSIS.md).
> Evidence strength: **STRONG** (official/peer-reviewed/primary source read in full) · **MODERATE** (one primary source, a credible secondary source, or consistent anecdotal sources) · **WEAK** (single anecdote, vendor marketing, search snippet, or old).

## 0. Method limits (read first)

- **Reddit was not reachable.** The fetcher was blocked and no r/germany, r/berlin, r/pickupbasketball or r/bootroom threads came back from search. Gutefrage, nebenan.de and Kleinanzeigen threads didn't surface either. Missing results here don't mean the problems are absent.
- German *user voice* is therefore the weakest evidence layer. It comes from expat forums, Meetup group rules, Trustpilot and news. Official and structural evidence (BISp, KfW/Difu, municipal rules) is strong.
- **No user interviews were done.** Nothing in these documents is an interview finding. Interviews are the #1 validation step ([ASSUMPTIONS_TO_VALIDATE.md](ASSUMPTIONS_TO_VALIDATE.md)).
- Several numbers are company self-reports and are marked as such.

## 1. Most adult sport in Germany is self-organised, and it is irregular

| Finding | Source | Strength |
|---|---|---|
| Of people 16+ who do sport, **72% do it only self-organised**; 28% are active in at least one club. Club participation falls from ~45% (<16) to ~20% among adults. | BMWi/BISp, *Sport inner- oder außerhalb des Sportvereins*, 2019 (survey 2015/2017, N=2,417) — [PDF](https://www.bisp-sportinfrastruktur.de/SharedDocs/Downloads/DE/Sportentwicklung/sportaktivitaet_ssk.pdf) | STRONG |
| Football is mostly self-organised, but **only ~20% of self-organised footballers play regularly**, compared with ~80% of club footballers. | Same source, pp. 10–11 | STRONG |
| Self-organised sport is less regular than club sport (71% vs. 91% weekly). The drop in activity with age is mainly people leaving self-organised sport. | Same source | STRONG |
| Self-organised-only share rose to 64% in 2020 (from 58% in 2017, population basis). | BISp COVID report via secondary snippet — [PDF](https://www.bisp.de/SharedDocs/Downloads/Publikationen/Publikationssuche_SSK/WirtschaftsfaktorAktiverSportCOVID19.pdf) | MODERATE |
| DFB: record 8.2M members, but clubs are at their limits on facilities and training slots; active adult players fell slightly (−0.46%). | Volksstimme/dpa, 16 Jul 2026 — [link](https://www.volksstimme.de/sport/fussball/immer-mehr-mitglieder-dfb-stosst-an-grenzen-4286437) | STRONG |

**REASONED INFERENCE:** There is a large pool of informal players who *want* to play but fail to play *regularly*. Regularity, not one-off discovery, is the unmet outcome. This is the single most important finding for Hobbook.

## 2. Assembling enough players

- Expats in Cologne and Frankfurt describe finding regular small-sided games as near impossible: they know nobody and need ~10 players. An informal group they joined later stopped. ([Cologne](https://www.expat.com/en/forum/europe/germany/cologne/264612-football-in-cologne.html), [Frankfurt](https://www.expat.com/en/forum/europe/germany/frankfurt/246028-soccer-in-frankfurt.html)) — forum, 7–13 years old — WEAK–MODERATE.
- Berlin: demand is spread across a 4,000+ member Facebook group, JUGAD, CeleBreak and several Meetup groups (one run via Telegram). ([handpickedberlin](https://handpickedberlin.com/football-in-berlin/), [Meetup](https://www.meetup.com/find/de--berlin/pickupsoccer/)) — MODERATE.
- Pickup basketball study (n=65): lack of time 55.9%, lack of courts 45.6%, hard to find friends to play with 17.6%. ([AJPER](https://ejournals.lib.hkbu.edu.hk/index.php/ajper/article/download/1895/1845/1958)) — non-German, small, probably ~2010 — MODERATE.
- Vendor guidance: a pool of 20–25 people is needed to reliably get 10 ([BenchApp](https://www.benchapp.com/blog/setup-run-weeklypickup-basketball-group)) — vendor — WEAK–MODERATE.

## 3. No-shows, late dropouts, cancelled games

- A Meetup pickup-soccer group refuses online-only joins because they lead to no-shows. Newcomers must meet an organizer first, and inactive members lose their spot to the waitlist. ([Meetup](https://www.meetup.com/old-town-pickup-soccer/)) — MODERATE (enforced rule).
- Pickup basketball Meetup groups use no-show fines, suspensions after 2 no-shows and 24h RSVP cutoffs ([Meetup topic](https://www.meetup.com/topics/pick-up-basketball)) — MODERATE (snippets).
- CeleBreak: no refund for cancelling <15h before, credits only ([help](https://help.celebreak.com/en/article/1b42syk)). Footy Addicts: the organizer decides whether to call off a short game, typically ≥2h before ([help](https://footyaddicts.uservoice.com/knowledgebase/articles/2003056-what-happens-if-there-are-not-enough-people-in-the)). Platforms build their rules around "too few players" — MODERATE.
- Footy Addicts reviews cite late arrivals and dropouts; the company says it is building check-in ([Trustpilot](https://uk.trustpilot.com/review/footyaddicts.com)) — MODERATE.
- **Conflict:** some established, dense groups need no RSVP at all ([Gwinnett Meetup](https://www.meetup.com/gwinnett-pickup-soccer/)). No-shows hurt most in small or new groups.

## 4. Organizer burden

- Organizer concerns: will the field be free, will enough people come, when to cancel (numbers, weather), equipment, too many people ([OpenSports](https://opensports.ca/blog/top-5-concerns-everyone-has-when-organizing-a-pickup-game)) — WEAK–MODERATE.
- Collect money upfront; splitting court costs is a common reason runs die ([BenchApp](https://www.benchapp.com/blog/fix-no-shows-keep-sports-team-attendance-high)) — vendor — WEAK–MODERATE.
- German angle: Sportbund Rheinhessen flags GDPR issues with WhatsApp groups, e.g. phone numbers exposed to strangers ([VIBSS](https://sportbund-rheinhessen.vibss.de/vereinsmanagement/digitalisierung/kommunikation/social-media/whatsapp/whatsapp-rechtslage-mit-einfuehrung-der-eu-dsgvo?type=123)) — MODERATE.
- Paid pitches usually aren't refunded for bad weather (e.g. [Uni Tübingen terms](https://buchung.hsp.uni-tuebingen.de/angebote/aktueller_zeitraum/_Fussball_Hartplatz.html)). Olympiapark SoccArena: free cancellation up to 48h, then the full fee is due ([Olympiapark](https://www.olympiapark.de/en/sport/soccarena)). The cost risk sits with the organizer — STRONG for the terms.
- JUGAD reviewers praise organizing "without WhatsApp groups" ([App Store](https://apps.apple.com/de/app/jugad/id6450241322)) — small sample — WEAK–MODERATE.
- Not found: German data on time spent chasing RSVPs or money.

## 5. Places to play

**Public courts (Bolzplätze, Freiplätze, streetball):** STRONG
- **Not bookable.** Free use during hours set by municipal bylaws (often 08–20; Köln 07–22), with noise rules ([Köln Satzung](https://www.stadt-koeln.de/mediaasset/content/satzungen/spiel_und_bolzplatzsatzung_20081031.pdf)).
- **Some towns restrict adults:** Seelze <18, Lützen <17; Ingelheim allows adults only as companions of children ([Ingelheim 2025](https://www.ingelheim.de/formulare-pdfs/rathaus-politik/satzungen-und-richtlinien/satzungen/7-oeffentliche-einrichtungen-und-wirtschaftsfoerderung/7-106-benutzungssatzung-fuer-die-oeffentlichen-bolzplaetze-der-stadt-ingelheim-am-rhein-vom-01.07.2025.pdf)) — MODERATE.
- **Noise disputes close courts:** Stuttgart Cotta-Schule basketball court closed for months ([StZ, 2023](https://www.stuttgarter-zeitung.de/lokales/stuttgart/nachbarschaftsstreit-in-stuttgart-zu-laut-sportler-muessen-weichen-78936678.html)).
- **Supply varies:** Heidelberg has 49 hoops, mostly single streetball hoops; two districts have none ([Heidelberg 2024](https://www.heidelberg.de/HD/Presse/02_02_2024+basketball-+und+streetballplaetze+in+heidelberg.html)).
- **Discovery is fragmented:** city maps, open data, Courts of the World; no national directory.

**Municipal halls:** STRONG
- Allocated long-term with club priority; free capacity only for non-club groups; minimum 8 per third of a hall ([Heidelberg Vergabeverordnung 2026](https://www.heidelberg.de/site/Heidelberg2021/get/documents_E1249710111/heidelberg/Objektdatenbank/52/PDF/52_pdf_Vergabeverordnung_2026.pdf)).
- Munich: private groups allowed but need ≥10 regulars, 4 weeks' notice, PDF forms; double halls reserved for league clubs ([München](https://stadt.muenchen.de/service/en-GB/info/hire-of-school-sports-facilities/10439441/)).
- Berlin: closed gyms in almost every district (e.g. Pankow 10 of 112); clubs keep waiting lists ([news4teachers/dpa, 2025](https://www.news4teachers.de/2025/03/schimmel-unzumutbare-toiletten-brandstiftung-immer-mehr-sporthallen-gesperrt/)).
- Investment backlog: KfW/Difu 2025 — about €12.1bn perceived sport backlog; facilities closed in one in five municipalities; 59% call the hall backlog serious or significant ([KfW Fokus 482](https://kfw.de/PDF/Download-Center/Konzernthemen/Research/PDF-Dokumente-Fokus-Volkswirtschaft/Fokus-2025/Fokus-Nr.-482-Januar-2025-Sportstaetten.pdf), [Difu](https://difu.de/publikationen/2025/kommunale-sportstaetten-grosse-bedeutung-und-hoher-investitionsbedarf)).
- **Conflict:** the frequently cited €31bn figure (DOSB/DST/DStGB 2018) uses a different scope. Some cities report unused or "bunkered" slots (Braunschweig, Bielefeld), so part of the shortage comes from allocation, not physical space.

**Commercial venues (the only fit for "hourly, bookable online"):** STRONG/MODERATE

| Venue | Price | Booking | Strength |
|---|---|---|---|
| Olympiapark SoccArena München | €59–78 / court-hour | Own webshop only; 48h free cancellation | STRONG |
| TSG Bergedorf Indoor Soccer (club-run) | €36–53 / hour (2022 list) | — | MODERATE |
| Soccer Arena Göttingen | €21–35 / 45 min | — | MODERATE |
| RUB Bochum Hochschulsport pitch | €25–45 / hour | Online single slots | STRONG |

- Platforms in use: own webshops, Playtomic (a few halls, mostly padel), Urban Sports Club check-ins, B2B tools (anny, Anolla). No Eversports football or basketball results.
- **Commercial basketball court rental in Germany: not found.**

## 6. Feeling unwelcome, skill mismatch, trust

- Berlin public basketball courts are male-dominated. FLINTA* players struggle to join, and demand for FLINTA*-only sessions exceeds capacity ([taz, 13 May 2026](https://taz.de/Frauenbasketball-in-Berlin/!6176521/)) — MODERATE–STRONG.
- Peer-reviewed: how pickup is organized constrains women's participation ([Zou & Scott, Leisure Sciences 2018](https://experts.illinois.edu/en/publications/constraints-to-pickup-basketball-participation-among-chinese-amer/)) — STRONG (US).
- Footy Addicts reviews: no screening, rough play, an organizer ban with no appeal, few games for 50+ players, few games in smaller cities ([Trustpilot](https://uk.trustpilot.com/review/footyaddicts.com)) — MODERATE.
- Beginner, women-only and "non-contact" pickup groups exist as their own category (US Meetup) — WEAK–MODERATE.
- DFB Walking Football targets older players ([DFB](https://www.dfb.de/content/walking-football)) — WEAK as problem evidence.
- **Conflict:** some reviewers praise mixed-ability games as welcoming. Experience depends heavily on the host.

## 7. Retention

- Self-organised sport has less "holding structure" (BISp, STRONG). Groups die when core players leave (Baltimore, Cologne — WEAK). Vendor claim: turnout erodes around week 5 (WEAK).
- Not found: a German study on why informal groups dissolve.

## 8. Synthesis: top problems by frequency × severity

1. **Can't play regularly**: assembling enough committed players each time (P-01, P-09).
2. **No-shows and late dropouts** → cancelled or uneven games (P-02).
3. **One organizer carries everything**: RSVPs, go/no-go, cost risk, money (P-03, P-06).
4. **Places**: free courts can't be booked and have rules; halls are club-first; commercial halls are pricey and fragmented (P-05, P-10).
5. **Fragmented discovery** for newcomers and expats (P-04).
6. **Unwelcome or mismatched games**: women/FLINTA*, beginners, older players (P-07).
7. **Trust with strangers** (P-08).

Full mapping: [PROBLEM_MAP.md](PROBLEM_MAP.md).

## 9. Conflicting evidence (summary)

- Self-organised share: 58–72% depending on definition and year. Any figure must be cited with its definition.
- Clubs aren't shrinking (DFB record membership), so the story is "clubs are full and adults play informally", not "people leave clubs".
- No-shows are severe for small or new groups and less so for dense, established ones.
- Hall shortage is partly about allocation, not just physical space.

## 10. Not found / unknown

German no-show rates · count of informal football/basketball players · basketball-specific German participation · organizer time spent · lighting and winter drop-off data · German app-store reviews of pickup apps · German Reddit/forum voice.
