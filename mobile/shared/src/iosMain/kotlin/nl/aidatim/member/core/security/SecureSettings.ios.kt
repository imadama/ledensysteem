package nl.aidatim.member.core.security

import com.russhwolf.settings.ExperimentalSettingsImplementation
import com.russhwolf.settings.KeychainSettings
import com.russhwolf.settings.NSUserDefaultsSettings
import com.russhwolf.settings.Settings
import platform.Foundation.NSUserDefaults

/**
 * Secure session storage for iOS.
 *
 * Prefers the iOS Keychain. On builds without keychain-access-group entitlements
 * (e.g. an unsigned simulator build) Keychain access fails with OSStatus -34018,
 * which would otherwise crash the whole Compose composition at startup. We probe
 * the Keychain once up-front and fall back to NSUserDefaults when it is unavailable,
 * so the app always renders. Signed device builds keep using the Keychain.
 */
@OptIn(ExperimentalSettingsImplementation::class)
actual fun createSecureSettings(): Settings = try {
    val keychain = KeychainSettings(service = "nl.aidatim.member.session")
    // Probe with the exact operation SessionStorage uses (a value read). On an
    // entitlement-less build this throws here, where we can fall back, instead of
    // later inside composition where it would crash the app.
    keychain.getStringOrNull("__keychain_probe__")
    keychain
} catch (t: Throwable) {
    NSUserDefaultsSettings(NSUserDefaults.standardUserDefaults)
}
