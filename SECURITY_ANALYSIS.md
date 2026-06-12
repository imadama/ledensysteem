# Security-analyse — Aidatim Ledensysteem

**Datum:** 12 juni 2026
**Scope:** Volledige codebase — Laravel 11 backend, React frontend, Docker/nginx-configuratie
**Methode:** Statische code-review (geen penetratietest, geen draaiende omgeving getest)

---

## Samenvatting

De security-basis van de applicatie is **goed**: Sanctum cookie-auth met sessie-regeneratie, role-middleware op alle routegroepen, server-side tenant-scoping op `$request->user()->organisation`, Stripe webhook-signatuurverificatie met replay-detectie, IBAN mod-97 validatie en geen XSS-sinks in de frontend.

De belangrijkste risico's zitten in **ontbrekende rate limiting op authenticatie-endpoints**, **plaintext-opslag van gevoelige data** (uitnodigingstokens en IBAN's) en **ontbrekende security headers**. Geen van de gevonden punten is een direct uitbuitbaar kritiek lek, maar de combinatie van bevindingen 1 t/m 4 verdient prioriteit vóór livegang met `sk_live_` keys.

| Ernst | Aantal |
|---|---|
| Hoog | 4 |
| Middel | 8 |
| Laag | 5 |

---

## Hoog

### 1. Geen rate limiting op login
**Locatie:** `backend/routes/api.php:39`

```php
Route::post('login', [AuthController::class, 'login']);
```

Wachtwoord-reset heeft wél `throttle:5,1`, maar login niet. Een aanvaller kan onbeperkt wachtwoorden proberen op bekende e-mailadressen (brute force / credential stuffing).

**Fix:**
```php
Route::post('login', [AuthController::class, 'login'])->middleware('throttle:5,1');
```
Overweeg daarnaast Laravel's `RateLimiter` per e-mail+IP-combinatie en een lockout na N mislukte pogingen.

### 2. Geen rate limiting op account-activatie en publieke registratie
**Locatie:** `backend/routes/api.php:25-28` en `:33-36`

- `GET/POST /api/member-activation/{token}` — onbeperkt tokens raden en bij een bekend token onbeperkt requests doen.
- `POST /api/public/member-registration` — onbeperkt nepleden aanmaken; dit triggert ook e-mails (spam, reputatieschade Gmail SMTP) en vult de database.

**Fix:** `throttle:5,1` op member-activation, `throttle:10,60` op de publieke registratie. Overweeg een CAPTCHA op het publieke aanmeldformulier.

### 3. Uitnodigingstokens plaintext in de database
**Locatie:** `backend/app/Services/MemberAccountService.php:54, 196-202`, `member_invitations.token`

Tokens zijn sterk (`Str::random(64)`, cryptografisch veilig), eenmalig en verlopen na 7 dagen — dat is goed. Maar ze staan plaintext in de DB: bij een database-lek (SQL-injectie elders, gestolen backup, gelekte credentials) zijn alle openstaande activatielinks direct bruikbaar om ledenaccounts over te nemen.

**Fix:** sla `hash('sha256', $token)` op in de DB en vergelijk bij activatie met de hash van het aangeboden token. (Geen `Hash::make`/bcrypt nodig — het token heeft genoeg entropie; SHA-256 houdt de lookup-query mogelijk.)

### 4. IBAN's plaintext in de database
**Locatie:** `members.iban` en `members.sepa_subscription_iban` (`backend/database/migrations/2026_01_21_000000_add_sepa_subscription_fields_to_members_table.php:16`)

IBAN's zijn financiële persoonsgegevens (AVG art. 32). Bij een database-lek liggen alle bankrekeningnummers van alle leden van alle organisaties op straat.

**Fix:**
1. `sepa_subscription_iban` is na de Stripe-setup niet meer nodig — Stripe bewaart het mandaat. Sla in plaats daarvan alleen de laatste 4 cijfers op voor weergave, of verwijder de kolom.
2. Voor `members.iban`: gebruik Laravel's `encrypted` cast op het Member-model:
```php
protected $casts = ['iban' => 'encrypted'];
```
Let op: dan kan er niet meer op gefilterd worden in SQL en is `APP_KEY`-rotatie een migratie.

---

## Middel

### 5. Tenant-context via spoofbare `X-Organisation-Subdomain` header
**Locatie:** `backend/app/Http/Middleware/ResolveOrganisationFromSubdomain.php:67-70`

