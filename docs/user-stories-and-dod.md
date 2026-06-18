# Aidatim Member App — User Stories & Definition of Done

> **Context:** Proof of Concept voor de module *Realisatie van een complex informatiesysteem (LU3)*.
> Cross-platform mobiele app in **Kotlin Multiplatform / Compose Multiplatform** (Android + iOS), die
> volledig aansluit op de bestaande **Aidatim Laravel-backend** (`api.aidatim.nl`).
>
> **Doelgroep:** *leden* van een vereniging/organisatie. Zij gebruiken het ledenportaal nu via de
> mobiele browser; de native app is een procesverbetering (snellere toegang, biometrische login,
> offline inzage, sensoren).
>
> **Status van dit document:** concept — vast te stellen samen met de verantwoordelijke op de werkplek.
> | Rol | Naam |
> |---|---|
> | Uitvoerder (developer) | Imad Amazyan |
> | Verantwoordelijke werkplek | _(in te vullen / af te stemmen)_ |
> | Datum vastgesteld | _(in te vullen)_ |

---

## 1. Scope van het PoC

**In scope** — de native ledenportaal-app met:
- Veilige login op de bestaande backend (token-based auth).
- Inzicht in lidmaatschap, contributie en betaalstatus.
- Profiel bekijken en bewerken.
- SEPA-incasso instellen en openstaande contributie betalen.
- Sensorgebruik (biometrische login) en lokale persistentie (offline cache + veilige tokenopslag).

**Out of scope** (PoC-afbakening) — admin-/platformfunctionaliteit, ledenbeheer, organisatiebeheer,
Stripe Connect-onboarding. Dat blijft in de bestaande web-applicatie.

---

## 2. User Stories

Geprioriteerd volgens **MoSCoW**. Elke story is afgestemd op een bestaand backend-endpoint, zodat
realisatie haalbaar is binnen het PoC.

> Format: *Als &lt;rol&gt; wil ik &lt;doel&gt; zodat &lt;waarde&gt;.* Acceptatiecriteria in Given/When/Then.

---

### US-01 — Veilig inloggen — `MUST`
**Als** lid **wil ik** inloggen met mijn e-mailadres en wachtwoord **zodat** ik veilig bij mijn
persoonlijke ledengegevens kan.

- **Endpoint:** `POST /api/auth/token` *(nieuw — token-login t.b.v. de native app)*
- **Acceptatiecriteria:**
  - Gegeven geldige inloggegevens, wanneer ik inlog, dan ontvang ik een token en kom ik op het dashboard.
  - Gegeven ongeldige inloggegevens, wanneer ik inlog, dan zie ik een duidelijke (Engelstalige) foutmelding en kom ik niet binnen.
  - Het token wordt veilig opgeslagen (Keychain/Keystore via lokale persistentie), niet in platte tekst.
- **Raakt:** lokale persistentie (gewenst).

### US-02 — Sessie onthouden + biometrische ontgrendeling — `MUST`
**Als** lid **wil ik** de app heropenen met mijn vingerafdruk/Face ID **zodat** ik niet telkens
opnieuw hoef in te loggen.

- **Acceptatiecriteria:**
  - Gegeven een geldig opgeslagen token, wanneer ik de app heropen, dan vraagt de app om biometrische bevestiging.
  - Gegeven een geslaagde biometrische check, wanneer die slaagt, dan kom ik direct op het dashboard.
  - Gegeven een verlopen/ongeldig token, wanneer ik de app open, dan word ik naar het loginscherm gestuurd.
- **Raakt:** sensorgebruik (gewenst) + lokale persistentie (gewenst).

### US-03 — Dashboard met mijn lidmaatschapsstatus — `MUST`
**Als** lid **wil ik** een overzicht zien van mijn lidmaatschap en eerstvolgende betaling **zodat** ik
in één oogopslag weet hoe ik ervoor sta.

- **Endpoints:** `GET /api/member/profile`, `GET /api/member/subscription`
- **Acceptatiecriteria:**
  - Gegeven dat ik ben ingelogd, wanneer ik het dashboard open, dan zie ik mijn naam, lidnummer en lidmaatschapsstatus.
  - Wanneer er een actieve SEPA-incasso is, dan zie ik het bedrag en de eerstvolgende incassodatum.
  - Wanneer een betaling is mislukt (`past_due`), dan zie ik daarvan een duidelijke melding.

