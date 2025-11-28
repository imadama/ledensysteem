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
7. Configureer Nginx Proxy Manager:
   - Frontend Proxy Host: `aidatim.nl` → `localhost:3000`
   - Backend Proxy Host: `app.aidatim.nl` → `localhost:8000`
8. Request SSL certificaten in NPM voor beide domeinen

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
APP_URL=https://app.aidatim.nl

# Database
DB_CONNECTION=mysql
DB_HOST=192.168.68.86
DB_PORT=3306
DB_DATABASE=ledenportaal
DB_USERNAME=ama
DB_PASSWORD=ama123
DB_ROOT_PASSWORD=ama123

# Session & CORS
SESSION_DOMAIN=aidatim.nl
SANCTUM_STATEFUL_DOMAINS=aidatim.nl
CORS_ALLOWED_ORIGINS=https://aidatim.nl

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
VITE_API_URL=https://app.aidatim.nl/api


**Belangrijke variabelen om aan te passen:**

- `APP_KEY`: Laat dit leeg, wordt automatisch gegenereerd in stap 3
- `APP_URL`: `https://app.aidatim.nl` (backend API URL)
- `DB_PASSWORD`: Kies een sterk wachtwoord voor de database
- `DB_ROOT_PASSWORD`: Kies een sterk root wachtwoord voor MySQL
- `SESSION_DOMAIN`: `aidatim.nl` (hoofddomein voor cookies)
- `SANCTUM_STATEFUL_DOMAINS`: `aidatim.nl` (frontend domein)
- `CORS_ALLOWED_ORIGINS`: `https://aidatim.nl` (frontend URL)
- `VITE_API_URL`: `https://app.aidatim.nl/api` (backend API URL voor frontend)
- Stripe variabelen: Vul je Stripe productie keys in
- Mail variabelen: Vul je SMTP instellingen in

## Stap 2: Docker containers bouwen en starten

### 2.1 Build en start de containers

**Let op:** Deze guide gebruikt `docker compose` (met spatie) voor Docker Compose v2. Als je nog v1 gebruikt, vervang dan `docker compose` door `docker-compose` (met streepje).

```bash
# Gebruik de productie docker compose file
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Dit zal:
- De MySQL database container starten
- De backend container bouwen en starten
- De frontend container bouwen (met productie build) en starten

### 2.2 Controleer of alles draait

```bash
docker compose -f docker-compose.prod.yml ps
```

Je zou 4 containers moeten zien draaien:
- `leden_db`
- `leden_backend`
- `leden_frontend`
- `leden_nginx`

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

```bash
docker compose -f docker-compose.prod.yml exec backend php artisan key:generate
```

Dit genereert automatisch een APP_KEY en voegt deze toe aan je `.env.production` bestand.

### 3.2 Voer migraties uit

```bash
docker compose -f docker-compose.prod.yml exec backend php artisan migrate --force
```

### 3.3 Seed de database (rollen en admin)

```bash
docker compose -f docker-compose.prod.yml exec backend php artisan db:seed --class=RolesAndAdminSeeder --force
```

**Let op:** De seeder maakt een admin account aan. Check de seeder code voor de standaard credentials of pas deze aan.

### 3.4 Cache optimaliseren (optioneel maar aanbevolen)

```bash
docker compose -f docker-compose.prod.yml exec backend php artisan config:cache
docker compose -f docker-compose.prod.yml exec backend php artisan route:cache
docker compose -f docker-compose.prod.yml exec backend php artisan view:cache
```

## Stap 4: Nginx Proxy Manager configureren

Omdat je al Nginx Proxy Manager hebt, maken we twee aparte Proxy Hosts aan:
- **Frontend** op `aidatim.nl` → forward naar `localhost:3000`
- **Backend API** op `app.aidatim.nl` → forward naar `localhost:8000`

### 4.1 Frontend Proxy Host (aidatim.nl)

1. Log in op je Nginx Proxy Manager interface (meestal `http://jouw-server-ip:81`)
2. Ga naar **Hosts** > **Proxy Hosts**
3. Klik op **Add Proxy Host**

