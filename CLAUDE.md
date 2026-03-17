# Aidatim — Ledensysteem

Multi-tenant ledenbeheersysteem voor verenigingen. Organisaties krijgen elk een eigen subdomein en kunnen leden beheren, contributie innen via SEPA incasso (Stripe Connect) en leden uitnodigen voor een eigen portaal.

---

## Architectuur

### Twee aparte applicaties

| Service | URL | Tech |
|---|---|---|
| **Backend** | `https://api.aidatim.nl` | Laravel 11 / PHP 8.4 |
| **Frontend** | `https://app.aidatim.nl` | React + TypeScript + Vite + Tailwind |

Organisatie-portalen draaien op subdomains: `*.aidatim.nl` (bijv. `ama-stichting.aidatim.nl`)

### Hosting
- **Platform:** Coolify (self-hosted)
- **Database:** MySQL
- **Mail:** Gmail SMTP (`info@aidatim.nl`)
- **Betalingen:** Stripe Connect (Express accounts, sandbox/test mode)
- **DNS/SSL:** Cloudflare

---

## Rollen

| Rol | Toegang |
|---|---|
| `platform_admin` | Beheert het hele platform (organisaties, plannen, instellingen) |
| `org_admin` | Beheert één organisatie (leden, SEPA, uitnodigingen) |
| `member` | Lid — ziet eigen portaal, contributie, profiel |

---

## Backend (Laravel)

### Structuur
- `app/Models/` — Eloquent models
- `app/Services/` — Business logic
- `app/Http/Controllers/Api/` — API controllers
- `app/Http/Requests/` — Form requests met validatie
- `app/Mail/` — Mailables
- `app/Console/Commands/` — Artisan commands
- `routes/api.php` — Alle API routes
- `routes/console.php` — Scheduled commands

### Belangrijke models

| Model | Beschrijving |
|---|---|
| `Organisation` | Een vereniging/organisatie |
| `Member` | Lid van een organisatie |
| `User` | Inlogaccount (gekoppeld aan Member of Org) |
| `MemberSubscription` | Stripe SEPA subscription van een lid |
| `MemberContributionRecord` | Individuele maandelijkse betaalrecord |
| `PaymentTransaction` | Stripe betaaltransactie |
| `MemberContributionHistory` | Audit trail van contributiewijzigingen |
| `OrganisationStripeConnection` | Stripe Connect account per organisatie |
| `MemberInvitation` | Uitnodigingstoken voor ledenportaal |

### Route prefixes
- `/api/public/` — Publieke routes (aanmelding, org info)
- `/api/auth/` — Authenticatie
- `/api/organisation/` — Org admin routes (role: org_admin)
- `/api/member/` — Lid routes (role: member)
- `/api/platform/` — Platform admin routes (role: platform_admin)
- `/api/stripe/webhook` — Stripe webhooks (geen auth)

### Scheduled commands
- `subscriptions:check-incomplete --hours=1` — draait elk uur, synct incomplete SEPA subscriptions

### Authenticatie
Sanctum cookie-based auth. CSRF flow via `/sanctum/csrf-cookie`.
Stateful domains: `*.aidatim.nl` (hardcoded in `config/sanctum.php`)

---

## Frontend (React)

### Pagina-structuur

**Platform admin** (`/platform/...`)
- `/platform/organisations` — Organisaties beheren
- `/platform/plans` — Abonnementsplannen
- `/platform/settings` — Platform instellingen
- `/platform/architecture` — Systeem architectuur + contributie flow diagram

**Org admin** (`/organisation/...`)
- `/organisation/members` — Ledenlijst
- `/organisation/members/create` — Lid toevoegen
- `/organisation/members/:id` — Lid detail + SEPA beheer
- `/organisation/contributions` — Contributie overzicht
- `/organisation/contributions/matrix` — Betaalmatrix per lid per maand
- `/organisation/settings/payments` — Stripe Connect koppelen
- `/organisation/subscription` — Platform abonnement

**Lid portaal** (`/portal/...` of org-subdomein)
- `/portal/activate` — Account activeren via uitnodigingstoken
- `/member/dashboard` — Dashboard
- `/member/contribution` — Contributie betalen
- `/member/profile` — Profiel

**Publiek**
- `/register` — Organisatie aanmelden
- `/aanmelden` — Lid aanmelden (publieke pagina per organisatie)

### API client
`frontend/src/api/axios.ts` — axios instance met Sanctum CSRF, subdomein header (`X-Organisation-Subdomain`), en error interceptors.

---

## SEPA / Contributie flow

### Setup (door admin)
1. Admin stelt IBAN + bedrag in op lid
2. `POST /api/organisation/members/{id}/sepa-subscription/setup`
3. Backend: Stripe customer → SEPA payment method → mandate → subscription
4. `MemberSubscription` aangemaakt met `status=incomplete`
5. Webhook `customer.subscription.updated` → `status=active`

### Maandelijkse incasso
Stripe debiteert automatisch → webhook `invoice.payment_succeeded` → `MemberContributionRecord` + `PaymentTransaction` aangemaakt

### Mislukte betaling
`invoice.payment_failed` → `status=past_due`. Na max pogingen: `incomplete_expired`/`unpaid` → SEPA automatisch uitgeschakeld op lid.

### Terugboeking
`charge.dispute.created` → `PaymentTransaction.status=disputed`, `MemberContributionRecord.status=failed`
`charge.dispute.closed` → hersteld (gewonnen) of blijft disputed (verloren)

---

## Omgevingsvariabelen (Coolify — backend)

| Variable | Waarde | Opmerking |
|---|---|---|
| `APP_URL` | `https://api.aidatim.nl` | Alleen de backend URL |
| `FRONTEND_URL` | `https://app.aidatim.nl` | Gebruikt voor uitnodigingslinks |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Vereist voor webhook verificatie |
| `STRIPE_SECRET` | `sk_test_...` of `sk_live_...` | Nu in test/sandbox mode |
| `SESSION_DOMAIN` | `.aidatim.nl` | Met punt ervoor |
| `SANCTUM_STATEFUL_DOMAINS` | `aidatim.nl,api.aidatim.nl,...` | Losse domeinen |
| `CORS_ALLOWED_ORIGINS` | `https://aidatim.nl,https://*.aidatim.nl` | Wildcard voor subdomains |

> ⚠️ `APP_URL` mag maar **één URL** bevatten — geen komma-separated lijst.

---

## Docker (productie)

- `backend/Dockerfile.prod` — PHP 8.4 CLI, geen dev dependencies, geen scripts
- `backend/docker/entrypoint.sh` — Schrijft `.env` vanuit omgevingsvariabelen, valideert `APP_URL` hostname
- Entrypoint valideert `APP_URL`: als hostname ongeldige tekens heeft (bv. underscores van Coolify service names) → fallback naar `http://localhost`

---

## Bekende aandachtspunten

- Stripe draait in **test/sandbox mode** — overstappen op live vereist `sk_live_` keys + nieuw webhook endpoint
- `STRIPE_WEBHOOK_SECRET` moet ingesteld zijn, anders werken automatische incasso-events niet
- Lidnummers worden automatisch gegenereerd als `YYYY-###` (bv. `2026-001`) — veld is optioneel bij aanmaken
- IBAN validatie: mod-97 checksum in `SetupSepaSubscriptionRequest`
- Proration bij bedragwijziging: `none` — nieuwe bedrag gaat in bij volgende factuurperiode
