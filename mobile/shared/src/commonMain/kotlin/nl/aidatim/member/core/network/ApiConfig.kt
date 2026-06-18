package nl.aidatim.member.core.network

/**
 * Central configuration for the backend the app talks to.
 *
 * Points at the existing Aidatim Laravel backend. Because this is a public
 * domain, both the Android emulator and the iOS simulator can reach it directly.
 */
object ApiConfig {
    const val BASE_URL: String = "https://api.aidatim.nl"
}
