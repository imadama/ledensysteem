# Deployment Instructies - SEPA Incasso & Platform Settings Update

## Belangrijk: Nieuwe Database Tabellen en Velden

Deze update bevat:
- **Nieuwe tabel**: `platform_settings` - Voor platform configuratie (betaalmethodes)
- **Nieuwe velden** in `members` tabel: SEPA subscription velden
- **Nieuwe functionaliteit**: Automatische SEPA incasso voor leden zonder online account
- **Nieuwe functionaliteit**: Platform admin kan betaalmethodes configureren

**Zorg dat je een backup maakt voordat je migraties uitvoert!**

## Stap-voor-stap Deployment

### 1. Commit en push je lokale wijzigingen (lokaal)

```bash
# Controleer welke bestanden zijn gewijzigd
git status

# Voeg alle wijzigingen toe
git add .

# Commit met duidelijke message
git commit -m "Add SEPA subscription for members without account and platform payment methods settings"

# Push naar remote repository
git push origin dev  # of je branch naam (main/dev)
```

### 2. Log in op je server via SSH

```bash
ssh ama@192.168.68.86  # of je server IP
```

### 3. Ga naar je project directory

```bash
cd ~/ledensysteem  # of waar je project staat (bijv. /opt/ledensysteem)
```

### 4. Maak een database backup (BELANGRIJK!)

```bash
# Backup maken van de database
mysqldump -u ama -p ledenportaal > backup_$(date +%Y%m%d_%H%M%S).sql

# Of met root als je die gebruikt
mysqldump -u root -p ledenportaal > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 5. Pull de laatste wijzigingen

```bash
git pull origin dev  # of je branch naam
```

### 6. Controleer welke migraties er zijn (optioneel)

```bash
docker compose -f docker-compose.prod.yml exec backend php artisan migrate:status
```

Dit toont welke migraties al zijn uitgevoerd en welke nog moeten.

**Verwachte nieuwe migraties:**
- `2025_01_20_000000_create_platform_settings_table`
- `2025_01_21_000000_add_sepa_subscription_fields_to_members_table`

### 7. Rebuild containers (belangrijk voor code wijzigingen)

```bash
# Rebuild alle containers met nieuwe code
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

**Let op:** Dit kan even duren omdat alle containers opnieuw gebouwd worden.

### 8. Clear Laravel cache

```bash
docker compose -f docker-compose.prod.yml exec backend php artisan config:clear
docker compose -f docker-compose.prod.yml exec backend php artisan cache:clear
docker compose -f docker-compose.prod.yml exec backend php artisan route:clear
docker compose -f docker-compose.prod.yml exec backend php artisan view:clear
```

### 9. Voer database migraties uit (BELANGRIJK!)

```bash
# Dit voert alle nieuwe migraties uit
docker compose -f docker-compose.prod.yml exec backend php artisan migrate --force
```

**Verwachte output:**
```
Migrating: 2025_01_20_000000_create_platform_settings_table
Migrated:  2025_01_20_000000_create_platform_settings_table (XX.XXms)
Migrating: 2025_01_21_000000_add_sepa_subscription_fields_to_members_table
Migrated:  2025_01_21_000000_add_sepa_subscription_fields_to_members_table (XX.XXms)
```

### 10. Seed platform settings (optioneel, maar aanbevolen)

```bash
# Seed standaard betaalmethodes (card en sepa_debit)
docker compose -f docker-compose.prod.yml exec backend php artisan db:seed --class=PlatformSettingsSeeder --force
```

Dit zet de standaard betaalmethodes (`card` en `sepa_debit`) in.

### 11. Rebuild Laravel cache

```bash
docker compose -f docker-compose.prod.yml exec backend php artisan config:cache
docker compose -f docker-compose.prod.yml exec backend php artisan route:cache
docker compose -f docker-compose.prod.yml exec backend php artisan view:cache
```

### 12. Herstart backend container

```bash
docker compose -f docker-compose.prod.yml restart backend
```

Dit zorgt ervoor dat alle nieuwe code en configuratie correct geladen wordt.

### 13. Controleer of alles werkt

```bash
# Check container status
docker compose -f docker-compose.prod.yml ps

# Check backend logs voor errors
docker compose -f docker-compose.prod.yml logs backend --tail 50

# Check frontend logs
docker compose -f docker-compose.prod.yml logs frontend --tail 50
```

