# Mededelingen (posts) + reacties + Android push — setup & activatie

Deze feature is volledig gebouwd en getest op build-niveau. Hieronder staat wat er
gebouwd is, en de **handmatige stappen** die nodig zijn om het live te zetten
(deploy + Firebase). Zonder deze stappen werkt de code wel, maar:
- de **app-feed** toont pas data ná een backend-deploy (de app praat met productie `api.aidatim.nl`);
- de **push-notificatie** werkt pas na de Firebase-setup hieronder.

## Wat er gebouwd is

| Onderdeel | Status |
|---|---|
| Backend: posts/comments/likes + member-feed-endpoints | ✅ 3 feature-tests |
| Backend: FCM-push bij nieuwe post + device-token-endpoints | ✅ 1 feature-test (no-op zonder credentials) |
| App: feed + post-detail met like-toggle + tekstreacties | ✅ Android + iOS compileren |
| App: Android FCM (service, kanaal, permissie, tokenregistratie) | ✅ bouwt groen zonder `google-services.json` |
| React web-admin: berichten beheren (lijst/aanmaken/detail + reacties/likes-tabs) | ✅ tsc schoon |

iOS-push is bewust uitgesteld (vereist betaald Apple Developer-account + echt toestel).

## Stap 1 — Backend + frontend deployen

De nieuwe code staat op branch `feature/kmp-mobile-app`. Productie (`api.aidatim.nl`,
`app.aidatim.nl`) draait van `main`. Om live te gaan: merge naar `main` (of laat Coolify
de branch deployen) en draai de migraties:

```bash
php artisan migrate   # maakt organisation_posts, post_comments, post_likes, device_tokens
```

Daarna kun je de app-feed en de web-admin (menu **Berichten**) gebruiken — nog zonder push.

## Stap 2 — Firebase-project (voor Android-push)

1. **Firebase Console** → nieuw project (of bestaand).
2. **Android-app toevoegen** met package name **`nl.aidatim.member`**.
3. Download **`google-services.json`** → plaats in `mobile/androidApp/google-services.json`.
   (Staat in `.gitignore`; de Gradle-plugin activeert automatisch zodra het bestand er is.)
4. **Service-account** voor de backend: Project Settings → Service accounts →
   *Generate new private key* → download de JSON.
5. Zet die JSON als secret op de server en wijs ernaar met de env-var:
   ```
   FIREBASE_CREDENTIALS=/absolute/pad/naar/service-account.json
   ```
   (Coolify: mount als secret-bestand of base64-env + decode bij boot.)

## Stap 3 — Testen op een Android-emulator

FCM werkt alleen op een emulator-image **met Google Play**.

1. Maak/start een AVD met een **Google Play**-systeemimage (API 33+ aanbevolen voor de
   `POST_NOTIFICATIONS`-prompt).
2. `./gradlew :androidApp:installDebug` (vanuit `mobile/`).
3. App openen, inloggen als lid. Verifieer in Logcat dat `onNewToken` vuurt en dat
   `POST /api/member/device-tokens` 204 geeft → er staat een rij in `device_tokens`.
4. Backend-roоktest: `php artisan tinker` →
   `app(\App\Services\Firebase\FcmSender::class)->sendToOrganisation($orgId, 'Test', 'Hallo')`
   → notificatie op de emulator (test app op voorgrond én op achtergrond).
5. Volledige flow: als org_admin via de web-admin een **bericht** plaatsen → de emulator
   krijgt de push.

## Belangrijke aandachtspunten

- **Geen queue-worker:** de push wordt synchroon verstuurd (`dispatchSync`) bij het
  plaatsen van een post. Async maken = `dispatchSync`→`dispatch` + `php artisan queue:work`.
- **Foreground vs background:** de app rendert binnenkomende notificaties zelf
  (`onMessageReceived`) zodat ze ook op de voorgrond verschijnen.
- **Zonder Firebase:** alles blijft werken; alleen de push is dan uit (FcmSender no-opt,
  app registreert geen token).
