# Aidatim — Member App (Kotlin Multiplatform)

A cross-platform mobile member portal for the Aidatim membership platform,
built with **Kotlin Multiplatform** and **Compose Multiplatform** (one shared
codebase for **Android** and **iOS**). The app talks to the existing Aidatim
Laravel backend at `https://api.aidatim.nl` — no separate mobile backend.

> Proof of Concept for the module *Realisatie van een complex informatiesysteem (LU3)*.
> The app's source code and UI are in English.

---

## Features

| Story | Description |
|---|---|
| US-01 | Sign in with email + password (token auth) |
| US-02 | Remembered session in secure storage + biometric unlock (Face ID / fingerprint) |
| US-03 | Dashboard: membership status + contribution summary |
| US-04 | Contribution history with payment status |
| US-06 | View and edit profile (email, address, phone, IBAN) |
| US-09 | Sign out (token revoked server-side) |
| US-11 | Announcements: read posts, like + comment, and receive an Android push notification on a new post |

The four main screens — **Home, Contributions, News, Profile** — are reached
through a **bottom navigation bar**; *Sign out* lives on the Profile screen.

## Architecture

Layered, MVVM, dependency-injected:

```
feature/   Compose screens + ViewModels (login, unlock, main, dashboard,
           contribution, profile, posts)
navigation Compose Navigation graph (outer: login/unlock/main; inner: bottom-nav tabs)
data/      API clients, DTOs and repositories (auth, contribution, profile, posts)
core/      network (Ktor), security (secure storage), biometric — expect/actual per platform
di/        Koin module
```

- **HTTP:** Ktor (OkHttp engine on Android, Darwin on iOS) + kotlinx.serialization
- **DI:** Koin · **State:** MVVM with `StateFlow`
- **Secure storage:** multiplatform-settings (iOS Keychain, Android Keystore-encrypted prefs)
- **Biometrics:** `BiometricPrompt` (Android) / `LocalAuthentication` (iOS) via `expect`/`actual`
- **Push:** Firebase Cloud Messaging (Android)

The backend resolves the tenant from the `X-Organisation-Subdomain` header, which
the app derives automatically from the signed-in member's organisation.

### Toolchain

| | Version |
|---|---|
| Kotlin | 2.4.0 |
| Compose Multiplatform | 1.11.1 |
| Android Gradle Plugin | 9.0.1 |
| compileSdk / minSdk | 36 / 24 |
| Ktor | 3.1.3 |
| Application ID | `nl.aidatim.member` |

---

## Prerequisites

- **JDK 21**
- **Android Studio** (latest) with Android SDK **platform 36**
- For iOS: **Xcode** with an installed **iOS simulator runtime**
- An Android emulator and/or iOS simulator
  - For push notifications, use an Android emulator image **with Google Play services**.

The app needs no local configuration to run against the public backend — the URL
is set in `shared/src/commonMain/kotlin/nl/aidatim/member/core/network/ApiConfig.kt`.
To point at another backend (e.g. a local instance), change `BASE_URL` there.

---

## Build & run — Android

From this `mobile/` directory:

```bash
# Build the debug APK
./gradlew :androidApp:assembleDebug

# Install on a running emulator/device and launch
adb install -r androidApp/build/outputs/apk/debug/androidApp-debug.apk
adb shell monkey -p nl.aidatim.member -c android.intent.category.LAUNCHER 1
```

Or open `mobile/` in Android Studio, pick the **androidApp** run configuration and a
device, and press **Run** (▶).

## Build & run — iOS

Open `iosApp/iosApp.xcodeproj` in Xcode, select an iPhone simulator, and run.

From the command line:

```bash
xcodebuild -project iosApp/iosApp.xcodeproj -scheme iosApp \
  -sdk iphonesimulator -destination 'platform=iOS Simulator,name=iPhone 17' \
  -derivedDataPath .ios-ddata CODE_SIGNING_ALLOWED=NO build
```

Then install & launch on a booted simulator:

```bash
xcrun simctl install booted .ios-ddata/Build/Products/Debug-iphonesimulator/AidatimMember.app
xcrun simctl launch booted nl.aidatim.member.AidatimMember
```

> **Note (unsigned simulator builds):** the iOS Keychain is unavailable without
> signing entitlements, so on the simulator the app automatically falls back to
> `NSUserDefaults` for session storage. Signed device builds use the Keychain.

---

## Push notifications (Android / Firebase)

US-11 sends a push notification when an organisation posts a new announcement.

- The app already includes `androidApp/google-services.json` for the configured
  Firebase project. To use **your own** Firebase project, register an Android app
  with application ID `nl.aidatim.member`, download a new `google-services.json`
  and replace the file. The Google Services Gradle plugin is applied **only when
  that file is present**, so the build also works without it (push disabled).
- The backend needs a service-account credential (`FIREBASE_CREDENTIALS`) to send
  messages — see `docs/mededelingen-push-setup.md` in the repository root.

---

## Using the app

1. **Sign in** with a member email + password → the backend returns a token,
   stored encrypted on the device.
2. On the **next launch** a biometric prompt unlocks the saved session
   (it falls through automatically if no biometrics are enrolled).
3. Navigate via the **bottom bar**: Home (dashboard), Contributions (history),
   News (announcements — open a post to like/comment), Profile (edit + Sign out).

---

## Running tests

```bash
# Shared unit tests — business logic on the JVM host
./gradlew :shared:testAndroidHostTest

# UI / device tests — Compose UI tests on the iOS simulator
./gradlew :shared:iosSimulatorArm64Test

# Compile check for the iOS framework (what CI runs)
./gradlew :shared:compileKotlinIosSimulatorArm64
```

See `school/Testrapportage-Aidatim-Member-App.docx` for the full test report.

## Continuous integration

`.github/workflows/mobile-ci.yml` runs on every push/PR touching `mobile/`:
the Android APK + unit tests build on Linux, and the iOS framework is compiled
on macOS. (The Compose UI-test link requires a newer Xcode than the CI runner,
so those tests are run locally.)

---

## Troubleshooting

- **iOS build fails with `accessing build database … disk I/O error` or a build
  service inconsistency:** stop the stale build service and clear derived data,
  then rebuild:
  ```bash
  killall XCBBuildService; rm -rf .ios-ddata
  ```
- **iOS app launches to a blank screen:** make sure you are on the latest code —
  unsigned simulator builds need the Keychain→`NSUserDefaults` fallback (already
  in `core/security/SecureSettings.ios.kt`).
- **Android push never arrives:** use an emulator image **with Google Play**, and
  grant the `POST_NOTIFICATIONS` permission (Android 13+) when prompted.

## Notes

- Ktor is pinned to **3.1.3** (3.2.0 has a D8 dexing incompatibility at `minSdk 24`).
- The Android app declares `INTERNET` + `POST_NOTIFICATIONS` and uses a
  `FragmentActivity` (required by `BiometricPrompt`).
- The session token is stored encrypted; biometric unlock falls through gracefully
  when no biometrics are enrolled, so a valid session is never locked out.