### US-04 — Contributiehistorie inzien — `MUST`
**Als** lid **wil ik** mijn contributiegeschiedenis en betaalstatus per maand zien **zodat** ik kan
controleren of alles betaald is.

- **Endpoints:** `GET /api/member/contribution`, `GET /api/member/contribution-history`
- **Acceptatiecriteria:**
  - Gegeven dat ik ben ingelogd, wanneer ik de contributiepagina open, dan zie ik een lijst met maanden, bedragen en status (betaald / openstaand / mislukt).
  - Wanneer er geen historie is, dan zie ik een nette lege staat in plaats van een fout.

### US-05 — Offline inzage in mijn gegevens — `SHOULD`
**Als** lid **wil ik** mijn laatst geladen gegevens kunnen bekijken zonder internet **zodat** ik ook
onderweg inzicht heb.

- **Acceptatiecriteria:**
  - Gegeven dat ik eerder online mijn gegevens heb geladen, wanneer ik de app zonder verbinding open, dan zie ik de gecachte gegevens met een "offline"-indicator.
  - Wanneer de verbinding terugkomt, dan worden de gegevens ververst.
- **Raakt:** lokale persistentie (gewenst).

### US-06 — Profiel bekijken en bewerken — `SHOULD`
**Als** lid **wil ik** mijn profielgegevens bekijken en bijwerken **zodat** mijn contactgegevens
kloppen.

- **Endpoints:** `GET /api/member/profile`, `PUT /api/member/profile`
- **Acceptatiecriteria:**
  - Gegeven dat ik op mijn profiel sta, wanneer ik een veld wijzig en opsla, dan wordt de wijziging bevestigd en bewaard.
  - Gegeven ongeldige invoer (bv. leeg verplicht veld), wanneer ik opsla, dan zie ik per veld een validatiemelding.

### US-07 — SEPA-incasso instellen — `SHOULD`
**Als** lid **wil ik** mijn IBAN opgeven en een SEPA-machtiging afgeven **zodat** mijn contributie
automatisch wordt geïncasseerd.

- **Endpoint:** `POST /api/member/sepa/setup`
- **Acceptatiecriteria:**
  - Gegeven een geldig IBAN, wanneer ik de SEPA-setup doorloop, dan wordt de machtiging aangemaakt en zie ik een bevestiging.
  - Gegeven een ongeldig IBAN, wanneer ik bevestig, dan zie ik een validatiemelding (mod-97 check).

### US-08 — Openstaande contributie betalen — `COULD`
**Als** lid **wil ik** een openstaand bedrag handmatig betalen **zodat** ik een achterstand kan
inlopen.

- **Endpoints:** `GET /api/member/contribution-open`, `POST /api/member/contribution-pay`
- **Acceptatiecriteria:**
  - Gegeven dat ik een openstaand bedrag heb, wanneer ik op betalen druk, dan word ik door de betaalflow geleid.
  - Wanneer de betaling slaagt, dan wordt de status bijgewerkt naar betaald.

### US-09 — Uitloggen — `MUST`
**Als** lid **wil ik** kunnen uitloggen **zodat** mijn gegevens veilig zijn op een gedeeld toestel.

- **Endpoint:** `POST /api/auth/logout`
- **Acceptatiecriteria:**
  - Wanneer ik uitlog, dan wordt mijn token verwijderd uit lokale opslag en kom ik op het loginscherm.
  - Wanneer ik daarna de app heropen, dan moet ik opnieuw inloggen.

### US-10 — Digitale lidkaart met QR _(optioneel, sensor)_ — `COULD`
**Als** lid **wil ik** een QR-lidkaart tonen/scannen **zodat** ik me bij een activiteit kan
identificeren.

- **Acceptatiecriteria:**
  - Wanneer ik mijn lidkaart open, dan zie ik een QR-code met mijn lidnummer.
  - _(optioneel)_ Wanneer ik de scanner open, dan kan ik via de camera een QR-code uitlezen.
- **Raakt:** sensorgebruik (camera) — alternatief/aanvulling op US-02 voor de sensor-eis.

---

### Prioriteitsoverzicht

