# Aidatim — Ledensysteem

Multi-tenant ledenbeheersysteem voor verenigingen. Elke organisatie krijgt een eigen subdomein en kan leden beheren, contributie innen via SEPA-incasso (Stripe Connect) en leden uitnodigen voor een eigen portaal.

## Onderdelen

| Map | Wat | Stack | Productie |
|---|---|---|---|
| `backend/` | API | Laravel 11 · PHP 8.4 · MySQL | `https://api.aidatim.nl` |
| `frontend/` | Web-app | React · TypeScript · Vite · Tailwind | `https://app.aidatim.nl` |
| `mobile/` | Ledenapp | Kotlin Multiplatform (Android + iOS) | nog niet in de stores |

Organisatie-portalen draaien op subdomeinen: `<org>.aidatim.nl`.

## Rollen

| Rol | Toegang |
|---|---|
| `platform_admin` | Het hele platform — organisaties, plannen, instellingen |
| `org_admin` | Eén organisatie — leden, SEPA, uitnodigingen |
| `member` | Eigen portaal — contributie, profiel |

## Lokaal draaien

```bash
docker compose up -d
```

Backend op `localhost:8000`, frontend op `localhost:5173`, MySQL op `localhost:3306`.

Backend-tests draaien:

```bash
cd backend && php artisan test
```

## Deployment

Productie draait op **Coolify** (self-hosted), met Cloudflare voor DNS/SSL. De compose-bestanden:

| Bestand | Gebruik |
|---|---|
| `docker-compose.yml` | Lokale ontwikkeling |
| `docker-compose.coolify.yml` | Productie via Coolify — dit is wat er nu draait |
| `docker-compose.prod.yml` | Zelfstandige Docker-deploy |

Beide productie-bestanden draaien vier services: `backend`, `worker` (queue), `scheduler` en `frontend`. Alleen `backend` voert migraties uit (`RUN_MIGRATIONS=true`); de andere staan expliciet op `false`. `backend/docker/entrypoint.sh` bouwt de `.env` op uit omgevingsvariabelen en valideert de `APP_URL`-hostname — een mislukte migratie laat de boot bewust fataal falen.

> `DEPLOYMENT.md` beschrijft de oudere opzet met Nginx Proxy Manager en is niet meer hoe productie draait. Het staat er als naslag voor de container- en env-details; de proxy-stappen zijn achterhaald.

## Documentatie

| Bestand | Wat |
|---|---|
| [`AUDIT.md`](AUDIT.md) | Production-readiness audit — status van alle bevindingen, wat nog openstaat |
| [`CLAUDE.md`](CLAUDE.md) | Architectuuroverzicht: models, routes, SEPA-flow, omgevingsvariabelen |
| [`DEPLOYMENT.md`](DEPLOYMENT.md) | Uitgebreide deploy-naslag (deels achterhaald, zie hierboven) |
| `docs/` | Roadmap, wireframes, user stories, push-notificatie-opzet |
| `backend/README.md` · `frontend/README.md` · `mobile/README.md` | Per onderdeel |

## Belangrijkste flows

**SEPA-incasso.** Beheerder stelt IBAN + bedrag in op een lid → backend maakt Stripe customer, SEPA payment method, mandaat en subscription aan → webhook `customer.subscription.updated` zet de subscription op `active`. Stripe incasseert maandelijks; `invoice.payment_succeeded` legt een `MemberContributionRecord` plus `PaymentTransaction` vast.

**Mislukte betaling.** `invoice.payment_failed` → `past_due`. Na de maximale pogingen wordt SEPA automatisch uitgeschakeld op het lid.

**Terugboeking.** `charge.dispute.created` markeert de transactie als `disputed`; `charge.dispute.closed` herstelt bij winst.

Zie `CLAUDE.md` voor de volledige beschrijving.

## Status

Stripe draait in **test/sandbox mode**. Overstappen naar live vereist `sk_live_`-keys en een nieuw webhook-endpoint. Zie `AUDIT.md` voor wat er vóór echte betalende klanten nog moet gebeuren.
