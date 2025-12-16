# Deployment Guide - Ledenportaal

Deze guide helpt je bij het deployen van het Ledenportaal op je server met Docker en Nginx Proxy Manager.

## Vereisten

- Server met Docker en Docker Compose geïnstalleerd
- Nginx Proxy Manager geïnstalleerd en draaiend
- Domeinnaam geconfigureerd (bijv. ledenportaal.jouw-domein.nl)
- Toegang tot je server via SSH

## Quick Start (Samenvatting)

Als je al bekend bent met Docker deployment, hier is de korte versie:

1. Clone repository: `git clone <repo> && cd ledensysteem`
2. Maak `.env.production` aan met alle benodigde variabelen (zie stap 1.2 voor aidatim.nl configuratie)
3. Start containers: `docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build`
4. Genereer APP_KEY: `docker compose -f docker-compose.prod.yml exec backend php artisan key:generate`
5. Run migraties: `docker compose -f docker-compose.prod.yml exec backend php artisan migrate --force`
6. Seed database: `docker compose -f docker-compose.prod.yml exec backend php artisan db:seed --class=RolesAndAdminSeeder --force`
7. Genereer subdomeinen voor bestaande organisaties: `docker compose -f docker-compose.prod.yml exec backend php artisan organisations:generate-subdomains`
8. Configureer Nginx Proxy Manager:
   - Frontend Proxy Host: `aidatim.nl` → `localhost:3000` (voor statische website)
   - Frontend Proxy Host: `portal.aidatim.nl` → `localhost:3000` (voor platform admin)
   - Frontend Proxy Host: `*.aidatim.nl` → `localhost:3000` (wildcard voor organisatie subdomeinen)
   - Backend Proxy Host: `app.aidatim.nl` → `localhost:6969` (API server)
9. Request SSL certificaten in NPM voor alle domeinen
10. Configureer DNS:
    - A Record: `@` → server IP
    - A Record: `app` → server IP
    - A Record: `portal` → server IP
    - Wildcard A Record: `*` → server IP (voor organisatie subdomeinen)

Voor gedetailleerde instructies, lees verder.

## Stap 1: Project voorbereiden op de server

### 1.1 Clone het project

```bash
cd /opt  # of een andere gewenste locatie
git clone <jouw-repository-url> ledensysteem
cd ledensysteem
```

### 1.2 Maak environment bestand aan

**Belangrijk:** Maak het `.env.production` bestand aan in de **root** van het project (dezelfde map waar `docker compose.prod.yml` staat), dus:

```
ledensysteem/
├── docker compose.prod.yml
├── .env.production          ← Hier!
├── backend/
└── frontend/
```

Maak het bestand aan met:

```bash
# Zorg dat je in de root van het project bent (waar docker compose.prod.yml staat)
cd /opt/ledensysteem  # of waar je het project hebt gecloned
nano .env.production  # of gebruik je favoriete editor
```

Maak een nieuw `.env.production` bestand aan met de volgende inhoud:

```bash
nano .env.production  # of gebruik je favoriete editor
```

**Vul het volgende in (pas aan waar nodig):**

# Application
APP_NAME=Ledenportaal
APP_ENV=production
APP_DEBUG=false
APP_KEY=
# BELANGRIJK: Laat APP_KEY leeg en genereer deze met: php artisan key:generate
# De key moet beginnen met "base64:" en 32 bytes zijn (256 bits) voor AES-256-CBC
APP_URL=https://app.aidatim.nl

# Database (MariaDB container)
DB_CONNECTION=mysql
DB_HOST=192.168.68.86  # IP adres van je MariaDB server, of host.docker.internal als opzelfde host
DB_PORT=3306
DB_DATABASE=ledenportaal
DB_USERNAME=ama
DB_PASSWORD=ama123
# DB_ROOT_PASSWORD is niet nodig (root password: amaroot)

# Session & CORS
SESSION_DOMAIN=aidatim.nl
SESSION_SECURE_COOKIE=true
SESSION_SAME_SITE=lax
# SANCTUM_STATEFUL_DOMAINS: Alle subdomeinen die stateful authentication moeten ondersteunen
# Format: comma-separated list (zonder spaties)
SANCTUM_STATEFUL_DOMAINS=app.aidatim.nl,portal.aidatim.nl,*.aidatim.nl
# CORS_ALLOWED_ORIGINS: Alle frontend domeinen die API calls mogen maken
# Format: comma-separated list met https:// prefix
CORS_ALLOWED_ORIGINS=https://aidatim.nl,https://portal.aidatim.nl,https://*.aidatim.nl

# Mail Configuration
MAIL_MAILER=smtp
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=587
MAIL_USERNAME=info@aidatim.nl
MAIL_PASSWORD=Imad2003!
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@aidatim.nl
MAIL_FROM_NAME="${APP_NAME}"

# Stripe Configuration
STRIPE_SECRET=sk_test_51SS1PAA46Wivqv54uKmI8oL0q8Jwl1kOH1rLrzE0jVRYh612INjMGRbdeWL50UGLxPNm3cpdoXLcsDMm65B0tBI900P7rlJtW5
STRIPE_PUBLIC_KEY=pk_test_51SS1PAA46Wivqv54IlxS2UYHIsW57tFF8pwua21tNvHtuZSKXk1xiAtvB9T1i1fTENeOvwVhztnM5CXgnjk4t2Cz00HoIGr7Zu
STRIPE_WEBHOOK_SECRET=whsec_dab7edac21edcfd0145bfd0e82a8b8e49081e21a7f4c88b709c5b149493f282e
STRIPE_CONNECT_CLIENT_ID=ca_your_connect_client_id
STRIPE_CONNECT_ACCOUNT_TYPE=express
STRIPE_DEFAULT_CURRENCY=eur
STRIPE_PRICE_BASIC=price_your_basic_price_id
STRIPE_PRICE_PLUS=price_your_plus_price_id

# Frontend
VITE_API_URL=https://app.aidatim.nl


**Belangrijke variabelen om aan te passen:**

