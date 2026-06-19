package nl.aidatim.member.core.biometric

import kotlinx.cinterop.ExperimentalForeignApi
import kotlinx.coroutines.suspendCancellableCoroutine
import platform.LocalAuthentication.LAContext
import platform.LocalAuthentication.LAPolicyDeviceOwnerAuthenticationWithBiometrics
import kotlin.coroutines.resume

@OptIn(ExperimentalForeignApi::class)
actual class BiometricAuthenticator actual constructor() {

    actual fun canAuthenticate(): Boolean =
        LAContext().canEvaluatePolicy(LAPolicyDeviceOwnerAuthenticationWithBiometrics, null)

    actual suspend fun authenticate(title: String, subtitle: String): BiometricResult =
        suspendCancellableCoroutine { continuation ->
            val context = LAContext()
            if (!context.canEvaluatePolicy(LAPolicyDeviceOwnerAuthenticationWithBiometrics, null)) {
                continuation.resume(BiometricResult.UNAVAILABLE)
                return@suspendCancellableCoroutine
            }
            context.evaluatePolicy(
                policy = LAPolicyDeviceOwnerAuthenticationWithBiometrics,
                localizedReason = subtitle,
            ) { success, _ ->
                if (continuation.isActive) {
                    continuation.resume(if (success) BiometricResult.SUCCESS else BiometricResult.FAILED)
                }
            }
        }
}
