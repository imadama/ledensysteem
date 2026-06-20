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

## Architecture

Layered, MVVM, dependency-injected:

```
feature/   Compose screens + ViewModels (login, unlock, dashboard, contribution, profile)
navigation Compose Navigation graph
data/      API clients, DTOs and repositories (auth, contribution, profile)
core/      network (Ktor), security (secure storage), biometric — expect/actual per platform
di/        Koin module
```

- **HTTP:** Ktor (OkHttp engine on Android, Darwin on iOS) + kotlinx.serialization
- **DI:** Koin · **State:** MVVM with `StateFlow`
- **Secure storage:** multiplatform-settings (iOS Keychain, Android Keystore-encrypted prefs)
- **Biometrics:** `BiometricPrompt` (Android) / `LocalAuthentication` (iOS) via `expect`/`actual`

The backend resolves the tenant from the `X-Organisation-Subdomain` header, which
the app derives automatically from the signed-in member's organisation.

---

## Prerequisites

- **JDK 21**
- **Android Studio** (latest) with Android SDK **platform 36**
- For iOS: **Xcode** with an installed **iOS simulator runtime**
- An Android emulator and/or iOS simulator

The app needs no local configuration — the backend URL is set in
`shared/src/commonMain/kotlin/nl/aidatim/member/core/network/ApiConfig.kt`
and points at the public API.

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
  -derivedDataPath ../.ios-ddata CODE_SIGNING_ALLOWED=NO build
```

## Running tests

```bash
# Shared unit tests (JVM host)
./gradlew :shared:testAndroidHostTest

# Compile check for the iOS framework
./gradlew :shared:compileKotlinIosSimulatorArm64
```

## Continuous integration

`.github/workflows/mobile-ci.yml` runs on every push/PR touching `mobile/`:
the Android APK + unit tests build on Linux, and the iOS framework is compiled
on macOS.

---

## Notes

- Ktor is pinned to **3.1.3** (3.2.0 has a D8 dexing incompatibility at `minSdk 24`).
- The Android app declares the `INTERNET` permission and uses a `FragmentActivity`
  (required by `BiometricPrompt`).
- The session token is stored encrypted; biometric unlock falls through gracefully
  when no biometrics are enrolled, so a valid session is never locked out.