- `APP_KEY`: Laat dit leeg, wordt automatisch gegenereerd in stap 3
- `APP_URL`: `https://app.aidatim.nl` (backend API URL)
- `DB_HOST`: IP adres van je externe MySQL server (bijv. `192.168.68.86` of `host.docker.internal` als MySQL op dezelfde host draait)
- `DB_PORT`: Poort van je MySQL server (standaard `3306`)
- `DB_DATABASE`: Naam van je database
- `DB_USERNAME`: MySQL gebruikersnaam
- `DB_PASSWORD`: MySQL wachtwoord
- `SESSION_DOMAIN`: `aidatim.nl` (hoofddomein voor cookies)
- `SESSION_SECURE_COOKIE`: `true` (vereist voor HTTPS - cookies alleen via HTTPS)
- `SESSION_SAME_SITE`: `lax` (cookie SameSite attribuut voor cross-site requests)
- `SANCTUM_STATEFUL_DOMAINS`: `app.aidatim.nl,portal.aidatim.nl,*.aidatim.nl` (alle subdomeinen voor stateful auth)
- `CORS_ALLOWED_ORIGINS`: `https://aidatim.nl,https://portal.aidatim.nl,https://*.aidatim.nl` (alle frontend domeinen)
- `VITE_API_URL`: `https://app.aidatim.nl` (backend API URL voor frontend, ZONDER /api omdat alle API calls al /api/ prefix gebruiken)
- Stripe variabelen: Vul je Stripe productie keys in
- Mail variabelen: Vul je SMTP instellingen in

**Belangrijk voor externe MariaDB:**
- Als MariaDB op dezelfde server draait als Docker, gebruik dan `host.docker.internal` (macOS/Windows) of `172.17.0.1` (Linux Docker bridge gateway) als `DB_HOST`
- Als MariaDB in een andere Docker container draait, gebruik de container naam (bijv. als containers in hetzelfde network zitten) of het IP adres
- Als MariaDB op een andere server draait, gebruik het IP adres van die server
- Zorg dat MariaDB remote connections toestaat (bind-address configuratie)
- Zorg dat de firewall poort 3306 open staat

## Stap 2: Docker containers bouwen en starten

### 2.1 Build en start de containers

**Let op:** Deze guide gebruikt `docker compose` (met spatie) voor Docker Compose v2. Als je nog v1 gebruikt, vervang dan `docker compose` door `docker-compose` (met streepje).

```bash
# Gebruik de productie docker compose file
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Dit zal:
- De backend container bouwen en starten
- De frontend container bouwen (met productie build) en starten

**Let op:** Deze setup gebruikt een externe MariaDB/MySQL database. Zorg dat je database server draait en toegankelijk is vanaf de Docker host.

### 2.2 Controleer of alles draait

```bash
docker compose -f docker-compose.prod.yml ps
```

**Let op:** Je kunt warnings zien over ontbrekende environment variabelen bij `docker compose ps`. Dit is normaal - de `ps` command gebruikt de env file niet, maar de containers hebben de variabelen wel gekregen bij het starten. Je kunt deze warnings negeren.

Je zou 2 containers moeten zien draaien:
- `leden_backend`
- `leden_frontend`

### 2.3 Check de logs

```bash
# Alle logs
docker compose -f docker-compose.prod.yml logs -f

# Specifieke service
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
```

## Stap 3: Application key genereren en database setup

### 3.1 Genereer APP_KEY

**BELANGRIJK:** De APP_KEY is verplicht voor Laravel en moet de juiste lengte hebben (32 bytes voor AES-256-CBC).

**Als je een "Unsupported cipher or incorrect key length" error krijgt:**

Dit betekent dat je APP_KEY ongeldig is. Volg deze stappen:

**Stap 1:** Genereer een nieuwe APP_KEY:

```bash
# Genereer key en toon de output
docker compose -f docker-compose.prod.yml --env-file .env.production exec backend php artisan key:generate --show
```

**Stap 2:** Kopieer de gegenereerde key (bijv. `base64:xxxxx...`) en voeg deze toe aan je `.env.production` bestand:

```bash
# Open .env.production
nano .env.production

# Vervang de APP_KEY regel met de nieuwe key:
APP_KEY=base64:xxxxx...  # (de volledige key die je hebt gekopieerd)
```

**Stap 3:** Herstart de backend container:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production restart backend
```

**Alternatief (automatisch):**
```bash
# Dit genereert en slaat de key automatisch op in de container .env
docker compose -f docker-compose.prod.yml --env-file .env.production exec backend php artisan key:generate

# Maar je moet de key nog steeds handmatig toevoegen aan .env.production
# Check de key:
docker compose -f docker-compose.prod.yml exec backend php artisan key:generate --show
# Kopieer en voeg toe aan .env.production
```

### 3.2 Voer migraties uit

```bash
docker compose -f docker-compose.prod.yml exec backend php artisan migrate --force
```

### 3.3 Seed de database (rollen en admin)

```bash
docker compose -f docker-compose.prod.yml exec backend php artisan db:seed --class=RolesAndAdminSeeder --force
```

**Let op:** De seeder maakt een admin account aan. Check de seeder code voor de standaard credentials of pas deze aan.

### 3.4 Genereer subdomeinen voor bestaande organisaties

Als je bestaande organisaties in de database hebt, moet je subdomeinen genereren:

```bash
# Dry run: zie wat er zou gebeuren zonder wijzigingen
docker compose -f docker-compose.prod.yml exec backend php artisan organisations:generate-subdomains --dry-run

# Werkelijk uitvoeren: genereer subdomeinen voor alle organisaties
docker compose -f docker-compose.prod.yml exec backend php artisan organisations:generate-subdomains
```

**Let op:** 
- Nieuwe organisaties krijgen automatisch een subdomein bij registratie
- Bestaande organisaties moeten handmatig een subdomein krijgen via dit command
- Subdomeinen worden gegenereerd op basis van de organisatienaam (slug-formaat)

### 3.4 Cache optimaliseren (optioneel maar aanbevolen)

```bash
docker compose -f docker-compose.prod.yml exec backend php artisan config:cache
docker compose -f docker-compose.prod.yml exec backend php artisan route:cache
docker compose -f docker-compose.prod.yml exec backend php artisan view:cache
```

## Stap 4: Nginx Proxy Manager configureren

Omdat je al Nginx Proxy Manager hebt, maken we meerdere Proxy Hosts aan voor subdomein multi-tenancy:
- **Frontend** op `aidatim.nl` → forward naar `localhost:3000` (statische website)
- **Frontend** op `portal.aidatim.nl` → forward naar `localhost:3000` (platform admin)
- **Frontend** op `*.aidatim.nl` → forward naar `localhost:3000` (wildcard voor organisatie subdomeinen)
- **Backend API** op `app.aidatim.nl` → forward naar `localhost:6969` (API server)

### 4.1 Frontend Proxy Host (aidatim.nl - Statische Website)

