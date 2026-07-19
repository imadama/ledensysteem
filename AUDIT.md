# Production-Readiness Audit — Aidatim Ledensysteem

**Datum:** 2026-07-19
**Scope:** backend (Laravel 11), frontend (React), mobile (KMP), infra (Coolify/Docker)
**Methode:** 9 parallelle dimensie-reviewers + adversariële verificatie; de zwaarste bevindingen zijn nadien handmatig in de code nagetrokken.

## Eindoordeel

**Nog niet klaar voor betalende klanten.** De architectuur is degelijk (geauthenticeerde tenant-isolatie klopt, webhook-signatures verplicht, idempotency via `stripe_events`, disputes afgehandeld). Maar er is één kritiek lek dat directe actie vereist, plus blockers rond betalingen en deployment die klanten geld of vertrouwen kosten.

Legenda status: ☐ open · ☑ gefixt · ⚠️ vereist actie van eigenaar (buiten code) · 🔍 nog te verifiëren

---

## 0. NU — los van livegang

- ⚠️ **AUDIT-00 · CRITICAL · Live credentials in publieke repo.** `DEPLOYMENT.md` bevatte echte SMTP-, DB- (incl. root), Stripe secret- en Stripe **webhook signing**-secrets. Repo is publiek. Alle vier zijn gecompromitteerd.
  - ☑ **Code-actie gedaan:** waarden in `DEPLOYMENT.md` vervangen door placeholders.
  - ⚠️ **Eigenaar-actie (openstaand — kan ik niet doen):** roteer Gmail/SMTP-wachtwoord `info@aidatim.nl`, roll Stripe API-keys + nieuw webhook-secret, wijzig MySQL app- én root-wachtwoord. *(git-historie bevat de oude waarden nog — rotatie is de echte remedie.)*
- ☑ **AUDIT-01 · HIGH · Hardcoded wachtwoord `Imad2003!`** in `FixMemberAccounts.php` — vervangen door `Str::password(16)` (eenmalig getoond); hardcoded persoonlijke default-emails verwijderd.

---

## 1. Blockers vóór livegang — Beveiliging

- ☑ **AUDIT-10 · HIGH · CSRF uitgeschakeld** voor de cookie-SPA. `validate_csrf_token => null` vervangen door `ValidateCsrfToken::class` in `config/sanctum.php` — CSRF-verificatie op stateful SPA-requests hersteld.
- ☑ **AUDIT-11 · HIGH · Geen rate limiting op `/api/auth/login`.** Login binnen de `throttle:5,1`-groep gebracht in `routes/api.php`.
- ☑ **AUDIT-12 · HIGH · Publieke registratie + offline SEPA-mandaat.** Het geldrisico weggenomen: publieke registratie zet **geen** SEPA-incasso meer op (geen offline mandaat onder geleende org_admin) — lid wordt aangemaakt met IBAN + akkoord, beheerder activeert incasso bewust. `throttle:10,1` op de `public`-groep tegen spam. **Follow-up (open):** org-resolutie leunt nog op client-input (`org_id`/subdomein-header); harden met een gesigneerd per-org registratietoken — zie AUDIT-12b.
- ☐ **AUDIT-12b · MEDIUM · Org-resolutie op publiek endpoint is client-gestuurd** (`org_id` + spoofbare `X-Organisation-Subdomain`). Nu enkel nog spam/nuisance (money-movement is weg, throttle actief). → gesigneerd per-org registratietoken.
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
- ☐ **AUDIT-28 · MEDIUM · Webhook valideert `event->account` niet** → **latent** (alleen relevant bij Standard-accounts; nu Express). Bewust uitgesteld: vereist account→org-mapping in elke handler. → org matchen tegen connected account vóór overstap naar Standard.

## 3. Blockers vóór livegang — Data-integriteit & operatie

- ☐ **AUDIT-30 · MEDIUM · Geen unique-constraints** achter de dedup (`stripe_payment_intent_id`, `member_contribution_records` per periode, member-subscription) → webhook vs. uurlijkse sync racet → dubbele records. → unique indexes + `firstOrCreate`/upsert.
- ☐ **AUDIT-31 · HIGH · Geen queue-worker en geen scheduler in prod.** `QUEUE_CONNECTION=database` maar nergens een worker → push-notificaties worden nooit verstuurd; `subscriptions:check-incomplete` draait nooit. → worker- + scheduler-service in compose/entrypoint.
- 🔍 **AUDIT-32 · HIGH · Productie draait op `php artisan serve`** (single-threaded dev-server) als enig API-proces. → echte app-server (FrankenPHP/Octane of php-fpm+nginx). *Vereist infra-beslissing; zie fix-notitie.*
- 🔍 **AUDIT-33 · MEDIUM · Organisatie-verwijdering laat live Stripe-subscriptions achter** (niet geverifieerd).
- 🔍 **AUDIT-34 · MEDIUM · Geseede `platform_admin` met zwak default-wachtwoord** (niet geverifieerd).
- 🔍 **AUDIT-35 · MEDIUM · Geen DB-backups / geen error-monitoring / migratie-fouten geslikt bij deploy** (niet geverifieerd).

---

## 4. Hardening (low severity)

- ☐ **AUDIT-40 · Sanctum-tokens verlopen nooit** (`expiration => null`); mobiele login revoket oude tokens niet.
- ☐ **AUDIT-41 · Zwak wachtwoordbeleid** (`min:8`, geen complexiteit/breach-check) op alle entrypoints.
- ☐ **AUDIT-42 · Email-enumeratie** via early-return op `/api/auth/token` (geen constant-time hash).
- ☐ **AUDIT-43 · CSV formula-injection** in ledenexport (velden zetbaar via publieke registratie).
- ☐ **AUDIT-44 · IBAN zonder mod-97-checksum** op de meeste write-paths.
- ☐ **AUDIT-45 · Negatieve contributiebedragen** geaccepteerd (`between:-9999999.99,...`).
- ☐ **AUDIT-46 · Ongebonden `per_page`** op post-endpoints → grote-response-DoS.
- ☐ **AUDIT-47 · `SESSION_SECURE_COOKIE` niet gezet** in de prod-boot (entrypoint schrijft 'm niet).
- ☐ **AUDIT-48 · Contributie-matrix-pagina niet gerouteerd** (`OrganisationContributionsMatrixPage` onbereikbaar).
- ☐ **AUDIT-49 · Client-supplied Stripe redirect-URLs** alleen als `url` gevalideerd (geen host-allowlist).
- ☐ **AUDIT-50 · Mobile:** hardcoded prod-API-URL zonder env-scheiding; Ktor-logging in release; geen HTTP-timeouts; ongesigneerde/unminified release-build; iOS geen push; keychain-fallback plaintext; `allowBackup=true`.
- ☐ **AUDIT-51 · Healthcheck** checkt alleen framework-boot (geen DB); ontbreekt in `docker-compose.prod.yml`.

---

## Sterke punten (bewust behouden)

Geen `dangerouslySetInnerHTML` (geen web-XSS); alle writes via FormRequests (geen mass-assignment); invitation-tokens sterk (64 chars, single-use, 7 dagen); webhook-signatures verplicht met idempotency; geauthenticeerde tenant-isolatie hield stand (geen IDOR gevonden); `.env` en `google-services.json` correct gitignored; APP_DEBUG default false.

---

## Voortgang fixes

Zie git-historie op deze branch; commits verwijzen naar de AUDIT-ID's hierboven.
