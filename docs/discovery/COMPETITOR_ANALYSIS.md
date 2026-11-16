# Competitor & Alternatives Analysis

> Date: 2026-11-16 · Market: Germany, recreational football + basketball. Comparable markets (UK/US) are used for patterns only.
> Evidence: STRONG = primary page + second source · MODERATE = one primary or third-party only · WEAK = listing/snippet only. Company-reported user numbers are marked *(self-reported)*.
> Research limits: no Reddit threads surfaced in the competitor search; some app-store pages couldn't be fetched (rate-limited). See §6.

## 1. The landscape in one picture

| Category | Examples | Who it serves | Relevance to Hobbook |
|---|---|---|---|
| **Chat workaround** | WhatsApp groups/polls/"Events" | Every existing group | The real incumbent for organizers |
| **Team apps** | Spond, SpielerPlus, Heja, Kadermanager, TeamSnap | Fixed teams/clubs | Strong for known groups; not for strangers |
| **Venue booking** | Playtomic, Eversports, hall software (anny, bookandgo), Urban Sports Club | Racket sports, studios, halls | Fragmented for football; padel is the model to watch |
| **Hosted pickup** | CeleBreak (DE), Footy Addicts (UK), Plei (US) | Individuals without a group | Paid, organizer-run games |
| **Self-organized pickup** | **JUGAD** (DE), small apps (UnitePlay, Gambeta, Splyne, WOOOBA) | Organizers + players | **Direct competitor to Hobbook Connect** |
| **Court maps** | Courts of the World (basketball) | Finding free courts | Discovery only |
| **Public halls** | Municipal Sportamt allocation | Clubs first | Structural barrier, not a product |

## 2. Problem → today's solution → alternative → gap → opportunity