De organisatiecontext wordt primair bepaald door een client-gestuurde header. Dit is op dit moment **geen actief lek**, want:
- `ValidateUserOrganisationAccess.php:41` blokkeert toegang als `user->organisation_id` niet matcht met de geresolvede organisatie;
- controllers scopen queries op `$request->user()->organisation` (bv. `MemberController.php:63`), niet op de header-context.

Maar de beveiliging leunt volledig op die tweede linie. Twee zwakke plekken:
- Een gebruiker kan `X-Organisation-Subdomain: app` sturen, waardoor er géén organisatiecontext wordt gezet en `ValidateUserOrganisationAccess` het request gewoon doorlaat (`:36-38`). Elke controller die ooit `$request->attributes->get('organisation')` gaat gebruiken in plaats van de user-relatie introduceert dan een cross-tenant-lek.
- Nieuwe code kan dit makkelijk fout doen zonder dat tests het opmerken.

**Fix:** leid voor geauthenticeerde org_admin/member-routes de organisatie uitsluitend af van `$user->organisation_id` en negeer de header. Maak ontbrekende organisatiecontext op die routes een harde 403 in plaats van een pass-through.

### 6. E-mailadres wijzigen zonder herbevestiging
**Locatie:** `backend/app/Http/Controllers/Api/Member/SelfServiceController.php:39-43`

Een lid kan zijn login-e-mailadres direct wijzigen zonder verificatie van het nieuwe adres en zonder notificatie naar het oude adres. Bij een gekaapte sessie kan een aanvaller zo het account permanent overnemen (wachtwoord-reset gaat daarna naar het nieuwe adres).

**Fix:** stuur een bevestigingslink naar het nieuwe adres en een notificatie naar het oude; pas de wijziging pas toe na bevestiging.

### 7. Webhook-lookups niet gescoped per organisatie
**Locatie:** `backend/app/Http/Controllers/Api/StripeWebhookController.php` (o.a. `MemberSubscription::find($subscriptionId)`, `PaymentTransaction::where('stripe_payment_intent_id', ...)`)

De signatuurverificatie is goed geïmplementeerd (alleen Stripe kan geldige events sturen), dus dit is geen direct lek. Maar IDs uit event-metadata (zoals `client_reference_id`) worden globaal opgezocht zonder te controleren of het record bij het Stripe-account/de organisatie van het event hoort. Bij Connect-events van Express-accounts is event-inhoud deels door de organisatie beïnvloedbaar — een kwaadwillende org_admin zou in theorie records van een andere organisatie kunnen laten muteren.

**Fix:** valideer bij elke lookup dat het gevonden record hoort bij de organisatie van het `stripe_account` waarvoor het event binnenkwam.

### 8. Volledige IBAN's in API-responses
**Locatie:** `backend/app/Http/Controllers/Api/Organisation/MemberController.php` (`transformMember`) en `Member/SelfServiceController.php:240`

Ledenlijst en portaal tonen het volledige IBAN. In `ContributionReportController::monthlyBatch` wordt al gemaskeerd — pas datzelfde patroon overal toe en geef het volledige IBAN alleen terug waar het functioneel echt nodig is (bv. het bewerkformulier).

### 9. Ontbrekende security headers (nginx)
**Locatie:** `frontend/docker/nginx.conf`

Geen `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` of `Strict-Transport-Security`. Gevolgen: clickjacking mogelijk, en activatie-/reset-tokens in URLs kunnen via de Referer-header lekken naar externe links.

**Fix (minimaal):**
```nginx
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```
Voeg daarna een CSP toe (vereist testen i.v.m. Stripe-domeinen).

### 10. Secure-flag op sessiecookie niet afgedwongen
**Locatie:** `backend/config/session.php:172` — `'secure' => env('SESSION_SECURE_COOKIE')`

Zonder expliciete env-var is de default `false` en kan de sessiecookie over HTTP lekken.

**Fix:** `env('SESSION_SECURE_COOKIE', true)` als default, en zet de variabele expliciet in Coolify.

### 11. Debug-logging in productie-frontend
**Locatie:** `frontend/src/api/axios.ts:14-15, 33-60, 81-99, 145+`

