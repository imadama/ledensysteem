package nl.aidatim.member.core.push

import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

// ---------------------------------------------------------------------------
// REGISTRATION step 1: the Android implementation of PushTokenProvider.
// Asks Firebase for THIS device's unique FCM token — the "address" the backend
// later sends notifications to. (The iOS `actual` just returns null: no push.)
// ---------------------------------------------------------------------------

actual class PushTokenProvider actual constructor() {

    // FirebaseMessaging returns the token via a callback; suspendCancellableCoroutine
    // turns that callback API into a clean suspend function we can await.
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
