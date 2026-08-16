# Production-Readiness Audit — Aidatim Ledensysteem

**Datum:** 2026-07-19
**Laatste herverificatie:** 2026-08-12
**Scope:** backend (Laravel 11), frontend (React), mobile (KMP), infra (Coolify/Docker)
**Methode:** 9 parallelle dimensie-reviewers + adversariële verificatie; de zwaarste bevindingen zijn nadien handmatig in de code nagetrokken.

## Eindoordeel

**Nog niet klaar voor betalende klanten.** De architectuur is degelijk (geauthenticeerde tenant-isolatie klopt, webhook-signatures verplicht, idempotency via `stripe_events`, disputes afgehandeld). Maar er is één kritiek lek dat directe actie vereist, plus blockers rond betalingen en deployment die klanten geld of vertrouwen kosten.

Legenda status: ☐ open · ☑ gefixt · ⚠️ vereist actie van eigenaar (buiten code) · 🔍 nog te verifiëren

---

## Openstaand — stand 2026-08-12

Alle onderstaande items zijn op 2026-08-12 opnieuw tegen de code, DNS en Coolify nagetrokken. **30 van de 52 items zijn volledig dicht**; hieronder staat wat resteert.

> De tien AUDIT-6x-items komen uit de losse security-review van juni 2026, die nooit in deze audit was verwerkt. Ze zijn op 2026-08-12 geverifieerd en staan alle tien nog open — zie sectie 5.

**Eigenaar-actie (buiten code):**

| Item | Wat | Status |
|---|---|---|
| AUDIT-00 | Gmail/SMTP-wachtwoord roteren + Stripe keys & webhook-secret rollen | ⚠️ open — niet extern verifieerbaar |
| AUDIT-35a | DB-backups inrichten | ☑/⚠️ dagelijks schema draait aantoonbaar (4 geslaagde runs t/m 2026-08-16) — maar nog **geen off-site kopie** en het herstelpad is nooit getest |
| AUDIT-35b | Error-monitoring (Sentry) | ⚠️ open — geen Sentry/Bugsnag in `composer.json` of `package.json` |

**Actieve storing:**

| Item | Sev | Wat | Bewijs |
|---|---|---|---|
| AUDIT-70 | HIGH | `app.aidatim.nl` → 503; wachtwoord-reset en Stripe-onboarding linken naar een dood domein | 4/4 × 503, terwijl `aidatim.nl`/`portal`/`ama-stichting` 200 geven |
| AUDIT-74 | MEDIUM | "Lid toevoegen" loopt via het publieke endpoint → 429 na tien leden | `App.tsx:103` |

**Code follow-ups:**

| Item | Sev | Wat | Geverifieerd open |
|---|---|---|---|
| AUDIT-32 | HIGH | Prod draait op `php artisan serve` | `Dockerfile.prod:49` |
| AUDIT-12b | MEDIUM | Org-resolutie op publiek endpoint client-gestuurd | `PublicMemberRegistrationController.php:181-230` |
| AUDIT-28 | MEDIUM | Webhook valideert `event->account` niet (latent bij Express) | `StripeWebhookController.php` |
| AUDIT-49 | LOW | Stripe redirect-URLs alleen als `url`/`string` gevalideerd | `ContributionPaymentController.php:55`, `SubscriptionController.php:75` |
| AUDIT-50 | LOW | Mobile-hardening (prod-URL, Ktor-logging, `allowBackup`) | `ApiConfig.kt:10`, `HttpClientFactory.kt:27`, `AndroidManifest.xml:9` |
| AUDIT-51 | LOW | Healthcheck ontbreekt in `docker-compose.prod.yml`, checkt geen DB | alleen in `docker-compose.coolify.yml:51` |
| AUDIT-53 | LOW | `hasRole()` query't per aanroep (N+1) | `User.php:92` |
| AUDIT-54 | LOW | Hardcoded `aidatim.nl` in middleware + frontend-config | `ResolveOrganisationFromSubdomain.php:129`, `config.ts:23` |
| AUDIT-60 | HIGH | Uitnodigingstokens plaintext in de DB | `MemberAccountService.php:199` |
| AUDIT-61 | HIGH | IBAN's plaintext in de DB (AVG art. 32) | `Member.php` — geen `encrypted` cast |
| AUDIT-62 | MEDIUM | E-mailwijziging zonder herbevestiging | `SelfServiceController.php:39` |
| AUDIT-63 | MEDIUM | Volledige IBAN's in API-responses | `MemberController.php:304` |
| AUDIT-64 | MEDIUM | Geen security headers (alleen `Cache-Control`) | `frontend/docker/nginx.conf:21` |
| AUDIT-65 | MEDIUM | 50 ongeguarde `console.*` in de productie-bundle | `frontend/src/api/axios.ts` |
| AUDIT-66 | MEDIUM | Stripe-foutmeldingen doorgegeven aan de client | `MemberSepaSubscriptionController.php:98,136` |
| AUDIT-67 | LOW | Monitor-route mist `role`-middleware | `routes/api.php:126` |
| AUDIT-68 | LOW | Webhook-endpoint zonder rate limiting | `routes/api.php:195` |
| AUDIT-69 | LOW | `STRIPE_CONNECT_WEBHOOK_SECRET` niet in `.env.example` | `backend/.env.example` |

