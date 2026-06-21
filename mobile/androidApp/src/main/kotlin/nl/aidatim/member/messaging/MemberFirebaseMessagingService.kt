package nl.aidatim.member.messaging

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import nl.aidatim.member.core.push.registerDeviceTokenFromStorage

/** Receives FCM tokens and messages for the member app. */
class MemberFirebaseMessagingService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        registerDeviceTokenFromStorage(token)
    }

    override fun onMessageReceived(message: RemoteMessage) {
        // Render in-app too: the OS only auto-shows notification payloads when backgrounded.
        val title = message.notification?.title ?: message.data["title"] ?: "Aidatim"
        val body = message.notification?.body ?: message.data["body"] ?: ""
        NotificationPresenter.show(applicationContext, title, body)
    }
}
