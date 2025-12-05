# Migration Instructies

## Database Migration Uitvoeren

Om de nieuwe `platform_settings` tabel aan te maken, voer de volgende stappen uit:

### Optie 1: Via Docker (aanbevolen)

Als je Docker gebruikt, voer dit uit vanuit de project root:

```bash
# Backend container binnengaan
docker exec -it leden_backend bash

# Migration uitvoeren
php artisan migrate

# Optioneel: Seeder uitvoeren voor standaard instellingen
php artisan db:seed --class=PlatformSettingsSeeder
```

### Optie 2: Lokaal (als PHP lokaal geïnstalleerd is)

```bash
cd backend
php artisan migrate
php artisan db:seed --class=PlatformSettingsSeeder
```

### Optie 3: Via docker-compose

```bash
docker compose exec backend php artisan migrate
docker compose exec backend php artisan db:seed --class=PlatformSettingsSeeder
```

## Wat wordt aangemaakt?

1. **Tabel**: `platform_settings`
   - `id` - Primary key
   - `key` - Unieke key voor de setting
   - `value` - Waarde van de setting (JSON voor arrays)
   - `description` - Beschrijving van de setting
   - `created_at` / `updated_at` - Timestamps

2. **Standaard instellingen**:
   - `payment_methods`: `["card","sepa_debit"]` - Standaard betaalmethodes

## Verificatie

Na het uitvoeren van de migration en seeder, kun je controleren of alles werkt:

1. Log in als platform admin
2. Ga naar `/platform/settings`
3. Je zou de betaalmethodes moeten kunnen zien en aanpassen
