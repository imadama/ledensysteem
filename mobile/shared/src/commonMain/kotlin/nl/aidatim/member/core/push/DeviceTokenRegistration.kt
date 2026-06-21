package nl.aidatim.member.core.push

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import nl.aidatim.member.core.network.createHttpClient
import nl.aidatim.member.core.security.SessionStorage
import nl.aidatim.member.core.security.createSecureSettings
import nl.aidatim.member.data.device.DeviceTokenApi

/**
 * Registers an FCM token with the backend using the session in secure storage.
 * Safe to call from outside the Koin/Compose graph (e.g. the Android
 * FirebaseMessagingService.onNewToken). No-op when there is no session yet —
 * AuthRepository registers the token right after the next login instead.
 */
fun registerDeviceTokenFromStorage(deviceToken: String) {
    val session = SessionStorage(createSecureSettings())
    val bearer = session.token() ?: return
    val subdomain = session.user()?.organisation?.subdomain

    CoroutineScope(SupervisorJob() + Dispatchers.Default).launch {
        runCatching { DeviceTokenApi(createHttpClient()).register(deviceToken, bearer, subdomain) }
    }
}