**Opgelost sinds de vorige stand:** AUDIT-52 (SPF/DKIM/DMARC — zie sectie 3).

---

## 0. NU — los van livegang

- ⚠️ **AUDIT-00 · CRITICAL · Live credentials in publieke repo.** `DEPLOYMENT.md` bevatte echte SMTP-, DB- (incl. root), Stripe secret- en Stripe **webhook signing**-secrets. Repo is publiek. Alle vier zijn gecompromitteerd.
  - ☑ **Code-actie gedaan:** waarden in `DEPLOYMENT.md` vervangen door placeholders.
  - ⚠️ **Eigenaar-actie (openstaand — kan ik niet doen):** roteer Gmail/SMTP-wachtwoord `info@aidatim.nl` en roll Stripe API-keys + nieuw webhook-secret. *(git-historie bevat de oude waarden nog — rotatie is de echte remedie.)*
  - ℹ️ **MySQL: rotatie NIET urgent.** Geverifieerd in Coolify (2026-07-21): de productie-DB draait al op een sterk, willekeurig Coolify-wachtwoord (user `mysql`, db `default`), NIET de zwakke waarde die in `DEPLOYMENT.md` stond — die was nooit de echte productie-credential. DB is niet publiek (alleen binnen het Coolify-netwerk). Optioneel roteren kan (het echte wachtwoord passeerde 2026-07-21 wel de MCP-context bij verificatie), maar het is lage prioriteit.
- ☑ **AUDIT-01 · HIGH · Hardcoded persoonlijk wachtwoord** in `FixMemberAccounts.php` — vervangen door `Str::password(16)` (eenmalig getoond); hardcoded persoonlijke default-emails verwijderd. ⚠️ **De letterlijke waarde stond tot 2026-08-17 in dit document en dus in de publieke repo.** Het was een persoonlijk ogend wachtwoord (naam + jaartal). Is het elders hergebruikt — mail, andere diensten — verander het daar dan. De git-historie bevat 'm nog; alleen vervangen op de plekken waar je 'm gebruikt helpt echt.

---

## 1. Blockers vóór livegang — Beveiliging

- ☑ **AUDIT-10 · HIGH · CSRF.** Verificatie weer aan (`ValidateCsrfToken::class` in `config/sanctum.php`). Het aanzetten brak eerst de login met 419; **root cause**: axios ≥1.4 stuurt de `X-XSRF-TOKEN`-header bij cross-origin requests (frontend `aidatim.nl` → API `api.aidatim.nl`) alleen mee met `withXSRFToken: true` — toegevoegd in `frontend/src/api/axios.ts`. Live geverifieerd: login zonder header → 419, mét header → 422; `withXSRFToken` zit in de gedeployede bundle; CORS staat apex én subdomeinen toe met credentials.
- ☑ **AUDIT-11 · HIGH · Geen rate limiting op `/api/auth/login`.** Login binnen de `throttle:5,1`-groep gebracht in `routes/api.php`.
- ☑ **AUDIT-12 · HIGH · Publieke registratie + offline SEPA-mandaat.** Het geldrisico weggenomen: publieke registratie zet **geen** SEPA-incasso meer op (geen offline mandaat onder geleende org_admin) — lid wordt aangemaakt met IBAN + akkoord, beheerder activeert incasso bewust. `throttle:10,1` op de `public`-groep tegen spam. **Follow-up (open):** org-resolutie leunt nog op client-input (`org_id`/subdomein-header); harden met een gesigneerd per-org registratietoken — zie AUDIT-12b.
- ☐ **AUDIT-12b · MEDIUM · Org-resolutie op publiek endpoint is client-gestuurd** (`org_id` + spoofbare `X-Organisation-Subdomain`). Nu enkel nog spam/nuisance (money-movement is weg, throttle actief). → gesigneerd per-org registratietoken. *Herverificatie 2026-08-12: nog open — `PublicMemberRegistrationController::resolveOrganisation()` neemt nog steeds `org_id` als prioriteit 1 en de `X-Organisation-Subdomain`-header als fallback. Zie ook de openstaande PR #5 (`fix/tenant-resolution-security`), die de Host-header vóór de custom header zet in `ResolveOrganisationFromSubdomain` — dat is een deel-mitigatie van hetzelfde patroon.*
- ☑ **AUDIT-13 · HIGH · Excel-import laadt hele bestand in geheugen.** `WithLimit` op `MemberRowsImport` (cap 2000 rijen) + 422-afwijzing bij overschrijding → geheugen-DoS gedicht bij de bron.

## 2. Blockers vóór livegang — Betalingen