### P: "We're a regular group; who's coming this week?" (organizer coordination)
- **Today's solution:** WhatsApp group and poll. Since 2024 WhatsApp groups also have "Events" with accept/decline and calendar add (MODERATE, [netzwelt](https://www.netzwelt.de/news/232220-neuer-button-whatsapp-gruppen-messenger-fuehrt-ereignisse-verbirgt-dahinter.html)).
- **Works well:** zero install, group already exists, notifications.
- **Works badly:** no player cap, no waitlist, no payment, no venue link, only the creator edits.
- **Alternatives:** Spond, SpielerPlus (attendance, cash box, fines; freemium, [App Store](https://apps.apple.com/de/app/playerplus/id914253760?l=en)), Kadermanager (free). Spond complaints: notification overload across teams, reports of ads from 2026 (MODERATE).
- **Gap:** capacity + waitlist + "fill open spots with strangers" + money, without forcing everyone to install an app.
- **Opportunity (INFERENCE):** a shareable game link that works without an account, with an in/out list, cap and waitlist, posted into the existing WhatsApp group.

### P: "I want to play but have no group" (individual player)
- **Today's solution:** Meetup groups (e.g. Berlin Football Meetup, used as a funnel by CeleBreak), hosted games, JUGAD.
- **CeleBreak** (STRONG, [celebreak.com](https://celebreak.com/de/frankfurt/)): runs its own games in Berlin, Frankfurt and Munich; on-site organizer, balanced teams; about €8.49–9.99 per player per game (Meetup listing, Nov 2026). Gap: only 3 cities, fixed schedule, no self-organizing.
- **JUGAD** (STRONG, [App Store](https://apps.apple.com/de/app/jugad/id6450241322)): free with ads; find/organize games, game chat, invite links, crowd-sourced pitch map, recurring weekly games, attendance-based **reliability score** (v1.2.0), **prepaid online payment** paid out to the organizer (v1.3.0), hall partnerships; many German cities; 25,000+ players *(self-reported)*; 4.9★ from 181 ratings.
- **Footy Addicts (UK, pattern)** (STRONG): prepay to hold a place; 272k registered / 35k monthly active *(self-reported)*; complaints are no-shows, late arrivals, rough play, few games outside big cities ([Trustpilot](https://uk.trustpilot.com/review/footyaddicts.com)).
- **Gap:** basketball in Germany; mid-sized and university cities; skill/welcome signals for beginners, women and 30+/40+ players (Footy Addicts reviewers ask for age-group games).
- **Opportunity (INFERENCE):** don't try to beat JUGAD feature by feature in football in big cities. Pick an underserved niche (city × sport × audience) and win liquidity there.

### P: "We need a pitch or hall at a fixed time" (venue access)
- **Today's solution:** phone, email or each hall's own booking tool. Commercial soccer halls use B2B tools like anny, bookandgo or Anolla (MODERATE, [anny](https://anny.co/en/solutions/indoor-soccer-hall-booking-system)), so the market is fragmented.
- **Municipal halls:** allocated per semester with club priority (STRONG; e.g. [Berlin Treptow-Köpenick](https://www.berlin.de/ba-treptow-koepenick/politik-und-verwaltung/aemter/schul-und-sportamt/sport/artikel.129122.php), [München](https://stadt.muenchen.de/service/muenchen/10225306/), [Heidelberg](https://www.heidelberg.de/site/Heidelberg2021/get/documents_E1249710111/heidelberg/Objektdatenbank/52/PDF/52_pdf_Vergabeverordnung_2026.pdf)).
- **Playtomic** (STRONG): the padel model of court booking + "open matches" + level system + split payment. Trustpilot 1.3/5 (140 reviews) driven by refunds, cancellation fines, no-show cost and support ([Trustpilot](https://www.trustpilot.com/review/playtomic.io)). No evidence of German football pitches on Playtomic.
- **Eversports** (MODERATE): marketplace + venue software; Trustpilot DE 2.8 (25), with payment and refund complaints.
- **Urban Sports Club** (MODERATE): subscription access to some soccer halls; some football sessions need ≥10 participants; no-show penalty.
- **Gap:** no aggregator for football/basketball hall slots in Germany, but aggregating requires B2B integrations or manual operator onboarding (high operational cost).
- **Opportunity (INFERENCE):** "book a slot and fill it" (Playtomic open-match model for soccer halls) is attractive but depends on venue supply. **Defer** until the player side has traction, or start with one partner hall as a concierge experiment.

### P: "Money for the pitch"
- **Today's solution:** PayPal Friends & Family (free, no protection; business use reportedly against PayPal's terms, UNVERIFIED), Splitwise (free tier capped since 2023, MODERATE), cash.
- **Alternatives:** Spond payments, JUGAD prepayment, Playtomic split payment, Footy Addicts prepay.
- **Gap:** for casual groups, a simple "who has paid" tracker may be enough; real payments add licensing, refund and support load (see Playtomic/Eversports reviews).
- **Opportunity (INFERENCE):** V1 = a manual "paid ✓" marker set by the organizer; real payments only after validation.

### P: "Where is a free court?" (basketball especially)
- **Courts of the World** (MODERATE, [about](https://courtsoftheworld.com/blog/about/)): crowd-sourced court map, 40k–70k courts *(self-reported; figures vary)*, pickup filter.
- **JUGAD:** crowd-sourced football pitch map.
- **Gap:** court maps exist; what's missing is *who's playing there and when*.

## 3. Failed or pivoted products (lessons)

| Product | What happened | Lesson (INFERENCE) |
|---|---|---|
| **Hoop Maps** (US, basketball) | Court-finder app (2016) → pivoted in 2018 to paid "Curated Runs" (organized sessions); listed as ended in 2024 ([Starter Story](https://starterstory.herokuapp.com/stories/how-curated-runs-brought-progress-on-our-booking-session)) | A pure finder app didn't make a business; paid, reliable sessions did better |
| **gofuba** (Münster, football pickup) | Founded 2019; Startbase lists a liquidator (WEAK, [startbase](https://www.startbase.de/organization/gofuba/)); reason unknown | Cold-start in German pickup football is hard |
| **Playo** (India) | Planned European expansion; no evidence it reached Germany | Marketplace expansion is expensive |

## 4. Patterns

**Works consistently**
1. RSVP inside an existing group (WhatsApp, Spond): no install friction.
2. Prepayment to hold a spot is the main lever against no-shows (Footy Addicts, Plei, JUGAD, CeleBreak, Playtomic).
3. Hosted games with an on-site organizer (CeleBreak, Plei, Hoop Maps runs).
4. Reliability or level signals (JUGAD, Playtomic).
5. Recurring weekly slots (JUGAD), which match how hobby groups actually play.
6. Meetup as an acquisition funnel.

**Fails consistently**
1. No-shows and late dropouts, even in paid apps.
2. Refunds, cancellation policy and support dominate negative reviews of booking platforms.
3. Skill mismatch and rough play with strangers.
4. Too few players outside big cities (liquidity).
5. Fragmented venue access; municipal halls favour clubs.
6. Team-app fatigue: notifications and ads.

## 5. Implications for Hobbook (RECOMMENDATION / INFERENCE)

1. **JUGAD is the reference competitor.** It already does what Hobbook Connect does, plus reliability and payments. Hobbook needs a sharper wedge, not parity.
2. **Hourly venue booking without venue supply is not a viable launch wedge.** Every serious player in that space either owns B2B software (Eversports, anny) or concentrates on one sport (Playtomic). Defer.
3. **The organizer is the acquisition channel.** One organizer brings 10–20 players via a shared link. Design for the organizer first, and let players respond without an account.
4. **Candidate niches to validate:** basketball pickup in German cities (weakly served); mid-sized/university cities; inclusive formats (beginner, women, 30+).
5. **Build trust into the product, not the copy:** attendance-based reliability, clear cancellation rules, and no fake ratings.

## 6. Not found / unknown

- **Reddit:** no threads surfaced in the competitor search (see USER_PROBLEM_RESEARCH for the player-side search).
- **Prices:** soccer-hall hourly prices per chain, Urban Sports Club tier prices, municipal rental fees (partly covered in USER_PROBLEM_RESEARCH).
- **Usage numbers:** German usage for Spond, Heja, SpielerPlus, Playtomic. JUGAD's full review set (only 3 visible).
- **Coverage:** whether Plei, Playo or OpenSports operate in Germany. Telegram, Google Sheets, Facebook and nebenan.de usage for pickup sports.
- **Shutdowns:** gofuba's reason.
- **Self-reported figures** (JUGAD, CeleBreak, Footy Addicts, Heja) are unverified.
