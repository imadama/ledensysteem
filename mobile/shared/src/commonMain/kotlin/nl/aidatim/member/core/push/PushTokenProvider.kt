package nl.aidatim.member.core.push

/**
 * Supplies the platform push token. Android returns the FCM token (or null when
 * Firebase is not configured); iOS returns null until APNs is added.
 */
expect class PushTokenProvider() {
    suspend fun currentToken(): String?
}