- ☑ **AUDIT-20 · HIGH · Eenmalige SEPA-contributie direct "betaald".** `handleContributionCheckoutSession` markeert nu alleen 'paid' bij `payment_status === 'paid'`, anders 'processing' (nieuwe `markTransactionProcessing`). `async_payment_succeeded`/`async_payment_failed` toegevoegd aan de router.
- ☑ **AUDIT-21 · HIGH · Dubbele maandincasso.** Duplicate-guard toegevoegd in `ContributionPaymentController::setupSubscription` (422 bij lopende incasso) + de recurring-checkbox verborgen in `MemberContributionPage.tsx` bij een actieve incasso.
- ☑ **AUDIT-22 · HIGH · Stripe-subscription binnen DB-transactie.** Compenserende cancel toegevoegd: faalt een lokale write na `subscriptions->create`, dan wordt de Stripe-subscription geannuleerd vóór de rollback → geen wees-incasso meer. *(Volledige herstructurering — Stripe-calls volledig buiten de transactie — is een grotere follow-up; deze mitigatie dicht het geldrisico.)*
- ☑ **AUDIT-23 · MEDIUM · `charge.refunded` niet afgehandeld.** `handleChargeRefunded` toegevoegd: volledige refund → transactie 'refunded' + records 'open'; partiële refund vastgelegd in metadata + audit.
- ☑ **AUDIT-24 · MEDIUM · Mislukte maandincasso laat geen spoor.** `recordFailedMemberInvoice` upsert nu een `MemberContributionRecord`(failed) + `PaymentTransaction`(failed) per periode (deduped op invoice-id).
- ☑ **AUDIT-25 · MEDIUM · Member-sub-downgrade naar 'incomplete'.** Org-guard gespiegeld in de member-branch (active/trial blijft behouden) + `whereNull('latest_checkout_session_id')`-filter uit het recovery-command gehaald.
- ☑ **AUDIT-26 · MEDIUM · Amount-update negeert fee.** Gross-up geëxtraheerd naar gedeelde `grossUpBillingAmount()` en toegepast in zowel setup als update; opgeslagen `amount` nu consistent (bruto).
- ☑ **AUDIT-27 · MEDIUM · €0-subscription mogelijk.** `amount <= 0`-guard bovenaan `setupSepaSubscription` (geldt voor élk aanroeppad, incl. member self-service).
- ☐ **AUDIT-28 · MEDIUM · Webhook valideert `event->account` niet** → **latent** (alleen relevant bij Standard-accounts; nu Express). Bewust uitgesteld: vereist account→org-mapping in elke handler. → org matchen tegen connected account vóór overstap naar Standard. *Herverificatie 2026-08-12: nog open en nog steeds latent — Stripe draait onveranderd op Express-accounts.*

## 3. Blockers vóór livegang — Data-integriteit & operatie

- ☑ **AUDIT-30 · MEDIUM · Geen unique-constraint op member-subscription.** Unique index op `member_subscriptions.stripe_subscription_id` (migratie) → backt de duplicate-guards. *NB: unique op `member_contribution_records(member_id, period)` bewust NIET toegevoegd — meerdere handmatige contributies in één maand zijn legitiem. De webhook/cron dedup blijft app-level (deduped op invoice-id); een `stripe_invoice_id`-kolom + unique is mogelijke follow-up, maar vereist eerst opschonen van prod-data.*
- ☑ **AUDIT-31 · HIGH · Geen queue-worker en geen scheduler in prod.** `worker`- (`queue:work`) en `scheduler`-service (`schedule:work`) toegevoegd aan beide compose-bestanden; `RUN_MIGRATIONS=false` op die containers zodat alleen de web-container migreert. `QUEUE_CONNECTION=database` nu expliciet gezet (jobs-tabel bestaat). *(Push draaide al synchroon via `dispatchSync()`; de scheduler was écht dood — nu opgelost.)*
- ☑/🔧 **AUDIT-32 · HIGH · Productie draait op `php artisan serve`.** Interim: `PHP_CLI_SERVER_WORKERS=4` → parallelle requests i.p.v. één. **Follow-up (open):** echte app-server (FrankenPHP/Octane of php-fpm+nginx) — vereist Dockerfile-wijziging + build-test. *Herverificatie 2026-08-12: nog open — `backend/Dockerfile.prod:49` is nog `CMD ["php", "artisan", "serve", ...]`. Dit is de zwaarste resterende post; onder echte load is de dev-server de bottleneck.*
- ☑ **AUDIT-33 · MEDIUM · Organisatie-verwijdering laat live Stripe-subscriptions achter.** Bevestigd: `PlatformOrganisationController::destroy` verwijderde `MemberSubscription`-rijen zonder Stripe te annuleren. Nu: best-effort `subscriptions->cancel` op de connected account vóór de DB-transactie (fouten gelogd, niet fataal).
- ☑ **AUDIT-34 · MEDIUM · Geseede `platform_admin` met zwak default-wachtwoord.** Bevestigd: `RolesAndAdminSeeder` gebruikte een zwak, in de code vastgelegd default-wachtwoord + overschreef het wachtwoord bij elke deploy (`updateOrCreate`). Nu: bestaande admin blijft ongemoeid; nieuwe admin vereist `PLATFORM_ADMIN_PASSWORD` of krijgt een gegenereerd wachtwoord dat één keer wordt getoond.
- ☑ **AUDIT-52 · Mail-deliverability: geen SPF/DKIM/DMARC op `aidatim.nl`** → **opgelost**. Was op 2026-07-21 nog nul TXT-records. **Herverificatie 2026-08-12 (`dig` @8.8.8.8): alle drie staan er nu:**
  - SPF → `v=spf1 include:_spf.google.com ~all`
  - DKIM → `google._domainkey` bevat een geldige 2048-bits RSA-sleutel
  - DMARC → `v=DMARC1; p=none; rua=mailto:info@aidatim.nl`

  *Vervolgstap (optioneel, geen blocker):* DMARC staat op `p=none` — puur monitoren. Als de `rua`-rapporten een paar weken schoon zijn, kan dit naar `p=quarantine` en later `p=reject` voor echte spoofing-bescherming.