| ID | Story | Prioriteit | Endpoint(s) | Gewenste eis |
|---|---|---|---|---|
| US-01 | Veilig inloggen | MUST | `POST /auth/token` | lokale persistentie |
| US-02 | Biometrische ontgrendeling | MUST | — | sensor + persistentie |
| US-03 | Dashboard | MUST | `GET /member/profile`, `/subscription` | — |
| US-04 | Contributiehistorie | MUST | `GET /member/contribution(-history)` | — |
| US-05 | Offline inzage | SHOULD | — | lokale persistentie |
| US-06 | Profiel bewerken | SHOULD | `GET/PUT /member/profile` | — |
| US-07 | SEPA instellen | SHOULD | `POST /member/sepa/setup` | — |
| US-08 | Contributie betalen | COULD | `GET /member/contribution-open`, `POST /member/contribution-pay` | — |
| US-09 | Uitloggen | MUST | `POST /auth/logout` | — |
| US-10 | QR-lidkaart | COULD | — | sensor (camera) |

**Minimale PoC-demo (voor het filmpje):** US-01, US-02, US-03, US-04, US-09 — plus minimaal één
SHOULD-story (US-05 of US-06). Dit dekt: auth, sensor, persistentie en de kernfunctionaliteit.

---

## 3. Definition of Done

### 3a. DoD per user story
Een story is *done* wanneer:
- [ ] De functionaliteit werkt op **zowel Android als iOS** (cross-platform).
- [ ] Alle **acceptatiecriteria** aantoonbaar gehaald zijn.
- [ ] De **broncode en UI-teksten zijn Engelstalig** (harde eis uit de opdracht).
- [ ] Code volgt **MVVM**: UI-logica in een ViewModel, geen netwerk-/businesslogica in de Composable.
- [ ] Er zijn **unit tests** voor de relevante logica (waar zinvol) en deze slagen.
- [ ] Foutafhandeling is aanwezig: geen crash bij netwerk-/validatiefouten; gebruiker ziet een begrijpelijke melding.
- [ ] De wijziging is **gecommit en gepusht**; de **CI-pipeline is groen** (build + tests).
- [ ] Geen hardcoded secrets of API-URL's buiten configuratie.

### 3b. DoD voor het PoC als geheel (portfolio-acceptatie)
Het PoC is *done* wanneer:
- [ ] Een werkende, **functioneel geteste** cross-platform app is opgeleverd (Android + iOS).
- [ ] De app sluit **volledig aan op de bestaande backend** (afgestemd met docent in het voorstel).
- [ ] **Meest recente technologie** is toegepast (nieuwe KMP-structuur, actuele Compose Multiplatform).
- [ ] Broncode én GUI zijn **volledig Engelstalig**.
- [ ] Het **ontwerpdocument** is compleet (zie checklist hieronder).
- [ ] Minimaal **3 zinvolle unit tests** + **3 zinvolle UI/device tests** zijn uitgevoerd en in een **testrapportage** vastgelegd.
- [ ] Er zijn **acceptatietesten** opgesteld op basis van deze DoD.
- [ ] Een **ingerichte werkomgeving (CI/CD)** is aantoonbaar gebruikt.
- [ ] Er is een **installatie- en gebruiksinstructie**.
- [ ] Deze **DoD-checklist** is ingevuld en aangetoond.
- [ ] Er is een **demovideo** (doel/gebruikers, demo user stories, ontwerp-/realisatiekeuzes, trots-onderdelen).

### 3c. Ontwerpdocument-checklist (eis uit de opdracht)
- [ ] Toelichting/samenvatting functionaliteit (app + backend)
- [ ] User stories *(dit document)*
- [ ] Use case diagram
- [ ] Wireframes
- [ ] Web API-documentatie met request-voorbeelden
- [ ] Toelichting authenticatie & autorisatie
- [ ] Package diagram + gekozen architectuur
- [ ] Deployment diagram
- [ ] Klassendiagrammen van eigen klassen
- [ ] Sequence diagram — MVVM (min. 1)
- [ ] Sequence diagram — app ↔ backend (min. 1)

---

## 4. Aandachtspunten / beslissingen

1. **Token-auth toevoegen aan de backend.** De backend gebruikt nu Sanctum *cookie*-auth (web-SPA).
   Voor de native app is een `POST /api/auth/token`-endpoint nodig (Sanctum personal access tokens).
   De bestaande `auth:sanctum`-guard accepteert tokens al. → te bespreken/bevestigen.
2. **Multi-tenant context.** Verzoeken hebben de organisatiecontext nodig via de header
   `X-Organisation-Subdomain`. De app moet bij login bepalen bij welke organisatie het lid hoort.
3. **Engelstalige GUI** vanaf dag 1 — niet achteraf vertalen.
4. **Verantwoordelijke werkplek.** User stories en DoD formeel vaststellen en datum/naam invullen
   bovenaan dit document.
