package nl.aidatim.member.core.biometric

/** Outcome of a biometric prompt. */
enum class BiometricResult { SUCCESS, FAILED, UNAVAILABLE }

/**
 * Platform biometric gate: Android BiometricPrompt (fingerprint/face),
 * iOS LocalAuthentication (Face ID / Touch ID).
 */
expect class BiometricAuthenticator() {

    /** True when the device has biometrics enrolled and usable. */
    fun canAuthenticate(): Boolean

    /** Shows the biometric prompt and suspends until the user responds. */
    suspend fun authenticate(title: String, subtitle: String): BiometricResult
}
