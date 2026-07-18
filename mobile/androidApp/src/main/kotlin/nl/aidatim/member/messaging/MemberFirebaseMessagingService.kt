package nl.aidatim.member.messaging

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import nl.aidatim.member.core.push.registerDeviceTokenFromStorage

// ---------------------------------------------------------------------------
// The entry point for everything Firebase pushes to this device. Android starts
// this service automatically (it is registered in AndroidManifest.xml). Two jobs:
//   - onNewToken       -> REGISTRATION: the device got a (new) FCM token.
//   - onMessageReceived -> DELIVERY step 5: a push arrived, show it.
// ---------------------------------------------------------------------------

/** Receives FCM tokens and messages for the member app. */
class MemberFirebaseMessagingService : FirebaseMessagingService() {

    // REGISTRATION: Firebase can hand us a new token at any time (fresh install,
    // app data cleared, token rotated). Send it straight to the backend so it
    // keeps knowing where to deliver. Runs even without an open screen.
    override fun onNewToken(token: String) {
        registerDeviceTokenFromStorage(token)
    }

    // DELIVERY step 5: a notification arrived from FCM.
    override fun onMessageReceived(message: RemoteMessage) {
        // We draw it ourselves. The OS only auto-shows a "notification" payload
        // when the app is in the background; when it is open, only this callback
        // fires — so rendering here covers both cases.
        val title = message.notification?.title ?: message.data["title"] ?: "Aidatim"
        val body = message.notification?.body ?: message.data["body"] ?: ""
        NotificationPresenter.show(applicationContext, title, body) // -> DELIVERY step 6
    }
}