### 14. Test de applicatie

- Ga naar `https://aidatim.nl` en test of de frontend werkt
- Log in als **platform_admin** en ga naar `/platform/settings` om betaalmethodes te configureren
- Log in als **org_admin** en ga naar een lid detailpagina om SEPA incasso te testen
- Controleer of de nieuwe functionaliteit werkt

## Snelle Commando's (Copy-paste)

Als je zeker weet dat alles goed is, kun je deze commando's in één keer uitvoeren:

```bash
cd ~/ledensysteem
git pull origin dev
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
docker compose -f docker-compose.prod.yml exec backend php artisan config:clear
docker compose -f docker-compose.prod.yml exec backend php artisan cache:clear
docker compose -f docker-compose.prod.yml exec backend php artisan route:clear
docker compose -f docker-compose.prod.yml exec backend php artisan migrate --force
docker compose -f docker-compose.prod.yml exec backend php artisan db:seed --class=PlatformSettingsSeeder --force
docker compose -f docker-compose.prod.yml exec backend php artisan config:cache
docker compose -f docker-compose.prod.yml exec backend php artisan route:cache
docker compose -f docker-compose.prod.yml restart backend
docker compose -f docker-compose.prod.yml ps
```

## Nieuwe Features in deze Update

### Platform Admin Features:
- ✅ Platform settings systeem (`platform_settings` tabel)
- ✅ Platform admin kan betaalmethodes configureren via `/platform/settings`
- ✅ Configureerbare betaalmethodes worden gebruikt in checkout sessions

### Org Admin Features:
- ✅ Stripe Dashboard knop op `/settings/payments` (alleen voor org_admin)
- ✅ Automatische SEPA incasso opzetten voor leden zonder online account
- ✅ SEPA subscription beheer (setup, disable, update bedrag)
- ✅ Gebruikt collectieve machtiging (geen individuele registratie nodig)

### Technische Wijzigingen:
- ✅ Nieuwe database tabel: `platform_settings`
- ✅ Nieuwe velden in `members` tabel voor SEPA subscription tracking
- ✅ Nieuwe service: `MemberSepaSubscriptionService`
- ✅ Nieuwe controller: `MemberSepaSubscriptionController`
- ✅ Nieuwe frontend component: `MemberSepaSubscriptionSection`
- ✅ Webhook updates voor SEPA mandate ID tracking

## Troubleshooting

### Als migraties falen:

```bash
# Check welke migraties er zijn
docker compose -f docker-compose.prod.yml exec backend php artisan migrate:status

# Check database connectie
docker compose -f docker-compose.prod.yml exec backend php artisan tinker
# In tinker: DB::connection()->getPdo();

# Rollback laatste migratie (als nodig)
docker compose -f docker-compose.prod.yml exec backend php artisan migrate:rollback --step=1
```

### Als containers niet starten:

```bash
# Check logs
docker compose -f docker-compose.prod.yml logs

# Stop alles en start opnieuw
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

### Als er errors zijn in de logs:

```bash
# Backend Laravel logs
docker compose -f docker-compose.prod.yml exec backend tail -f /var/www/html/storage/logs/laravel.log

# Of laatste 100 regels
docker compose -f docker-compose.prod.yml exec backend tail -100 /var/www/html/storage/logs/laravel.log
```

### Als SEPA incasso niet werkt:

1. Controleer of organisatie een actief Stripe account heeft
2. Controleer of lid een IBAN heeft
3. Check Stripe logs in dashboard
4. Controleer webhook configuratie

## Belangrijke Notities

1. **Database Backup:** Zorg ALTIJD dat je een backup hebt gemaakt voordat je migraties uitvoert
2. **Frontend Rebuild:** De frontend wordt automatisch gerebuild door `--build` flag
3. **Backend Rebuild:** Nieuwe code (services, controllers) wordt geladen na rebuild
4. **Migraties:** De `--force` flag is nodig in productie om migraties zonder bevestiging uit te voeren
5. **Cache:** Clear cache VOOR migraties, rebuild cache NA migraties
6. **Platform Settings:** Standaard zijn `card` en `sepa_debit` actief na seeding