**Details tab:**
- **Domain Names:** `aidatim.nl`
- **Scheme:** `http`
- **Forward Hostname / IP:** 
  - Als Nginx Proxy Manager op de host draait: `localhost` of `127.0.0.1`
  - Als Nginx Proxy Manager in een Docker network draait: `leden_frontend` (container naam) of het IP adres van je Docker host
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

### 4.2 Backend API Proxy Host (app.aidatim.nl)

1. Ga naar **Hosts** > **Proxy Hosts**
2. Klik op **Add Proxy Host**

**Details tab:**
- **Domain Names:** `app.aidatim.nl`
- **Scheme:** `http`
- **Forward Hostname / IP:** 
  - Als Nginx Proxy Manager op de host draait: `localhost` of `127.0.0.1`
  - Als Nginx Proxy Manager in een Docker network draait: `leden_backend` (container naam) of het IP adres van je Docker host
- **Forward Port:** `8000` (de poort van de backend container)
- **Cache Assets:** Uit (voor API's niet nodig)
- **Block Common Exploits:** Aan
- **Websockets Support:** Uit

**Advanced tab (optioneel):**
Als je extra headers nodig hebt:

```nginx
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

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

Zorg dat je DNS records correct zijn ingesteld:

- **A record** voor `aidatim.nl` → wijst naar je server IP
- **A record** voor `app.aidatim.nl` → wijst naar je server IP

Of gebruik een **CNAME record**:
- **CNAME** voor `app.aidatim.nl` → wijst naar `aidatim.nl`

**Let op:** Het kan even duren voordat DNS records zijn doorgevoerd. Je kunt dit testen met:
```bash
dig aidatim.nl
dig app.aidatim.nl
```

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

1. Open je browser en ga naar `https://aidatim.nl` (frontend)
2. Test of de frontend laadt
3. Test of API calls werken (bijv. inloggen) - deze gaan naar `https://app.aidatim.nl/api`
4. Check de browser console voor errors
5. Test ook direct de backend API: `https://app.aidatim.nl/api/health` (als je een health endpoint hebt)

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

```bash
# Pull laatste code
git pull origin main  # of je branch naam

# Rebuild en restart
docker compose -f docker-compose.prod.yml up -d --build

# Voer migraties uit indien nodig
docker compose -f docker-compose.prod.yml exec backend php artisan migrate --force
```

### 7.4 Backup database

```bash
# Backup maken
docker compose -f docker-compose.prod.yml exec db mysqldump -u app -p${DB_PASSWORD} ledenportaal > backup_$(date +%Y%m%d_%H%M%S).sql

# Of met root
docker compose -f docker-compose.prod.yml exec db mysqldump -u root -p${DB_ROOT_PASSWORD} ledenportaal > backup_$(date +%Y%m%d_%H%M%S).sql
```

## Troubleshooting

### Containers starten niet

```bash
# Check logs
docker compose -f docker-compose.prod.yml logs

# Check of poorten in gebruik zijn
netstat -tulpn | grep :3000
netstat -tulpn | grep :8000
```

### Database connectie problemen

- Controleer of de `DB_PASSWORD` in `.env.production` overeenkomt met `MYSQL_PASSWORD` in docker compose
- Check of de database container draait: `docker compose -f docker-compose.prod.yml ps db`
- Test de connectie: `docker compose -f docker-compose.prod.yml exec backend php artisan tinker`

### Frontend laadt niet

- Check of de frontend build succesvol was: `docker compose -f docker-compose.prod.yml logs frontend`
- Controleer of `VITE_API_URL` correct is ingesteld in `.env.production`
- Rebuild de frontend: `docker compose -f docker-compose.prod.yml up -d --build frontend`

### CORS errors

- Controleer of `CORS_ALLOWED_ORIGINS` in `.env.production` je volledige URL bevat (met https://)
- Controleer of `SANCTUM_STATEFUL_DOMAINS` je domein bevat (zonder protocol)
- Herstart de backend: `docker compose -f docker-compose.prod.yml restart backend`

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

## Ondersteuning

Voor vragen of problemen, check:
- Docker logs: `docker compose -f docker-compose.prod.yml logs`
- Laravel logs: `docker compose -f docker-compose.prod.yml exec backend tail -f storage/logs/laravel.log`
- Nginx logs: `docker compose -f docker-compose.prod.yml logs nginx`

