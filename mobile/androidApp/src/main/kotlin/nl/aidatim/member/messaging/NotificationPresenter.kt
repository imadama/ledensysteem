package nl.aidatim.member.messaging

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import nl.aidatim.member.R

// ---------------------------------------------------------------------------
// DELIVERY step 6 (last step): actually draws the notification in the status bar.
// A "channel" is Android's grouping for notifications (required since Android 8);
// the user can mute a whole channel in system settings.
// ---------------------------------------------------------------------------

/** Creates the notification channel and posts announcement notifications. */
object NotificationPresenter {

    const val CHANNEL_ID = "org_posts" // one channel for all announcement pushes

    // Android 8+ requires a channel before you can post a notification.
    fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Announcements",                         // name the user sees in settings
                NotificationManager.IMPORTANCE_DEFAULT,  // default = shows in the tray
            )
            context.getSystemService(NotificationManager::class.java)?.createNotificationChannel(channel)
        }
    }

    fun show(context: Context, title: String, body: String) {
        ensureChannel(context)

        // Build the notification: icon + the post's title and (trimmed) body.
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)                 // tapping it removes it
            .build()

        val manager = NotificationManagerCompat.from(context)
        // Respect the user's choice: if they revoked the POST_NOTIFICATIONS
        // permission (Android 13+), we simply don't post anything.
        if (manager.areNotificationsEnabled()) {
            manager.notify(title.hashCode(), notification) // id = title hash (dedupes same title)
        }
    }
}
