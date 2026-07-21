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
  - ⚠️ **Eigenaar-actie (openstaand — kan ik niet doen):** roteer Gmail/SMTP-wachtwoord `info@aidatim.nl` en roll Stripe API-keys + nieuw webhook-secret. *(git-historie bevat de oude waarden nog — rotatie is de echte remedie.)*
  - ℹ️ **MySQL: rotatie NIET urgent.** Geverifieerd in Coolify (2026-07-21): de productie-DB draait al op een sterk, willekeurig Coolify-wachtwoord (user `mysql`, db `default`), NIET de `ama123` uit `DEPLOYMENT.md` — die waarde was nooit de echte productie-credential. DB is niet publiek (alleen binnen het Coolify-netwerk). Optioneel roteren kan (het echte wachtwoord passeerde 2026-07-21 wel de MCP-context bij verificatie), maar het is lage prioriteit.
- ☑ **AUDIT-01 · HIGH · Hardcoded wachtwoord `Imad2003!`** in `FixMemberAccounts.php` — vervangen door `Str::password(16)` (eenmalig getoond); hardcoded persoonlijke default-emails verwijderd.

---

## 1. Blockers vóór livegang — Beveiliging

- ☑ **AUDIT-10 · HIGH · CSRF.** Verificatie weer aan (`ValidateCsrfToken::class` in `config/sanctum.php`). Het aanzetten brak eerst de login met 419; **root cause**: axios ≥1.4 stuurt de `X-XSRF-TOKEN`-header bij cross-origin requests (frontend `aidatim.nl` → API `api.aidatim.nl`) alleen mee met `withXSRFToken: true` — toegevoegd in `frontend/src/api/axios.ts`. Live geverifieerd: login zonder header → 419, mét header → 422; `withXSRFToken` zit in de gedeployede bundle; CORS staat apex én subdomeinen toe met credentials.
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

- ☑ **AUDIT-30 · MEDIUM · Geen unique-constraint op member-subscription.** Unique index op `member_subscriptions.stripe_subscription_id` (migratie) → backt de duplicate-guards. *NB: unique op `member_contribution_records(member_id, period)` bewust NIET toegevoegd — meerdere handmatige contributies in één maand zijn legitiem. De webhook/cron dedup blijft app-level (deduped op invoice-id); een `stripe_invoice_id`-kolom + unique is mogelijke follow-up, maar vereist eerst opschonen van prod-data.*
- ☑ **AUDIT-31 · HIGH · Geen queue-worker en geen scheduler in prod.** `worker`- (`queue:work`) en `scheduler`-service (`schedule:work`) toegevoegd aan beide compose-bestanden; `RUN_MIGRATIONS=false` op die containers zodat alleen de web-container migreert. `QUEUE_CONNECTION=database` nu expliciet gezet (jobs-tabel bestaat). *(Push draaide al synchroon via `dispatchSync()`; de scheduler was écht dood — nu opgelost.)*
- ☑/🔧 **AUDIT-32 · HIGH · Productie draait op `php artisan serve`.** Interim: `PHP_CLI_SERVER_WORKERS=4` → parallelle requests i.p.v. één. **Follow-up (open):** echte app-server (FrankenPHP/Octane of php-fpm+nginx) — vereist Dockerfile-wijziging + build-test.
- ☑ **AUDIT-33 · MEDIUM · Organisatie-verwijdering laat live Stripe-subscriptions achter.** Bevestigd: `PlatformOrganisationController::destroy` verwijderde `MemberSubscription`-rijen zonder Stripe te annuleren. Nu: best-effort `subscriptions->cancel` op de connected account vóór de DB-transactie (fouten gelogd, niet fataal).
- ☑ **AUDIT-34 · MEDIUM · Geseede `platform_admin` met zwak default-wachtwoord.** Bevestigd: `RolesAndAdminSeeder` gebruikte `secret123!` als default + overschreef het wachtwoord bij elke deploy (`updateOrCreate`). Nu: bestaande admin blijft ongemoeid; nieuwe admin vereist `PLATFORM_ADMIN_PASSWORD` of krijgt een gegenereerd wachtwoord dat één keer wordt getoond.
- ☑/🔍 **AUDIT-35 · Migratie-fouten geslikt bij deploy** → **opgelost**: `entrypoint.sh` gebruikt geen `|| echo` meer, een mislukte migratie laat de boot nu fataal falen. **Open (eigenaar/infra):** DB-backups + error-monitoring (Sentry) zijn nog niet ingericht.
- ☑ **AUDIT-47 · `SESSION_SECURE_COOKIE`/`SESSION_SAME_SITE` niet in prod-boot** → nu geschreven in `entrypoint.sh` (`SESSION_SECURE_COOKIE=true`, `SESSION_SAME_SITE=lax`) en geforward in compose.