Elke API-request, response-data en foutdetails worden naar de browser-console gelogd, ook in productie. Dit lekt interne API-structuur en foutdetails (bv. op gedeelde computers) en oogt onprofessioneel.

**Fix:** guard alle logging met `if (import.meta.env.DEV)`.

### 12. Stripe-foutmeldingen doorgegeven aan de client
**Locatie:** `backend/app/Http/Controllers/Api/Organisation/MemberSepaSubscriptionController.php:92-99, 130-137`

`$e->getMessage()` van Stripe gaat één-op-één naar de gebruiker. Log de details server-side en geef een generieke melding terug.

---

## Laag

### 13. Negatieve contributiebedragen toegestaan
**Locatie:** `backend/app/Http/Requests/Organisation/UpdateMemberRequest.php:52` — `between:-9999999.99,9999999.99`. Gebruik `min:0`.

### 14. Monitor-route mist role-middleware
**Locatie:** `backend/routes/api.php:114-123`. De role-check zit alleen in `MonitorController` zelf. Werkt, maar wijkt af van de andere routegroepen — breid `RoleMiddleware` uit naar meerdere rollen (`role:monitor,org_admin`).

### 15. Hardcoded dev-wachtwoorden in `docker-compose.yml`
**Locatie:** `docker-compose.yml:11-12,40` — `secret`/`rootsecret`. Alleen voor lokale ontwikkeling, maar zorg dat deze compose-file nooit op een publiek bereikbare server draait. Productie (`docker-compose.prod.yml`) gebruikt correct env-vars.

### 16. Webhook-endpoint zonder rate limiting
**Locatie:** `backend/routes/api.php:173`. Signatuurverificatie vangt nep-events af, maar een flood kost wel CPU/logging. `throttle` met ruime limiet is een goedkope mitigatie.

### 17. `STRIPE_CONNECT_WEBHOOK_SECRET` ontbreekt in `.env.example`
De code (`StripeWebhookController.php:40-42`) en `entrypoint.sh` kennen de variabele, maar `.env.example` documenteert hem niet. Zonder deze secret worden Connect-events geweigerd. Documentatiegap, geen lek (lege secrets geven een nette 500).

---

## Wat goed geregeld is

- **Sessie-regeneratie bij login** (`AuthController.php`) — voorkomt session fixation.
- **Geen e-mail-enumeratie** bij wachtwoord-vergeten (altijd generiek antwoord).
- **Role-middleware op alle routegroepen**, inclusief `role:platform_admin` op platform-routes.
- **Server-side tenant-scoping**: controllers gebruiken `$request->user()->organisation`, met `ValidateUserOrganisationAccess` als extra linie.
- **Stripe webhook-signatuurverificatie** met `Webhook::constructEvent()` en nette afhandeling bij ontbrekende secret.
- **Replay-detectie** via `StripeEvent`-tabel met `lockForUpdate()`.
- **Eenmalige uitnodigingstokens** met 7 dagen expiry en sterke entropie.
- **IBAN mod-97 checksum-validatie** vóór verzending naar Stripe.
- **Frontend**: geen `dangerouslySetInnerHTML`/`eval`, geen tokens in localStorage (HTTP-only cookies), CSRF correct via Sanctum, minimale dependencies, subdomein afgeleid van `window.location`.
- **Productie-Docker**: `--no-dev`, env-var-gedreven secrets, `APP_DEBUG` default `false`, `APP_URL`-validatie in entrypoint.
- **Audit trail** via `SubscriptionAuditService` en `MemberContributionHistory`.

---

## Aanbevolen volgorde van aanpak

1. **Rate limiting** op login, member-activation en publieke registratie (bevindingen 1-2) — kleine wijziging, groot effect.
2. **Uitnodigingstokens hashen** (3).
3. **IBAN-opslag versleutelen / saneren** (4) — vóór livegang i.v.m. AVG.
4. **Security headers** in nginx + `SESSION_SECURE_COOKIE=true` (9-10).
5. **E-mailwijziging met herbevestiging** (6).
6. **Webhook-lookups org-scopen** (7) en tenant-context loskoppelen van de client-header (5).
7. Overige middel/laag-punten meenemen in regulier onderhoud.

> **Let op:** dit is een statische code-review. Voor livegang met echte betalingen is aanvullend aan te raden: `composer audit` + `npm audit` in CI, en een externe penetratietest gericht op multi-tenant-isolatie.