1. Log in op je Nginx Proxy Manager interface (meestal `http://jouw-server-ip:81`)
2. Ga naar **Hosts** > **Proxy Hosts**
3. Klik op **Add Proxy Host**

**Details tab:**
- **Domain Names:** `aidatim.nl`
- **Scheme:** `http`
- **Forward Hostname / IP:** 
  - Als Nginx Proxy Manager op de host draait: `localhost` of `127.0.0.1`
  - Als Nginx Proxy Manager in een Docker network draait: `leden_frontend` (container naam) of `172.17.0.1` (Docker bridge gateway)
- **Forward Port:** `3000` (de poort van de frontend container)
- **Cache Assets:** Aan (optioneel)
- **Block Common Exploits:** Aan
- **Websockets Support:** Uit

**SSL tab:**
- **SSL Certificate:** Kies "Request a new SSL Certificate"
- **Force SSL:** Aan
- **HTTP/2 Support:** Aan
- **HSTS Enabled:** Aan (aanbevolen)
- **HSTS Subdomains:** Aan

Klik op **Save** en wacht tot het SSL certificaat is gegenereerd.

### 4.1.1 Frontend Proxy Host (portal.aidatim.nl - Platform Admin)

1. Ga naar **Hosts** > **Proxy Hosts**
2. Klik op **Add Proxy Host**

**Details tab:**
- **Domain Names:** `portal.aidatim.nl`
- **Scheme:** `http`
- **Forward Hostname / IP:** `localhost` of `127.0.0.1` (zelfde als aidatim.nl)
- **Forward Port:** `3000`
- **Cache Assets:** Aan (optioneel)
- **Block Common Exploits:** Aan
- **Websockets Support:** Uit

**SSL tab:**
- **SSL Certificate:** Kies "Request a new SSL Certificate" (of gebruik wildcard certificaat)
- **Force SSL:** Aan
- **HTTP/2 Support:** Aan
- **HSTS Enabled:** Aan
- **HSTS Subdomains:** Aan

Klik op **Save**.

### 4.1.2 Frontend Proxy Host (*.aidatim.nl - Wildcard voor Organisaties)

**BELANGRIJK:** Nginx Proxy Manager ondersteunt wildcard subdomeinen. Maak een wildcard Proxy Host aan:

1. Ga naar **Hosts** > **Proxy Hosts**
2. Klik op **Add Proxy Host**

**Details tab:**
- **Domain Names:** `*.aidatim.nl` (wildcard voor alle subdomeinen)
- **Scheme:** `http`
- **Forward Hostname / IP:** `localhost` of `127.0.0.1`
- **Forward Port:** `3000`
- **Cache Assets:** Aan (optioneel)
- **Block Common Exploits:** Aan
- **Websockets Support:** Uit

**SSL tab:**
- **SSL Certificate:** Kies "Request a new SSL Certificate" met wildcard (`*.aidatim.nl`)
- **Force SSL:** Aan
- **HTTP/2 Support:** Aan
- **HSTS Enabled:** Aan
- **HSTS Subdomains:** Aan

**Let op:** 
- Wildcard SSL certificaten kunnen alleen via DNS validation worden aangevraagd
- Zorg dat je DNS wildcard record (`*.aidatim.nl`) correct is geconfigureerd voordat je het certificaat aanvraagt
- Het wildcard certificaat dekt alle subdomeinen (bijv. `vereniging-abc.aidatim.nl`, `portal.aidatim.nl`, etc.)

Klik op **Save**.

### 4.2 Backend API Proxy Host (app.aidatim.nl)

1. Ga naar **Hosts** > **Proxy Hosts**
2. Klik op **Add Proxy Host**

**Details tab:**
- **Domain Names:** `app.aidatim.nl`
- **Scheme:** `http`
- **Forward Hostname / IP:** 
  - **BELANGRIJK:** Vul hier ALLEEN het IP adres of hostname in, ZONDER poort!
  - **Test eerst wat werkt:**
    ```bash
    # Test vanaf de server welke optie werkt:
    curl http://127.0.0.1:6969/api/plans
    curl http://172.17.0.1:6969/api/plans
    curl http://localhost:6969/api/plans
    ```
  - Als Nginx Proxy Manager op de host draait: `127.0.0.1` (meest betrouwbaar)
  - Als Nginx Proxy Manager in een Docker network draait: `172.17.0.1` (Docker bridge gateway) of `host.docker.internal`
  - **NIET gebruiken:** `localhost` (kan problemen geven in Docker)
- **Forward Port:** `6969` (de poort van de backend container - dit is een APART veld!)
  
**Let op:** In Nginx Proxy Manager zijn er TWEE aparte velden:
- **Forward Hostname / IP:** alleen het IP of hostname (bijv. `localhost` of `127.0.0.1`)
- **Forward Port:** alleen het poortnummer (bijv. `6969`)
  