---

## 4. Hardening (low severity)

- ☑ **AUDIT-40 · Sanctum-tokens verlopen nooit.** `expiration` op 30 dagen (env-overrideable) + mobiele `token()` revoket nu eerdere tokens van hetzelfde device.
- ☑ **AUDIT-41 · Zwak wachtwoordbeleid.** Centraal `Password::defaults()` (min 10, hoofd-/kleine letters, cijfers) in `AppServiceProvider`, toegepast op registratie/activatie/reset.
- ☑ **AUDIT-42 · Email-enumeratie.** `/api/auth/token` doet nu altijd een bcrypt-vergelijking (constant-time), ook bij niet-bestaande gebruiker.
- ☑ **AUDIT-43 · CSV formula-injection.** Ledenexport prefixt cellen die met `= + - @`/tab/CR beginnen met een quote.
- ☐ **AUDIT-44 · IBAN zonder mod-97-checksum** op de meeste write-paths. *(Follow-up: mod-97-rule extraheren uit `SetupSepaSubscriptionRequest` en overal toepassen.)*
- ☑ **AUDIT-45 · Negatieve contributiebedragen.** `min:0` i.p.v. `between:-…` in Store/UpdateMemberRequest.
- ☑ **AUDIT-46 · Ongebonden `per_page`.** Geclamped op 1–100 in beide post-controllers.
- ☑ **AUDIT-47 · `SESSION_SECURE_COOKIE`** — zie sectie 3 (entrypoint schrijft 'm nu).
- ☑ **AUDIT-48 · Contributie-matrix-pagina niet gerouteerd.** Route `/organisation/contributions/matrix` toegevoegd in `App.tsx`.
- ☐ **AUDIT-49 · Client-supplied Stripe redirect-URLs** alleen als `url` gevalideerd. *(Follow-up: host-allowlist `*.aidatim.nl` of server-side afleiden.)*
- ☐ **AUDIT-50 · Mobile:** hardcoded prod-API-URL, Ktor-logging in release, geen HTTP-timeouts, ongesigneerde/unminified release-build, iOS geen push, keychain-fallback plaintext, `allowBackup=true`. *(Follow-up: aparte mobile-hardening-ronde; app is nog niet store-klaar.)*
- ☐ **AUDIT-51 · Healthcheck** checkt alleen framework-boot (geen DB); ontbreekt in `docker-compose.prod.yml`. *(Follow-up.)*

---

## Sterke punten (bewust behouden)

Geen `dangerouslySetInnerHTML` (geen web-XSS); alle writes via FormRequests (geen mass-assignment); invitation-tokens sterk (64 chars, single-use, 7 dagen); webhook-signatures verplicht met idempotency; geauthenticeerde tenant-isolatie hield stand (geen IDOR gevonden); `.env` en `google-services.json` correct gitignored; APP_DEBUG default false.

---

## Voortgang fixes

Zie git-historie op deze branch; commits verwijzen naar de AUDIT-ID's hierboven.
