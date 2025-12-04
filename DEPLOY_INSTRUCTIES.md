# Deployment Instructies - Update naar Server

## Belangrijk: Nieuwe Database Tabellen

Deze update bevat **nieuwe database tabellen**:
- `subscription_audit_logs` - Voor audit trail van subscriptions
- Wijzigingen aan `payment_transactions` - Nieuwe kolommen voor failure tracking

**Zorg dat je een backup maakt voordat je migraties uitvoert!**

## Stap-voor-stap Deployment

### 1. Commit en push je lokale wijzigingen (lokaal)

```bash
# Controleer welke bestanden zijn gewijzigd
git status

# Voeg alle wijzigingen toe
git add .

# Commit met duidelijke message
git commit -m "Add subscription audit trail and payment failure tracking"

# Push naar remote repository
git push origin main  # of je branch naam
```

### 2. Log in op je server via SSH

```bash
ssh ama@192.168.68.86  # of je server IP
```

### 3. Ga naar je project directory

```bash
cd ~/ledensysteem  # of waar je project staat
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
git pull origin main  # of je branch naam
```

### 6. Controleer welke migraties er zijn (optioneel)

```bash
docker compose -f docker-compose.prod.yml exec backend php artisan migrate:status
```

Dit toont welke migraties al zijn uitgevoerd en welke nog moeten.

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
# Dit voert alle nieuwe migraties uit, inclusief de nieuwe tabellen
docker compose -f docker-compose.prod.yml exec backend php artisan migrate --force
```

**Verwachte output:**
```
Migrating: 2025_12_01_151448_create_subscription_audit_logs_table
Migrated:  2025_12_01_151448_create_subscription_audit_logs_table (XX.XXms)
Migrating: 2025_12_01_152255_add_failure_tracking_to_payment_transactions_table
Migrated:  2025_12_01_152255_add_failure_tracking_to_payment_transactions_table (XX.XXms)
```

### 10. Rebuild Laravel cache

```bash
docker compose -f docker-compose.prod.yml exec backend php artisan config:cache
docker compose -f docker-compose.prod.yml exec backend php artisan route:cache
docker compose -f docker-compose.prod.yml exec backend php artisan view:cache
```

### 11. Herstart backend container

```bash
docker compose -f docker-compose.prod.yml restart backend
```

Dit zorgt ervoor dat alle nieuwe code en configuratie correct geladen wordt.

### 12. Controleer of alles werkt

```bash
# Check container status
docker compose -f docker-compose.prod.yml ps

# Check backend logs voor errors
docker compose -f docker-compose.prod.yml logs backend --tail 50

# Check frontend logs
docker compose -f docker-compose.prod.yml logs frontend --tail 50
```

### 13. Test de applicatie

- Ga naar `https://aidatim.nl` en test of de frontend werkt
- Log in als org_admin en test of subscription pagina werkt
- Controleer of de nieuwe functionaliteit werkt

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

## Snelle Commando's (Copy-paste)

Als je zeker weet dat alles goed is, kun je deze commando's in één keer uitvoeren:

```bash
cd ~/ledensysteem
git pull origin main
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
docker compose -f docker-compose.prod.yml exec backend php artisan config:clear
docker compose -f docker-compose.prod.yml exec backend php artisan cache:clear
docker compose -f docker-compose.prod.yml exec backend php artisan migrate --force
docker compose -f docker-compose.prod.yml exec backend php artisan config:cache
docker compose -f docker-compose.prod.yml restart backend
docker compose -f docker-compose.prod.yml ps
```

## Belangrijke Notities

1. **Database Backup:** Zorg ALTIJD dat je een backup hebt gemaakt voordat je migraties uitvoert
2. **Frontend Rebuild:** De frontend wordt automatisch gerebuild door `--build` flag
3. **Backend Rebuild:** Nieuwe code (middleware, controllers, commands) wordt geladen na rebuild
4. **Migraties:** De `--force` flag is nodig in productie om migraties zonder bevestiging uit te voeren
5. **Cache:** Clear cache VOOR migraties, rebuild cache NA migraties

## Nieuwe Features in deze Update

- ✅ Subscription audit trail systeem
- ✅ Payment failure tracking
- ✅ Automatische controle van incomplete subscriptions (elk uur)
- ✅ Verbeterde middleware voor billing status checks
- ✅ Verbeterde frontend voor subscription management
- ✅ Betere error handling en logging