Vul NOOIT `192.168.68.86:6969` in één veld in - dat werkt niet!
- **Cache Assets:** Uit (voor API's niet nodig)
- **Block Common Exploits:** Aan
- **Websockets Support:** Uit

**Advanced tab (BELANGRIJK voor sanctum):**
Voeg deze custom nginx configuratie toe om `/sanctum` routes door te sturen:

```nginx
# Forward /sanctum routes naar backend
# BELANGRIJK: Gebruik hetzelfde IP als Forward Hostname/IP hierboven
location /sanctum {
    proxy_pass http://127.0.0.1:6969;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Port $server_port;
}
```

**Let op:** Als NPM in Docker draait en `127.0.0.1` niet werkt, probeer dan:
- `host.docker.internal:6969` (werkt op macOS/Windows Docker)
- Of voeg NPM toe aan het `leden_network` en gebruik `leden_backend:8000`
```

**BELANGRIJK:** 
- Als Forward Hostname/IP `172.17.0.1` is, gebruik dan `172.17.0.1:6969` in de proxy_pass
- Als Forward Hostname/IP `127.0.0.1` is, gebruik dan `127.0.0.1:6969` in de proxy_pass
- Zorg dat het IP overeenkomt met wat je in Forward Hostname/IP hebt ingesteld

# Bestaande proxy headers (als je die al hebt)
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

**BELANGRIJK:** 
- Vervang `localhost:6969` met het juiste hostname/IP als NPM in Docker draait
- Als NPM in Docker draait, gebruik dan `172.17.0.1:6969` of het IP van je host
- Zorg dat de `/sanctum` location block VOOR de algemene proxy configuratie staat

**SSL tab:**
- **SSL Certificate:** Kies "Request a new SSL Certificate" (of gebruik hetzelfde wildcard certificaat als `aidatim.nl`)
- **Force SSL:** Aan
- **HTTP/2 Support:** Aan
- **HSTS Enabled:** Aan (aanbevolen)
- **HSTS Subdomains:** Aan

Klik op **Save** en wacht tot het SSL certificaat is gegenereerd.

**Let op:** Als Nginx Proxy Manager in een apart Docker network draait, moet je mogelijk de containers in hetzelfde network plaatsen. Je kunt dit doen door:

1. **Optie A:** Het network van NPM gebruiken in docker compose.prod.yml:
   ```yaml
   networks:
     leden_network:
       external: true
       name: npm_default  # of de naam van je NPM network
   ```
   Dan gebruik je in de Forward Hostname `leden_backend` en `leden_frontend` in plaats van `localhost`.

2. **Optie B:** De containers toevoegen aan het NPM network:
   ```bash
   docker network connect npm_default leden_backend
   docker network connect npm_default leden_frontend
   ```

### 4.3 DNS Records configureren

Je moet meerdere DNS records aanmaken in je DNS provider (bijv. Cloudflare, Namecheap, TransIP, etc.) voor subdomein multi-tenancy:

#### A Records (aanbevolen)

Maak de volgende **A records** aan:

1. **A Record voor hoofddomein:**
   - **Name/Host:** `@` of `aidatim.nl` (afhankelijk van je DNS provider)
   - **Type:** A
   - **Value/Points to:** `JOUW_SERVER_IP` (bijv. `123.45.67.89`)
   - **TTL:** 3600 (of Auto)

2. **A Record voor backend API:**
   - **Name/Host:** `app`
   - **Type:** A
   - **Value/Points to:** `JOUW_SERVER_IP` (zelfde IP als hierboven)
   - **TTL:** 3600 (of Auto)

3. **A Record voor platform admin:**
   - **Name/Host:** `portal`
   - **Type:** A
   - **Value/Points to:** `JOUW_SERVER_IP` (zelfde IP)
   - **TTL:** 3600 (of Auto)

4. **Wildcard A Record voor organisatie subdomeinen:**
   - **Name/Host:** `*` (wildcard)
   - **Type:** A
   - **Value/Points to:** `JOUW_SERVER_IP` (zelfde IP)
   - **TTL:** 3600 (of Auto)

**Voorbeeld bij verschillende providers:**

**TransIP/Namecheap:**
- Host: `@`, Type: A, Value: `123.45.67.89`
- Host: `app`, Type: A, Value: `123.45.67.89`
- Host: `portal`, Type: A, Value: `123.45.67.89`
- Host: `*`, Type: A, Value: `123.45.67.89`

**Cloudflare:**
- Type: A, Name: `@`, Content: `123.45.67.89`, Proxy: Off (of On voor DDoS protection)
- Type: A, Name: `app`, Content: `123.45.67.89`, Proxy: Off
- Type: A, Name: `portal`, Content: `123.45.67.89`, Proxy: Off
- Type: A, Name: `*`, Content: `123.45.67.89`, Proxy: Off

**Let op:** 
- Vervang `JOUW_SERVER_IP` met het daadwerkelijke IP-adres van je server
- Het kan 5 minuten tot 48 uur duren voordat DNS records zijn doorgevoerd (meestal binnen 1-2 uur)
- Wildcard records (`*`) zorgen ervoor dat alle subdomeinen automatisch naar je server wijzen
- Je kunt dit testen met:
  ```bash
  # Test of DNS records correct zijn
  dig aidatim.nl +short
  dig app.aidatim.nl +short
  dig portal.aidatim.nl +short
  dig vereniging-abc.aidatim.nl +short  # Test wildcard
  
  # Of met nslookup
  nslookup aidatim.nl
  nslookup app.aidatim.nl
  nslookup portal.aidatim.nl
  nslookup vereniging-abc.aidatim.nl
  ```

**Belangrijk:** 
- Zorg dat alle domeinen naar hetzelfde IP-adres wijzen voordat je SSL certificaten aanvraagt
- Voor wildcard SSL certificaten moet je DNS validation gebruiken (niet HTTP validation)
- Test eerst of wildcard DNS werkt voordat je het wildcard SSL certificaat aanvraagt

## Stap 5: Permissies controleren

### 5.1 Storage permissies

Zorg dat de storage directory de juiste permissies heeft:

```bash
docker compose -f docker-compose.prod.yml exec backend chown -R www-data:www-data /var/www/html/storage
docker compose -f docker-compose.prod.yml exec backend chmod -R 755 /var/www/html/storage
```

### 5.2 Bootstrap cache permissies

```bash
docker compose -f docker-compose.prod.yml exec backend chown -R www-data:www-data /var/www/html/bootstrap/cache
docker compose -f docker-compose.prod.yml exec backend chmod -R 755 /var/www/html/bootstrap/cache
```

## Stap 6: Test de applicatie

### 6.1 Test containers lokaal

Voordat je het domein test, controleer eerst of de containers lokaal werken:

```bash
# Test backend lokaal
curl http://localhost:6969
# Of
curl http://localhost:6969/api

# Test frontend lokaal
curl http://localhost:3000
```

Als deze werken, dan draaien de containers correct.

### 6.2 Test via domein

1. Open je browser en ga naar `https://aidatim.nl` (frontend)
2. Test of de frontend laadt
3. Test of API calls werken (bijv. inloggen) - deze gaan naar `https://app.aidatim.nl/api`
4. Check de browser console voor errors (F12 → Console tab)
5. Test ook direct de backend API met een specifiek endpoint:
   ```bash
   # Test publieke API route (geen auth nodig)
   curl https://app.aidatim.nl/api/plans
   
   # Test auth endpoint
   curl -X POST https://app.aidatim.nl/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"test"}'
   ```

**Let op:** `/api/` (zonder specifieke route) geeft altijd 404 - dat is normaal. Test altijd specifieke endpoints zoals `/api/plans` of `/api/auth/login`.

### 6.3 Troubleshooting checklist

**BELANGRIJK:** Als je `ERR_ADDRESS_UNREACHABLE` krijgt, betekent dit meestal dat:
1. DNS wijst naar een IP dat niet publiek bereikbaar is (192.168.68.86 is een privé IP!)
2. Je server heeft geen publiek IP adres
3. Je moet port forwarding configureren of een publiek IP gebruiken

Als het domein niet werkt, check het volgende:

**1. Containers draaien?**
```bash
docker compose -f docker-compose.prod.yml ps
# Beide containers moeten "Up" status hebben
```

**2. Poorten lokaal bereikbaar?**
```bash
# Test backend
curl -I http://localhost:6969
# Moet HTTP 200 of 404 teruggeven (niet connection refused)

# Test frontend
curl -I http://localhost:3000
# Moet HTTP 200 teruggeven

# Als connection refused, check of containers draaien:
docker compose -f docker-compose.prod.yml ps

# Check of poorten correct zijn gemapped:
docker compose -f docker-compose.prod.yml ps | grep -E '3000|6969'
# Je zou moeten zien: 0.0.0.0:3000->80/tcp en 0.0.0.0:6969->8000/tcp
```

**3. Nginx Proxy Manager configuratie?**
- Log in op Nginx Proxy Manager (meestal `http://jouw-server-ip:81`)
- Check of beide Proxy Hosts bestaan:
  - `aidatim.nl` → `localhost:3000`
  - `app.aidatim.nl` → `localhost:6969`
- Check of SSL certificaten zijn aangevraagd en actief zijn
- Check de logs in NPM voor errors

**4. DNS correct?**
```bash
# Test DNS vanaf je server
nslookup aidatim.nl
nslookup app.aidatim.nl
# Beide moeten naar je server IP wijzen
```

**5. Firewall?**
```bash
# Check of poorten open zijn
sudo ufw status
# Of
sudo iptables -L -n | grep -E '3000|6969|80|443'
```

**6. Nginx Proxy Manager logs?**
- Ga naar NPM → Logs
- Check voor errors bij het forwarden
- Kijk naar "502 Bad Gateway" of "Connection refused" errors

**6.1 Nginx Proxy Manager configuratie check:**
- Log in op NPM (meestal `http://jouw-server-ip:81`)
- Ga naar Hosts → Proxy Hosts
- Check of beide Proxy Hosts bestaan en actief zijn:
  - `aidatim.nl` → Forward Hostname: `localhost` of `127.0.0.1`, Forward Port: `3000`
  - `app.aidatim.nl` → Forward Hostname: `localhost` of `127.0.0.1`, Forward Port: `6969`
- Check of SSL certificaten zijn aangevraagd en actief zijn
- Als NPM in Docker draait, gebruik dan mogelijk `host.docker.internal` of `172.17.0.1` in plaats van `localhost`

**6.2 Test NPM forward direct:**
```bash
# Test of NPM de containers kan bereiken
# Als NPM op de host draait:
curl -H "Host: aidatim.nl" http://localhost:3000
curl -H "Host: app.aidatim.nl" http://localhost:6969

# Als NPM in Docker draait, test vanaf de NPM container:
docker exec -it <npm_container_name> curl http://172.17.0.1:3000
docker exec -it <npm_container_name> curl http://172.17.0.1:6969
```

**7. Container logs?**
```bash
# Backend logs (laatste 100 regels)
docker compose -f docker-compose.prod.yml logs backend --tail 100

# Frontend logs
docker compose -f docker-compose.prod.yml logs frontend --tail 50
```

**8. Laravel specifieke errors?**
```bash
# Check Laravel logs in de container
docker compose -f docker-compose.prod.yml exec backend tail -f /var/www/html/storage/logs/laravel.log

# Of bekijk de laatste errors
docker compose -f docker-compose.prod.yml exec backend tail -50 /var/www/html/storage/logs/laravel.log
```

**9. Test database connectie?**
```bash
# Test of de database connectie werkt
docker compose -f docker-compose.prod.yml exec backend php artisan tinker
# In tinker, probeer:
# DB::connection()->getPdo();
# Exit met: exit
```

**10. Check of APP_KEY is ingesteld?**
```bash
# Check of APP_KEY bestaat
docker compose -f docker-compose.prod.yml exec backend php artisan key:generate --show
# Als dit een key toont, is het goed. Als niet, genereer dan:
docker compose -f docker-compose.prod.yml --env-file .env.production exec backend php artisan key:generate
```

## Stap 7: Monitoring en onderhoud

### 7.1 Logs bekijken

```bash
# Alle logs
docker compose -f docker-compose.prod.yml logs -f

# Specifieke service
docker compose -f docker-compose.prod.yml logs -f backend
```

### 7.2 Containers herstarten

```bash
# Alle containers
docker compose -f docker-compose.prod.yml restart

# Specifieke container
docker compose -f docker-compose.prod.yml restart backend
```

### 7.3 Updates uitvoeren

**Stap-voor-stap na een git pull:**

```bash
# 1. Pull laatste code
git pull origin main  # of je branch naam (bijv. dev)

# 2. Controleer of .env.production de juiste instellingen heeft:
#    - SESSION_SECURE_COOKIE=true
#    - SESSION_SAME_SITE=lax
#    - VITE_API_URL=https://app.aidatim.nl (ZONDER /api!)

# 3. Rebuild en restart containers
#    Frontend MOET gerebuild worden omdat VITE_API_URL een build-time variabele is
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# 4. Clear Laravel config cache (zodat nieuwe .env variabelen worden geladen)
docker compose -f docker-compose.prod.yml exec backend php artisan config:clear
docker compose -f docker-compose.prod.yml exec backend php artisan cache:clear

# 5. Voer migraties uit indien nodig
docker compose -f docker-compose.prod.yml exec backend php artisan migrate --force

# 6. (Optioneel) Rebuild config cache voor productie
docker compose -f docker-compose.prod.yml exec backend php artisan config:cache
```

**Belangrijk:**
- Frontend rebuild is **verplicht** als `VITE_API_URL` is veranderd (build-time variabele)
- Backend rebuild is nodig als er code wijzigingen zijn (zoals nieuwe middleware)
- Config cache clearen zorgt dat nieuwe `.env` variabelen worden geladen

### 7.4 Backup database

Omdat je een externe MySQL database gebruikt, maak je backups direct op de MySQL server:

```bash
# Backup maken (op je MySQL server)
mysqldump -u ama -p ledenportaal > backup_$(date +%Y%m%d_%H%M%S).sql

# Of met root
mysqldump -u root -p ledenportaal > backup_$(date +%Y%m%d_%H%M%S).sql
```

## Troubleshooting - Stap voor stap debuggen

Als niets werkt, volg deze stappen in volgorde:

### Stap 1: Basis check - Containers draaien?

```bash
docker compose -f docker-compose.prod.yml ps
```

**Verwacht resultaat:**
- `leden_backend` → Status: `Up`
- `leden_frontend` → Status: `Up`

**Als containers niet draaien:**
```bash
# Start containers
docker compose -f docker-compose.prod.yml --env-file .env.production up -d

# Check logs
docker compose -f docker-compose.prod.yml logs backend
docker compose -f docker-compose.prod.yml logs frontend
```

### Stap 2: Test containers direct (zonder NPM)

```bash
# Test backend direct
curl http://localhost:6969/api/plans
# Moet JSON teruggeven: {"data": [...]}

# Test frontend direct
curl http://localhost:3000
# Moet HTML teruggeven (de React app)
```

**Als dit niet werkt:**
- Containers draaien niet correct
- Poorten zijn niet correct gemapped
- Check logs: `docker compose -f docker-compose.prod.yml logs`

### Stap 3: Test vanaf de server zelf

```bash
# Test backend vanaf server
curl http://192.168.68.86:6969/api/plans

# Test frontend vanaf server
curl http://192.168.68.86:3000
```

**Als dit werkt maar het domein niet:**
- Probleem zit in Nginx Proxy Manager of DNS
- Ga verder naar stap 4

### Stap 4: Check Nginx Proxy Manager configuratie

1. **Log in op NPM:** `http://192.168.68.86:81` (of je server IP)

2. **Check Proxy Hosts:**
   - Ga naar **Hosts** → **Proxy Hosts**
   - Zijn beide hosts aanwezig?
   - Zijn ze "Online" (groen vinkje)?

3. **Check configuratie van `aidatim.nl`:**
   - **Domain Names:** `aidatim.nl`
   - **Forward Hostname / IP:** `localhost` (NIET `localhost:3000`, alleen `localhost`)
   - **Forward Port:** `3000` (apart veld)
   - **Scheme:** `http`

4. **Check configuratie van `app.aidatim.nl`:**
   - **Domain Names:** `app.aidatim.nl`
   - **Forward Hostname / IP:** `localhost` (NIET `localhost:6969`, alleen `localhost`)
   - **Forward Port:** `6969` (apart veld)
   - **Scheme:** `http`

5. **Check NPM logs:**
   - Ga naar **Logs** in NPM
   - Kijk voor errors zoals:
     - "502 Bad Gateway"
     - "Connection refused"
     - "Upstream server unavailable"

### Stap 5: Test DNS

```bash
# Test DNS vanaf je server
nslookup aidatim.nl
nslookup app.aidatim.nl

# Beide moeten naar je PUBLIEKE IP wijzen (niet 192.168.68.86)
```

**Belangrijk:** 
- `192.168.68.86` is een privé IP (lokaal netwerk)
- DNS moet naar je publieke IP wijzen
- Check je publieke IP: `curl ifconfig.me` (op je server)

### Stap 6: Test via IP in browser

Probeer in je browser:
- `http://jouw-publieke-ip` (zonder domein)
- Als dit werkt → DNS probleem
- Als dit niet werkt → Firewall/port forwarding probleem

### Stap 7: Veelvoorkomende problemen

**Probleem: "ERR_ADDRESS_UNREACHABLE"**
- DNS wijst naar privé IP → Update DNS naar publiek IP
- Of: Server heeft geen publiek IP → Configureer port forwarding

**Probleem: "502 Bad Gateway" in NPM**
- Forward Hostname/IP is verkeerd → Gebruik `localhost` (niet `192.168.68.86:3000`)
- Containers draaien niet → Check `docker compose ps`
- Poort is verkeerd → Check Forward Port veld

**Probleem: "Connection refused"**
- Containers draaien niet → Start containers
- Poorten zijn niet gemapped → Check `docker-compose.prod.yml`

**Probleem: Frontend laadt maar API werkt niet**
- CORS probleem → Check `CORS_ALLOWED_ORIGINS` in `.env.production`
- API URL verkeerd → Check `VITE_API_URL` in `.env.production`

## Troubleshooting

### Containers starten niet

```bash
# Check logs
docker compose -f docker-compose.prod.yml logs

# Check of poorten in gebruik zijn
netstat -tulpn | grep :3000
netstat -tulpn | grep :6969
```

### Database connectie problemen

- Controleer of de `DB_HOST`, `DB_USERNAME`, `DB_PASSWORD` en `DB_DATABASE` in `.env.production` correct zijn
- Check of je MariaDB container draait: `docker ps | grep mariadb` of `docker ps | grep mysql`
- Test de connectie vanaf de Docker host: `mysql -h 192.168.68.86 -u ama -p ledenportaal`
- Als MariaDB op dezelfde server draait, gebruik dan `host.docker.internal` of `172.17.0.1` als `DB_HOST`
- Als MariaDB in een andere Docker container draait, gebruik de container naam of IP
- Test de connectie vanuit de container: `docker compose -f docker-compose.prod.yml exec backend php artisan tinker`
- Controleer of MariaDB remote connections toestaat (bind-address configuratie)
- Check firewall: MySQL/MariaDB poort 3306 moet open zijn

### Frontend laadt niet

- Check of de frontend build succesvol was: `docker compose -f docker-compose.prod.yml logs frontend`
- Controleer of `VITE_API_URL` correct is ingesteld in `.env.production`
- Rebuild de frontend: `docker compose -f docker-compose.prod.yml up -d --build frontend`

### CORS errors

- Controleer of `CORS_ALLOWED_ORIGINS` in `.env.production` je volledige URL bevat (met https://)
- Controleer of `SANCTUM_STATEFUL_DOMAINS` je domein bevat (zonder protocol)
- Herstart de backend: `docker compose -f docker-compose.prod.yml restart backend`

### Server opschonen voor volledige rebuild

Als je problemen hebt met oude builds of cache, gebruik deze commando's om alles op te schonen:

```bash
# 1. Stop alle containers
docker compose -f docker-compose.prod.yml stop

# 2. Verwijder alle containers
docker compose -f docker-compose.prod.yml rm -f

# 3. Verwijder alle images van dit project
docker images | grep ledensysteem | awk '{print $3}' | xargs -r docker rmi -f 2>/dev/null || true

# 4. (Optioneel) Verwijder alle unused images
docker image prune -f

# 5. (Optioneel) Verwijder build cache
docker builder prune -f

# 6. Rebuild alles vanaf scratch
docker compose -f docker-compose.prod.yml --env-file .env.production build --no-cache

# 7. Start alles opnieuw
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

**Let op:** Dit verwijdert alle containers en images van dit project. Je moet daarna alles opnieuw builden.

### Dubbele /api/api/ in URLs

Als je `https://app.aidatim.nl/api/api/member/profile` ziet in plaats van `https://app.aidatim.nl/api/member/profile`:

**Oorzaak:** `VITE_API_URL` bevat nog `/api` terwijl de frontend code al `/api/` in de paths gebruikt.

**Debug stappen:**

1. **Verifieer `.env.production` op de server:**
   ```bash
   # Check wat er staat
   grep VITE_API_URL .env.production
   
   # Moet zijn (ZONDER /api):
   VITE_API_URL=https://app.aidatim.nl
   
   # NIET:
   # VITE_API_URL=https://app.aidatim.nl/api
   ```

2. **Verifieer dat de build argument wordt doorgegeven:**
   ```bash
   # Check tijdens de build of de waarde correct is
   docker compose -f docker-compose.prod.yml --env-file .env.production build --no-cache frontend 2>&1 | grep VITE_API_URL
   ```

3. **Verifieer in de gebouwde container:**
   ```bash
   # Check wat er in de container staat (als ENV variabele)
   docker compose -f docker-compose.prod.yml exec frontend env | grep VITE
   
   # Check de gebouwde JavaScript (zoek naar de API URL)
   docker compose -f docker-compose.prod.yml exec frontend grep -r "app.aidatim.nl" /usr/share/nginx/html/assets/*.js | head -1
   ```

4. **Force rebuild zonder cache:**
   ```bash
   # Stop de frontend
   docker compose -f docker-compose.prod.yml stop frontend
   
   # Verwijder de oude image
   docker compose -f docker-compose.prod.yml rm -f frontend
   
   # Rebuild ZONDER cache (dit is belangrijk!)
   docker compose -f docker-compose.prod.yml --env-file .env.production build --no-cache frontend
   
   # Start opnieuw
   docker compose -f docker-compose.prod.yml --env-file .env.production up -d frontend
   ```

5. **Clear browser cache:**
   - Hard refresh: `Ctrl+Shift+R` (Windows/Linux) of `Cmd+Shift+R` (Mac)
   - Of gebruik Incognito/Private mode

**Belangrijk:** De `--no-cache` flag is cruciaal omdat Docker anders de oude build cache gebruikt!

### SSL certificaat problemen

- Controleer in Nginx Proxy Manager of het certificaat succesvol is gegenereerd
- Check of je DNS correct is geconfigureerd (A record naar je server IP)
- Wacht even (certificaat generatie kan enkele minuten duren)

## Veiligheid

### Best practices

1. **Wachtwoorden:** Gebruik sterke, unieke wachtwoorden voor alle services
2. **Firewall:** Zorg dat alleen poorten 80, 443, en 81 (NPM) open staan
3. **Updates:** Houd Docker images up-to-date
4. **Backups:** Maak regelmatig backups van de database
5. **Environment file:** Zorg dat `.env.production` niet in git staat (check `.gitignore`)

### Firewall configuratie

```bash
# UFW voorbeeld (Ubuntu/Debian)
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 81/tcp  # Nginx Proxy Manager
ufw enable
```

## Subdomein Multi-Tenancy Configuratie

### Overzicht

Het systeem gebruikt subdomein-gebaseerde multi-tenancy:
- **Backend API**: `app.aidatim.nl` - Alle API requests gaan hiernaartoe
- **Platform Admin**: `portal.aidatim.nl` - Frontend voor platform beheerders
- **Organisaties**: `{subdomain}.aidatim.nl` - Elke organisatie heeft een uniek subdomein
- **Website**: `aidatim.nl` - Statische website (niet gebruikt door applicatie)

### Hoe het werkt

1. **Frontend detectie**: De frontend detecteert automatisch het subdomein uit `window.location.hostname`
2. **API requests**: Alle API requests gaan naar `app.aidatim.nl`, ongeacht het frontend subdomein
3. **Subdomein header**: De frontend stuurt het subdomein mee in de `X-Organisation-Subdomain` header
4. **Backend resolutie**: De backend middleware (`ResolveOrganisationFromSubdomain`) extraheert het subdomein en resolveert de organisatie
5. **Validatie**: De middleware (`ValidateUserOrganisationAccess`) controleert of de gebruiker toegang heeft tot de organisatie

### Nieuwe organisaties

Nieuwe organisaties krijgen automatisch een subdomein bij registratie:
- Subdomein wordt gegenereerd op basis van de organisatienaam (slug-formaat)
- Bijvoorbeeld: "Vereniging ABC" → `vereniging-abc.aidatim.nl`
- Uniekheid wordt automatisch gecontroleerd (nummer wordt toegevoegd indien nodig)

### Bestaande organisaties

Voor bestaande organisaties zonder subdomein:

```bash
# Genereer subdomeinen voor alle organisaties zonder subdomein
docker compose -f docker-compose.prod.yml exec backend php artisan organisations:generate-subdomains
```

### Platform Admin Toegang

Platform admins kunnen inloggen op `portal.aidatim.nl`:
- Geen organisatie context vereist
- Toegang tot alle platform admin routes
- Kan alle organisaties beheren

### Troubleshooting Subdomeinen

**Probleem: "Organisatie niet gevonden voor dit subdomein" (404)**
- Controleer of de organisatie een subdomein heeft: `docker compose -f docker-compose.prod.yml exec backend php artisan tinker` → `Organisation::where('subdomain', 'jouw-subdomein')->first()`
- Genereer subdomein indien ontbreekt: `php artisan organisations:generate-subdomains`

**Probleem: "U heeft geen toegang tot deze organisatie" (403)**
- Controleer of de gebruiker bij de juiste organisatie hoort
- Platform admins hebben altijd toegang

**Probleem: Wildcard DNS werkt niet**
- Controleer DNS records: `dig *.aidatim.nl +short`
- Wacht op DNS propagatie (kan tot 48 uur duren)
- Test met specifiek subdomein: `dig vereniging-abc.aidatim.nl +short`

## Data Verwijdering Guide

### Alle Data Verwijderen (Behalve Platform Account)

Als je alle data wilt verwijderen behalve het platform admin account (`info@aidatim.nl`), volg deze stappen:

#### Stap 1: Backup maken (aanbevolen)

```bash
# Maak een backup van de database voordat je data verwijdert
docker compose -f docker-compose.prod.yml exec backend mysqldump -u ama -p ledenportaal > backup_before_cleanup_$(date +%Y%m%d_%H%M%S).sql
```

#### Stap 2: Identificeer platform admin account

```bash
# Check welk account het platform admin account is
docker compose -f docker-compose.prod.yml exec backend php artisan tinker
```

In tinker:
```php
$platformAdmin = User::where('email', 'info@aidatim.nl')->first();
if ($platformAdmin) {
    echo "Platform Admin ID: " . $platformAdmin->id . "\n";
    echo "Organisation ID: " . ($platformAdmin->organisation_id ?? 'null') . "\n";
}
exit
```

#### Stap 3: Verwijder alle data (SQL script)

Maak een SQL script aan om alle data te verwijderen:

```bash
# Maak een cleanup script
cat > /tmp/cleanup_database.sql << 'EOF'
-- Disable foreign key checks tijdelijk
SET FOREIGN_KEY_CHECKS = 0;

-- Verwijder alle organisaties (behalve die van platform admin als die bestaat)
-- Eerst verwijderen we alle gerelateerde data

-- Verwijder alle member subscriptions
DELETE FROM member_subscriptions;

-- Verwijder alle member contribution records
DELETE FROM member_contribution_records;

-- Verwijder alle member contribution histories
DELETE FROM member_contribution_histories;

-- Verwijder alle member invitations
DELETE FROM member_invitations;

-- Verwijder alle members
DELETE FROM members;

-- Verwijder alle payment transactions
DELETE FROM payment_transactions;

-- Verwijder alle organisation stripe connections
DELETE FROM organisation_stripe_connections;

-- Verwijder alle organisation subscriptions
DELETE FROM organisation_subscriptions;

-- Verwijder alle subscription audit logs
DELETE FROM subscription_audit_logs;

-- Verwijder alle users (behalve platform admin)
DELETE FROM users WHERE email != 'info@aidatim.nl';

-- Verwijder alle organisaties (behalve die van platform admin als die bestaat)
-- Eerst checken we of platform admin een organisatie heeft
-- Als platform admin organisation_id heeft, behouden we die organisatie
DELETE FROM organisations 
WHERE id NOT IN (
    SELECT COALESCE(organisation_id, 0) 
    FROM users 
    WHERE email = 'info@aidatim.nl' 
    AND organisation_id IS NOT NULL
);

-- Verwijder alle roles (behalve platform_admin rol)
-- Maar eerst verwijderen we de koppelingen
DELETE FROM role_user WHERE role_id NOT IN (
    SELECT id FROM roles WHERE name = 'platform_admin'
);

-- Verwijder alle roles behalve platform_admin
DELETE FROM roles WHERE name != 'platform_admin';

-- Verwijder alle platform settings (optioneel - behouden of verwijderen)
-- DELETE FROM platform_settings;

-- Verwijder alle plans (optioneel - behouden of verwijderen)
-- DELETE FROM plans;

-- Verwijder alle stripe events (optioneel)
DELETE FROM stripe_events;

-- Reset platform admin account
UPDATE users 
SET 
    organisation_id = NULL,
    member_id = NULL,
    status = 'active'
WHERE email = 'info@aidatim.nl';

-- Zorg dat platform admin de platform_admin rol heeft
INSERT IGNORE INTO role_user (user_id, role_id)
SELECT u.id, r.id
FROM users u
CROSS JOIN roles r
WHERE u.email = 'info@aidatim.nl'
AND r.name = 'platform_admin';

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;
EOF
```

#### Stap 4: Voer het cleanup script uit

```bash
# Voer het SQL script uit
docker compose -f docker-compose.prod.yml exec backend mysql -u ama -p ledenportaal < /tmp/cleanup_database.sql

# Of als je root gebruikt:
docker compose -f docker-compose.prod.yml exec backend mysql -u root -p ledenportaal < /tmp/cleanup_database.sql
```

#### Stap 5: Verifieer dat alleen platform admin over is

```bash
docker compose -f docker-compose.prod.yml exec backend php artisan tinker
```

In tinker:
```php
// Check users
echo "Users: " . User::count() . "\n";
$users = User::all();
foreach ($users as $user) {
    echo "- " . $user->email . " (ID: " . $user->id . ")\n";
}

// Check organisaties
echo "\nOrganisaties: " . Organisation::count() . "\n";

// Check members
echo "Members: " . Member::count() . "\n";

// Check platform admin
$admin = User::where('email', 'info@aidatim.nl')->first();
if ($admin) {
    echo "\nPlatform Admin:\n";
    echo "- Email: " . $admin->email . "\n";
    echo "- Has platform_admin role: " . ($admin->hasRole('platform_admin') ? 'Yes' : 'No') . "\n";
    echo "- Organisation ID: " . ($admin->organisation_id ?? 'null') . "\n";
}

exit
```

#### Alternatief: Via Artisan Command (veiliger)

Voor een veiligere aanpak, maak een custom Artisan command:

```bash
# Maak een cleanup command (optioneel - kan handmatig worden toegevoegd)
# Dit is veiliger omdat het validatie en checks bevat
```

**Let op:** 
- Deze operatie is **IRREVERSIBEL** - maak altijd eerst een backup
- Test eerst op een development/staging omgeving
- Controleer na het uitvoeren of het platform admin account nog werkt
- Log in op `portal.aidatim.nl` om te verifiëren dat alles werkt

### Alleen Test Data Verwijderen

Als je alleen test data wilt verwijderen maar productie data wilt behouden:

```bash
# Verwijder alleen organisaties met status 'new' of 'blocked'
docker compose -f docker-compose.prod.yml exec backend php artisan tinker
```

In tinker:
```php
// Verwijder alleen test organisaties
$testOrgs = Organisation::whereIn('status', ['new', 'blocked'])->get();
foreach ($testOrgs as $org) {
    // Verwijder gerelateerde data
    $org->members()->delete();
    $org->users()->where('email', '!=', 'info@aidatim.nl')->delete();
    $org->delete();
    echo "Verwijderd: " . $org->name . "\n";
}
exit
```

## Ondersteuning

Voor vragen of problemen, check:
- Docker logs: `docker compose -f docker-compose.prod.yml logs`
- Laravel logs: `docker compose -f docker-compose.prod.yml exec backend tail -f storage/logs/laravel.log`
- Nginx logs: `docker compose -f docker-compose.prod.yml logs nginx`

