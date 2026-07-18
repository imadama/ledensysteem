package nl.aidatim.member.core.push

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import nl.aidatim.member.core.network.createHttpClient
import nl.aidatim.member.core.security.SessionStorage
import nl.aidatim.member.core.security.createSecureSettings
import nl.aidatim.member.data.device.DeviceTokenApi

// ---------------------------------------------------------------------------
// REGISTRATION step 2 (the "no screen open" path): send the FCM token to the
// backend. This is a plain function on purpose — the FirebaseMessagingService
// can fire onNewToken with no Activity/Compose around, so it CANNOT use Koin.
// It therefore reads the session straight from secure storage instead.
// ---------------------------------------------------------------------------

/**
 * Registers an FCM token with the backend using the session in secure storage.
 * Safe to call from outside the Koin/Compose graph (e.g. the Android
 * FirebaseMessagingService.onNewToken). No-op when there is no session yet —
 * AuthRepository registers the token right after the next login instead.
 */
fun registerDeviceTokenFromStorage(deviceToken: String) {
    val session = SessionStorage(createSecureSettings())
    val bearer = session.token() ?: return                 // not logged in yet -> stop, retry after login
    val subdomain = session.user()?.organisation?.subdomain // which organisation this member belongs to

    // Fire-and-forget on a background coroutine; runCatching swallows errors so a
    // failed registration never crashes anything (it just retries next time).
    CoroutineScope(SupervisorJob() + Dispatchers.Default).launch {
        runCatching { DeviceTokenApi(createHttpClient()).register(deviceToken, bearer, subdomain) }
    }
}