- ☑/⚠️ **AUDIT-35 · Migratie-fouten geslikt bij deploy** → **opgelost**: `entrypoint.sh` gebruikt geen `|| echo` meer, een mislukte migratie laat de boot nu fataal falen. **Open (eigenaar/infra), herverifieerd 2026-08-12:**
  - ☑ **DB-backups draaien en zijn geverifieerd.** Coolify gaf tot 2026-08-12 nul backup-schedules terug voor de prod-MySQL (`m0scs8g0s8cok04gswook00o`, user `mysql`, db `default`) — er was geen enkel herstelpunt. Ingericht op 2026-08-12: schedule `j4gg8k48occwgo0ws0oco4ck`, dagelijks 03:00 (`0 3 * * *`), database `default`, retentie 14 backups / 14 dagen, lokaal op de server. **Geverifieerd 2026-08-16: vier geslaagde runs op rij** (13, 14, 15 en 16 augustus, telkens 03:00, status `success`, ~406 KB per dump). Het schema werkt dus aantoonbaar. *Zijdelingse observatie: een dump van 406 KB betekent dat de productiedatabase nu nog vrijwel leeg is — het herstelpad is nog niet getest op een dataset van realistische omvang.*
  - **Backups staan alleen lokaal — dat is nog geen volwaardige backupstrategie.** De dumps liggen op dezelfde server als de database, dus verlies van die server betekent verlies van database én backups. De server draait MinIO-instanties, maar die horen bij andere projecten (`popify-minio`, `smartpowerdeals-minio`) en zijn geen geschikte bestemming voor deze data. → Voeg een off-site S3-bestemming toe (eigen bucket) en zet `save_s3` aan op de schedule.
  - **Error-monitoring: nog niet ingericht.** Geen `sentry`/`bugsnag` in `backend/composer.json` of `frontend/package.json` — fouten in productie zijn alleen zichtbaar als je actief in de logs kijkt.
- ☑ **AUDIT-47 · `SESSION_SECURE_COOKIE`/`SESSION_SAME_SITE` niet in prod-boot** → nu geschreven in `entrypoint.sh` (`SESSION_SECURE_COOKIE=true`, `SESSION_SAME_SITE=lax`) en geforward in compose.
- ☐ **AUDIT-70 · HIGH · `app.aidatim.nl` geeft 503 — wachtwoord-reset en Stripe-onboarding zijn stuk.** Ontdekt op 2026-08-12.

  **Waarneming.** `https://app.aidatim.nl` geeft consistent `HTTP 503 — no available server` (4/4 pogingen, elke route). De andere frontend-domeinen doen het wél: `aidatim.nl` → 200, `portal.aidatim.nl` → 200, `ama-stichting.aidatim.nl` → 200. De backend is volledig gezond (`api.aidatim.nl/up` → 200 ×3, publiek endpoint → 422). De frontend-container draait dus prima; dit is puur routering.

  **Oorzaak.** De frontend-service in `docker_compose_domains` van de Coolify-app kent deze domeinen: `aidatim.nl`, `ama-stichting.aidatim.nl`, `*.aidatim.nl`, `portal.aidatim.nl`, `isn-gorinchem-suleyman-celebi.aidatim.nl`. **`app.aidatim.nl` staat er niet bij** — en de wildcard `*.aidatim.nl` blijkt in de praktijk niet te matchen, want alleen de expliciet genoemde subdomeinen antwoorden. Tegelijk staat de productie-env `FRONTEND_URL` wél op `https://app.aidatim.nl` (buildtime + runtime).

  **Gevolgen — alles wat een link op `FRONTEND_URL` bouwt wijst naar een dood domein:**

  | Waar | Wat breekt |
  |---|---|
  | `User::sendPasswordResetNotification` (`User.php:106`) | **Niemand kan zijn wachtwoord resetten** — geldt voor alle rollen |
  | `OrganisationStripeService::buildFrontendUrl` (`:206`) | Org-admin komt na Stripe Connect-onboarding op een dode pagina |
  | `OrganisationWelcomeMailable` (`:25`) | Nieuwe organisatie kan via de welkomstmail geen abonnement kiezen |
  | `OrganisationPaymentReminderMailable` (`:25`) | Betaalherinnering linkt naar een dood domein |
  | `MemberInvitationMailable` (`:26`) | Werkt **wel** bij een org mét subdomein — die strípt de `app.`-prefix (`:35-37`) en linkt naar `<org>.aidatim.nl`. Zónder subdomein valt 'ie terug op `FRONTEND_URL` en is de activatielink stuk |

  **Fix (één van beide, allebei in Coolify):**
  1. *Voorkeur:* zet `app.aidatim.nl` bij de domeinen van de `frontend`-service en herdeploy. Dit herstelt het gedrag zoals `CLAUDE.md` het beschrijft.
  2. *Alternatief:* zet `FRONTEND_URL` op `https://aidatim.nl` (geverifieerd 200 op `/reset-password`, `/organisation/subscription` en `/portal/activate`). Let op: de variabele is `is_buildtime: true`, dus dit vereist een **rebuild**, niet alleen een herstart. De `app.`-strip in `MemberInvitationMailable` wordt dan een no-op en blijft correct werken.

  Zolang dit openstaat is elke wachtwoord-reset-mail een doodlopende link.

  **Herverificatie 2026-08-16: nog steeds 503.** Vier dagen na ontdekking is er niets veranderd — `app.aidatim.nl` → 503, `aidatim.nl` → 200, `api.aidatim.nl/up` → 200. De storing loopt dus al minstens vier dagen, en waarschijnlijk veel langer: er is niets dat 'm recent kan hebben veroorzaakt. Dat betekent ook dat niemand het gemeld heeft — wat past bij het feit dat er nog nauwelijks echte gebruikers zijn (zie de backup-dumpgrootte hierboven), maar het is wel het bewijs dat er geen monitoring is die dit zou opmerken (AUDIT-35b).

