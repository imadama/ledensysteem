# Testen op een andere pc

Alles wat je nodig hebt om deze branch elders op te zetten en het testprotocol te doorlopen.

Het protocol zelf staat in **[`testprotocol.html`](testprotocol.html)** — 830 testgevallen over 58 schermen.
Open het door erop te dubbelklikken; het is één zelfstandig bestand zonder afhankelijkheden. Je vinkjes
worden per browser lokaal bewaard, dus je voortgang reist **niet** mee naar een andere pc of browser.
Wil je vanaf twee machines bij dezelfde lijst, gebruik dan de online versie:
<https://claude.ai/code/artifact/6b82b2ed-33c7-48c0-bd35-3ca1b59d4f5d>

---

## 1. Ophalen

```bash
git clone https://github.com/imadama/ledensysteem.git
cd ledensysteem
git checkout chore/repo-cleanup-and-audit-update
```

## 2. Wat je op de machine nodig hebt

| | Versie |
|---|---|
| PHP | 8.4 (composer.json vraagt ≥ 8.2) |
| Laravel | 12.53 — *let op: `CLAUDE.md` noemt nog Laravel 11* |
| Node | 24 |
| MySQL | 8 |

Of gebruik Docker en sla de losse installaties over:

```bash
docker compose up -d
```

Dat start de database op `:3306`, de backend op `:8000` en de frontend op `:5173`.

## 3. Backend

```bash
cd backend
cp .env.example .env
composer install
php artisan key:generate
php artisan migrate
php artisan db:seed --class=RolesAndAdminSeeder
php artisan test          # 21 tests — moeten allemaal slagen
```

Zet vóór het seeden `PLATFORM_ADMIN_EMAIL` en `PLATFORM_ADMIN_PASSWORD` in je `.env`, anders krijg je
een gegenereerd wachtwoord dat maar één keer wordt getoond. Een bestaande admin wordt nooit overschreven.

Voor SEPA-tests heb je ook `STRIPE_SECRET` en `STRIPE_WEBHOOK_SECRET` nodig (testsleutels).

## 4. Frontend — lees dit voor je start

De app bepaalt zijn API-adres uit de hostnaam. Op `localhost` geeft `getCurrentSubdomain()` niets terug,
en dan rendert `App.tsx` **alleen** de homepage en het registratieformulier — geen enkele app-route.
Je hebt dus hostnamen nodig die op `.aidatim.nl` eindigen:

```bash
sudo sh -c 'echo "127.0.0.1 org1.aidatim.nl org2.aidatim.nl" >> /etc/hosts'
```

**En dan de valstrik.** Op zo'n hostname valt `getApiBaseUrl()` terug op `https://api.aidatim.nl`
wanneer `VITE_API_URL` niet gezet is — zie `frontend/src/api/config.ts:25`. Je lokale frontend maakt en
verwijdert dan **echte productiedata** terwijl je denkt lokaal te werken. Start daarom altijd zo:

```bash
cd frontend
npm install
VITE_API_URL=http://localhost:8000 npm run dev
```

Ga daarna naar `http://org1.aidatim.nl:5173`, niet naar `localhost:5173`.

> Werkt `npm run build` niet op een Mac met Apple Silicon, dan staat er waarschijnlijk een x64-rollup in
> `node_modules`. Oplossing: `rm -rf node_modules package-lock.json && npm install`.

## 5. Testen tegen productie

| Adres | Status | Bruikbaar voor |
|---|---|---|
| `app.aidatim.nl` | 503 | **Onbruikbaar.** Staat niet in de domeinenlijst van Coolify — zie AUDIT-70. |
| `aidatim.nl` | 200 | Alleen `/` en `/register-organisation`. |
| `ama-stichting.aidatim.nl` | 200 | Volledige app — je hoofdomgeving. |
| `isn-gorinchem-suleyman-celebi.aidatim.nl` | 200 | Je tweede organisatie voor multi-tenancy. |
| een nieuw subdomein | 503 | Werkt pas nadat je het handmatig in Coolify toevoegt. |

Nagemeten op 17 augustus 2026. Controleer het opnieuw voor je begint.

## 6. Wat op deze branch is veranderd

Deze fixes zitten er wél in maar zijn **nog niet gedeployd** naar productie. Test ze dus lokaal, niet
op `*.aidatim.nl`:

| | |
|---|---|
| `AUDIT-73` | Wachtwoord-reset stuurde je naar `/login` voor je iets kon invullen |
| `AUDIT-71` / `AUDIT-72` | Terugboekingen, refunds en de eigen SaaS-omzet werden niet vastgelegd |
| `AUDIT-60` / `AUDIT-61` | IBAN's versleuteld opgeslagen, uitnodigingstokens gehasht |
| — | `ValidIban` toegevoegd aan het beheerderspad voor leden |

**Draai de migratie niet op een SQLite-database die je wilt houden.** `2026_08_17_000000` wijzigt een
kolomtype, en SQLite herbouwt daarvoor de hele `members`-tabel. De migratie vangt dat op, maar maak
sowieso eerst een kopie.

Zie `AUDIT.md` voor de volledige stand.
