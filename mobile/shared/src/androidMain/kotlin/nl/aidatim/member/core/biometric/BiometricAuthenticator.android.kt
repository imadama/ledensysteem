package nl.aidatim.member.core.biometric

import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import kotlinx.coroutines.suspendCancellableCoroutine
import nl.aidatim.member.core.security.AndroidAppContext
import kotlin.coroutines.resume

/** Holds the current FragmentActivity so BiometricPrompt can attach to it. */
object CurrentActivityHolder {
    var activity: FragmentActivity? = null
}

private const val AUTHENTICATORS = BiometricManager.Authenticators.BIOMETRIC_WEAK

actual class BiometricAuthenticator actual constructor() {

    actual fun canAuthenticate(): Boolean =
        BiometricManager.from(AndroidAppContext.get()).canAuthenticate(AUTHENTICATORS) ==
            BiometricManager.BIOMETRIC_SUCCESS

    actual suspend fun authenticate(title: String, subtitle: String): BiometricResult =
        suspendCancellableCoroutine { continuation ->
            val activity = CurrentActivityHolder.activity
            if (activity == null) {
                continuation.resume(BiometricResult.UNAVAILABLE)
                return@suspendCancellableCoroutine
            }

            val executor = ContextCompat.getMainExecutor(activity)
            val prompt = BiometricPrompt(
                activity,
                executor,
                object : BiometricPrompt.AuthenticationCallback() {
                    override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                        if (continuation.isActive) continuation.resume(BiometricResult.SUCCESS)
                    }

                    override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                        if (continuation.isActive) continuation.resume(BiometricResult.FAILED)
                    }
                },
            )

            val info = BiometricPrompt.PromptInfo.Builder()
                .setTitle(title)
                .setSubtitle(subtitle)
                .setNegativeButtonText("Cancel")
                .setAllowedAuthenticators(AUTHENTICATORS)
                .build()

            prompt.authenticate(info)
        }
}