---

## 4. Hardening (low severity)

- ☑ **AUDIT-40 · Sanctum-tokens verlopen nooit.** `expiration` op 30 dagen (env-overrideable) + mobiele `token()` revoket nu eerdere tokens van hetzelfde device.
- ☑ **AUDIT-41 · Zwak wachtwoordbeleid.** Centraal `Password::defaults()` (min 10, hoofd-/kleine letters, cijfers) in `AppServiceProvider`, toegepast op registratie/activatie/reset.
- ☑ **AUDIT-42 · Email-enumeratie.** `/api/auth/token` doet nu altijd een bcrypt-vergelijking (constant-time), ook bij niet-bestaande gebruiker.
- ☑ **AUDIT-43 · CSV formula-injection.** Ledenexport prefixt cellen die met `= + - @`/tab/CR beginnen met een quote.
- ☑ **AUDIT-44 · IBAN zonder mod-97-checksum.** Herbruikbare `App\Rules\ValidIban` (formaat + mod-97) toegevoegd en toegepast in de publieke aanmelding én `SetupSepaSubscriptionRequest` (dedup). Gedekt door `PublicMemberRegistrationTest`.
- ☑ **AUDIT-45 · Negatieve contributiebedragen.** `min:0` i.p.v. `between:-…` in Store/UpdateMemberRequest.
- ☑ **AUDIT-46 · Ongebonden `per_page`.** Geclamped op 1–100 in beide post-controllers.
- ☑ **AUDIT-47 · `SESSION_SECURE_COOKIE`** — zie sectie 3 (entrypoint schrijft 'm nu).
- ☑ **AUDIT-48 · Contributie-matrix-pagina niet gerouteerd.** Route `/organisation/contributions/matrix` toegevoegd in `App.tsx`.
- ☐ **AUDIT-49 · Client-supplied Stripe redirect-URLs** alleen als `url` gevalideerd. *(Follow-up: host-allowlist `*.aidatim.nl` of server-side afleiden.)* *Herverificatie 2026-08-12: nog open — `ContributionPaymentController.php:55-56` valideert `['required','url']`, `SubscriptionController.php:75-76` zelfs alleen `['required','string','max:2048']` (zwakker). Beide paden accepteren dus een willekeurige externe host als redirect-doel.*
- ☐ **AUDIT-50 · Mobile:** hardcoded prod-API-URL, Ktor-logging in release, geen HTTP-timeouts, ongesigneerde/unminified release-build, iOS geen push, keychain-fallback plaintext, `allowBackup=true`. *(Follow-up: aparte mobile-hardening-ronde; app is nog niet store-klaar.)* *Herverificatie 2026-08-12: nog open — `ApiConfig.kt:10` (hardcoded `https://api.aidatim.nl`), `HttpClientFactory.kt:27` (`install(Logging)` zonder release-guard), `AndroidManifest.xml:9` (`allowBackup="true"`).*
- ☐ **AUDIT-51 · Healthcheck** checkt alleen framework-boot (geen DB); ontbreekt in `docker-compose.prod.yml`. *(Follow-up.)* *Herverificatie 2026-08-12: nog open — healthcheck staat alleen in `docker-compose.coolify.yml:51` en curlt `/up`, dat via `bootstrap/app.php:15` alleen de framework-boot test, niet de DB-verbinding.*
- ☐ **AUDIT-53 · LOW · `hasRole()` doet een DB-query per aanroep.** `User.php:92` gebruikt `$this->roles()->where(...)->exists()` — bij meerdere role-checks per request (middleware + controller + policy) levert dat een N+1 op. → Draaien op de eager-geladen `roles`-collectie. *Openstaande PR #3 (`fix/auth-performance-eager-loading`) bevat precies deze fix.*
- ☐ **AUDIT-54 · LOW · Hardcoded root-domein `aidatim.nl`.** Zit vast in `ResolveOrganisationFromSubdomain.php:129` en `frontend/src/api/config.ts:23,63` — een tweede omgeving (staging, ander domein) vergt code-wijzigingen i.p.v. config. → Configureerbaar root-domein. *Openstaande PR #2 (`fix/hardcoded-domains`) bevat deze fix, inclusief een `config/tenancy.php` die nog niet in `main` zit.*

---

## 5. Uit de security-review van juni 2026

Op 12 juni 2026 is er een aparte statische security-review gedaan (branch `claude/code-security-analysis-65bkg1`, nooit gemerged). De meeste bevindingen daaruit zijn inmiddels opgelost via de audit hierboven — rate limiting op login (AUDIT-11), op activatie en publieke registratie (AUDIT-12 + PR #8), `SESSION_SECURE_COOKIE` (AUDIT-47) en negatieve bedragen (AUDIT-45).

**Tien bevindingen waren nog nergens vastgelegd.** Alle tien zijn op 2026-08-12 tegen de huidige `main` geverifieerd en staan nog open. De branch is daarna opgeruimd; dit is de blijvende vastlegging.

- ☐ **AUDIT-60 · HIGH · Uitnodigingstokens staan plaintext in de database.** De tokens zijn sterk (`Str::random(64)`, eenmalig, 7 dagen geldig — `MemberAccountService.php:199`), maar worden onversleuteld opgeslagen in `member_invitations.token`. Bij een DB-lek (gestolen backup, gelekte credentials) zijn álle openstaande activatielinks direct bruikbaar om ledenaccounts over te nemen. → Sla `hash('sha256', $token)` op en vergelijk bij activatie op hash. Bcrypt is niet nodig — het token heeft genoeg entropie, en SHA-256 houdt de lookup-query mogelijk.
- ☐ **AUDIT-61 · HIGH · IBAN's staan plaintext in de database.** `members.iban` en `members.sepa_subscription_iban` — het `Member`-model heeft geen `encrypted` cast. IBAN's zijn financiële persoonsgegevens (AVG art. 32); bij een lek liggen de bankrekeningnummers van alle leden van alle organisaties op straat. → Twee stappen: (1) `sepa_subscription_iban` is na de Stripe-setup functioneel overbodig — Stripe bewaart het mandaat — dus bewaar daar alleen de laatste vier cijfers of laat de kolom vervallen; (2) zet `'iban' => 'encrypted'` in de casts van `Member`. *Let op: daarna kan er niet meer in SQL op gefilterd worden en wordt `APP_KEY`-rotatie een migratie.*
- ☐ **AUDIT-62 · MEDIUM · E-mailadres wijzigen zonder herbevestiging.** `SelfServiceController.php:39-40` schrijft een nieuw e-mailadres direct weg — geen verificatie van het nieuwe adres, geen notificatie naar het oude. Bij een gekaapte sessie neemt een aanvaller het account permanent over, want de wachtwoord-reset gaat daarna naar het nieuwe adres. → Bevestigingslink naar het nieuwe adres, notificatie naar het oude, wijziging pas doorvoeren na bevestiging.
- ☐ **AUDIT-63 · MEDIUM · Volledige IBAN's in API-responses.** `MemberController.php:304` geeft het complete IBAN terug in de ledenlijst. `ContributionReportController.php:189-196` maskeert al netjes (`NL12****3456`) — dat patroon hoort overal te gelden, met het volledige IBAN alleen waar het functioneel moet (het bewerkformulier).
- ☐ **AUDIT-64 · MEDIUM · Geen security headers.** `frontend/docker/nginx.conf` bevat één `add_header`, en dat is een `Cache-Control`. Er is geen `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Strict-Transport-Security` of CSP. Gevolg: clickjacking is mogelijk, en activatie- en reset-tokens die in URLs staan kunnen via de Referer-header naar externe sites lekken. → Begin met de vier simpele headers; CSP daarna apart, want die vereist testen met de Stripe-domeinen.
- ☐ **AUDIT-65 · MEDIUM · Debug-logging in de productie-frontend.** `frontend/src/api/axios.ts` bevat 50 `console.*`-aanroepen, geen enkele geguard met `import.meta.env.DEV`. Elke request, response-body en foutdetail belandt in de browserconsole van elke gebruiker. → Guard alles met `import.meta.env.DEV`.
- ☐ **AUDIT-66 · MEDIUM · Stripe-foutmeldingen doorgegeven aan de client.** `MemberSepaSubscriptionController.php:98,136` zet `$e->getMessage()` van Stripe letterlijk in de melding voor de gebruiker. → Server-side loggen, generieke melding terugsturen.
- ☐ **AUDIT-67 · LOW · Monitor-route mist `role`-middleware.** `routes/api.php:126-135` heeft geen `role:`-middleware; de rolcheck zit alleen in `MonitorController` zelf. Het wérkt, maar wijkt af van alle andere routegroepen — precies het soort inconsistentie waar later een gat in valt. → `RoleMiddleware` meerdere rollen laten accepteren (`role:monitor,org_admin`).
- ☐ **AUDIT-68 · LOW · Webhook-endpoint zonder rate limiting.** `routes/api.php:195` staat buiten elke throttle-groep. Signatuurverificatie vangt nep-events af, maar een flood kost nog steeds CPU en logruimte. → `throttle` met een ruime limiet.
- ☐ **AUDIT-69 · LOW · `STRIPE_CONNECT_WEBHOOK_SECRET` ontbreekt in `.env.example`.** De code en `entrypoint.sh` kennen de variabele, maar hij is nergens gedocumenteerd. Zonder deze secret worden Connect-events geweigerd. Documentatiegat, geen lek.

**Aanbevolen volgorde:** AUDIT-60 en 61 eerst (beide raken persoonsgegevens en zijn een kleine wijziging), dan 64 en 65, dan de rest in regulier onderhoud.

---

## 6. Gevonden bij de go-live-toets (2026-08-17)

Bij de beoordeling of het systeem op 1 september live kan, kwamen vier bevindingen boven die in geen enkele eerdere ronde stonden. Alle vier zelf tegen de code geverifieerd.

- ☑ **AUDIT-71 · HIGH · Terugboekingen en refunds worden stilzwijgend niet verwerkt.** In `stripe/stripe-php` ^18.2 bestaat de top-level `Invoice::$payment_intent` niet meer — de enige treffer in `vendor/stripe/stripe-php/lib/Invoice.php` zit genest in `last_finalization_error`. Ledencontributies worden daardoor opgeslagen met `stripe_payment_intent_id = null`. `handleChargeDisputeCreated` (`StripeWebhookController.php:967`) en `handleChargeRefunded` (`:1129`) zoeken de bijbehorende `PaymentTransaction` **uitsluitend** op dat veld, vinden niets, loggen een warning en stoppen.

  **Gevolg:** een storno komt binnen, het systeem verwerkt 'm niet, en de contributiematrix blijft "betaald" tonen. Bij SEPA Core heeft een lid **acht weken onvoorwaardelijk stornorecht** — dit is de normale gang van zaken, geen randgeval. Dit is de enige bekende bug die stilzwijgend de boekhouding van een klant onjuist maakt.

  *Nuance:* het aanmaken van het contributierecord zélf was hier al voor gepatcht — `:775` viel terug op de invoice-ID. Alleen de koppeling voor disputes en refunds miste die terugval.

  **Opgelost 2026-08-17.** Drie hulpmethodes toegevoegd in `StripeWebhookController`:
  - `resolveInvoicePaymentIntentId()` en `resolveInvoiceChargeId()` lezen de identifiers uit zowel de oude vorm (`payment_intent`/`charge` op de invoice) als de nieuwe (`payments.data.0.payment.*`), zodat de code werkt ongeacht de API-versie waarmee de webhook binnenkomt.
  - `findPaymentTransaction()` zoekt achtereenvolgens op payment intent → charge → invoice-id. De invoice-id ligt altijd vast in de metadata, dus die laatste sleutel werkt altijd.
  - `backfillTransactionIdentifiers()` schrijft de identifiers die bij een later event bekend worden alsnog op de transactie.

  De charge-id wordt nu bij het aanmaken vastgelegd in `metadata->stripe_charge_id`, want een dispute draagt wél een `charge` — daarmee is de koppeling rond zonder extra Stripe API-call. Toegepast op `charge.dispute.created`, `charge.dispute.closed`, `charge.refunded` en het mislukte-factuurpad (waar de retry-teller om dezelfde reden stil bleef staan).

  **Gedekt door tests:** `StripeWebhookDisputeLinkageTest` post echte, ondertekende webhook-events. Geverifieerd dat de twee bug-tests falen zónder de fix en slagen mét, terwijl de regressietest (koppelen via payment intent) in beide gevallen slaagt.

- ☑ **AUDIT-72 · HIGH · De eigen SaaS-omzet wordt niet vastgelegd.** `StripeWebhookController.php:654`: `if ($amountPaid <= 0 || ! $paymentIntentId) { return; }`. Omdat `$paymentIntentId` door dezelfde oorzaak als AUDIT-71 altijd leeg is, sloeg deze guard **elke** organisatie-factuur over en werd er nooit een `PaymentTransaction` van type `saas` aangemaakt. De organisatie ging wel netjes op `active`, dus er was geen zichtbaar symptoom behalve een lege omzetadministratie.

  **Opgelost 2026-08-17:** de `! $paymentIntentId`-voorwaarde is uit de guard gehaald; dedupliceren gaat nu via `findPaymentTransaction()` op de invoice-id, die er altijd is. Daardoor blijft de bescherming tegen dubbele records bij webhook-retries intact — die is zelfs steviger dan eerst, want hij hing voorheen aan een veld dat leeg kon zijn.

- ☑ **AUDIT-73 · HIGH · Wachtwoord-reset was onbruikbaar, los van AUDIT-70.** `AuthProvider` omhult in `App.tsx` álle subdomein-routes, inclusief `/reset-password`, `/forgot-password` en `/aanmelden`. Bij mount roept `refreshMe()` `/api/auth/me` aan (`AuthContext.tsx:54`); voor een uitgelogde bezoeker is dat een 401. De axios-interceptor (`axios.ts:203-212`) zondert alleen login/registratie/activatie uit en riep dus `authManager.clearAuth()` aan, en die deed voor elk pad buiten `/portal` een harde `window.location.assign('/login')`.

  **Gevolg:** wie op een wachtwoord-resetlink klikte werd naar `/login` gestuurd vóór hij een nieuw wachtwoord kon kiezen. Dat raakt ook nieuwe org-admins, want die krijgen alléén een resetlink om binnen te komen. Dit stond los van de 503 uit AUDIT-70 — dat domein repareren alléén had de reset niet werkend gemaakt.

  **Opgelost 2026-08-17:** `authManager.ts` kent nu een expliciete `PUBLIC_PATHS`-lijst (login, forgot/reset-password, register-organisation, aanmelden, portal-login/forgot/activate) die nooit redirect. De portal-tak is meteen vereenvoudigd, want `/portal/activate` en `/portal/login` vallen nu onder dezelfde regel. `tsc --noEmit` slaagt. 🔍 **Nog te doen:** end-to-end testen op een echt subdomein na deploy, voor zowel een org_admin als een lid.

- ☐ **AUDIT-74 · MEDIUM · "Lid toevoegen" loopt via het publieke endpoint en botst op de throttle.** `App.tsx:103` routeert `/organisation/members/new` naar `PublicMemberRegistrationPage`, terwijl `OrganisationMemberCreatePage.tsx` volledig bestaat en nergens gebruikt wordt. De beheerder voert zijn ledenbestand dus in via `/api/public/member-registration`, dat onder `throttle:10,1` staat (`routes/api.php:36`) — **na tien leden per minuut volgt een 429 midden in het invoerwerk**. Bovendien loopt de aanmaak dan langs de publieke org-resolutie uit AUDIT-12b in plaats van langs de geauthenticeerde beheerdersroute. → Route koppelen aan `OrganisationMemberCreatePage` binnen een `ProtectedRoute` met `roles={['org_admin']}`.

---

## Sterke punten (bewust behouden)

Geen `dangerouslySetInnerHTML` (geen web-XSS); alle writes via FormRequests (geen mass-assignment); invitation-tokens sterk (64 chars, single-use, 7 dagen); webhook-signatures verplicht met idempotency; geauthenticeerde tenant-isolatie hield stand (geen IDOR gevonden); `.env` en `google-services.json` correct gitignored; APP_DEBUG default false.

---

## Voortgang fixes

Zie git-historie; commits verwijzen naar de AUDIT-ID's hierboven. Laatste fix-ronde: PR #8 (`fix/auth-flow-gaps`), gemerged en live geverifieerd op 2026-07-22.

### Herverificatie-log

| Datum | Wat gecontroleerd | Uitkomst |
|---|---|---|
| 2026-07-21 | MySQL-credential in Coolify | Prod-DB draait op sterk Coolify-wachtwoord, niet de `DEPLOYMENT.md`-waarde → AUDIT-00 afgezwakt |
| 2026-07-22 | Live gedragstest publieke aanmelding | Ongeldig IBAN → 422 met de nieuwe melding; AUDIT-44 bevestigd live |
| 2026-08-12 | DNS (`dig` @8.8.8.8) | SPF + DKIM + DMARC aanwezig → **AUDIT-52 gesloten** |
| 2026-08-12 | Coolify backup-schedules prod-MySQL | 0 schedules → AUDIT-35a bevestigd open |
| 2026-08-12 | `composer.json` / `package.json` | Geen Sentry/Bugsnag → AUDIT-35b bevestigd open |
| 2026-08-12 | Code-check op 12b, 28, 32, 49, 50, 51 | Alle zes ongewijzigd open (regelverwijzingen per item) |
| 2026-08-12 | Nieuwe bevindingen | AUDIT-53 (`hasRole` N+1) en AUDIT-54 (hardcoded domein) toegevoegd |
| 2026-08-12 | Security-review juni 2026 doorgenomen | 10 nooit-vastgelegde bevindingen geverifieerd en opgenomen als AUDIT-60 t/m 69 (sectie 5); branch `claude/code-security-analysis-65bkg1` daarna opgeruimd |
| 2026-08-16 | Coolify backup-executions | 4 geslaagde runs op rij → AUDIT-35a lokaal gedeelte gesloten |
| 2026-08-17 | Go-live-toets voor 1 september | AUDIT-71 t/m 74 gevonden (sectie 6); AUDIT-73 meteen opgelost; drie letterlijke wachtwoorden uit dit document verwijderd |
