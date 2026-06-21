package nl.aidatim.member.core.push

actual class PushTokenProvider actual constructor() {

    // iOS push (APNs) is not wired yet — no token to report.
    actual suspend fun currentToken(): String? = null
}
