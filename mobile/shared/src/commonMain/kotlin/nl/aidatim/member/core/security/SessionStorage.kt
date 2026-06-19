package nl.aidatim.member.core.security

import com.russhwolf.settings.Settings
import kotlinx.serialization.json.Json
import nl.aidatim.member.data.auth.UserDto

/**
 * Persists the authenticated session (Bearer token + member profile) in
 * platform-secure storage: Android Keystore-backed EncryptedSharedPreferences,
 * iOS Keychain. The concrete [Settings] is supplied per platform via
 * [createSecureSettings].
 */
class SessionStorage(private val settings: Settings) {

    fun save(token: String, user: UserDto) {
        settings.putString(KEY_TOKEN, token)
        settings.putString(KEY_USER, json.encodeToString(UserDto.serializer(), user))
    }

    fun token(): String? = settings.getStringOrNull(KEY_TOKEN)

    fun user(): UserDto? = settings.getStringOrNull(KEY_USER)?.let { raw ->
        runCatching { json.decodeFromString(UserDto.serializer(), raw) }.getOrNull()
    }

    fun hasSession(): Boolean = token() != null

    fun clear() {
        settings.remove(KEY_TOKEN)
        settings.remove(KEY_USER)
    }

    private companion object {
        const val KEY_TOKEN = "auth_token"
        const val KEY_USER = "auth_user"
        val json = Json { ignoreUnknownKeys = true }
    }
}

/** Builds a platform-secure [Settings] instance (Keychain on iOS, encrypted prefs on Android). */
expect fun createSecureSettings(): Settings
