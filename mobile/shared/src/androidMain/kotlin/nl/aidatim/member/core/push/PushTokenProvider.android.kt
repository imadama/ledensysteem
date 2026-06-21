package nl.aidatim.member.core.push

import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

actual class PushTokenProvider actual constructor() {

    actual suspend fun currentToken(): String? = suspendCancellableCoroutine { continuation ->
        try {
            FirebaseMessaging.getInstance().token
                .addOnSuccessListener { token -> if (continuation.isActive) continuation.resume(token) }
                .addOnFailureListener { if (continuation.isActive) continuation.resume(null) }
        } catch (t: Throwable) {
            // Firebase not initialised (no google-services.json) — push simply unavailable.
            if (continuation.isActive) continuation.resume(null)
        }
    }
}
