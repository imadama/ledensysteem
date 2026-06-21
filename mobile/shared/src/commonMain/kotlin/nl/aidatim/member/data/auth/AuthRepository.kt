package nl.aidatim.member.data.auth

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import nl.aidatim.member.core.push.PushTokenProvider
import nl.aidatim.member.core.security.SessionStorage
import nl.aidatim.member.data.device.DeviceTokenApi

/** Result of checking a restored token against the backend. */
enum class SessionStatus { VALID, INVALID, INCONCLUSIVE }

/**
 * Holds the authenticated session. The Bearer token + member profile are kept
 * in memory for the running app and persisted to secure platform storage
 * ([SessionStorage]) so the session survives an app restart.
 */
class AuthRepository(
    private val api: AuthApi,
    private val session: SessionStorage,
    private val deviceTokens: DeviceTokenApi? = null,
    private val pushTokens: PushTokenProvider? = null,
) {

    private val _currentUser = MutableStateFlow<UserDto?>(null)
    val currentUser: StateFlow<UserDto?> = _currentUser.asStateFlow()

    private var token: String? = null

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    val isLoggedIn: Boolean get() = token != null

    init {
        restoreFromStorage()
    }

    /** Re-hydrate an existing session from secure storage on startup. */
    private fun restoreFromStorage() {
        val savedToken = session.token() ?: return
        token = savedToken
        _currentUser.value = session.user()
    }

    suspend fun login(email: String, password: String): Result<Unit> = runCatching {
        val response = api.login(email, password)
        token = response.token
        _currentUser.value = response.user
        session.save(response.token, response.user)
        registerPushToken(response.token, response.user.organisation?.subdomain)
    }

    fun logout() {
        val current = token
        val subdomain = organisationSubdomain()
        token = null
        _currentUser.value = null
        session.clear()
        // Best-effort: revoke the token + unregister push, without blocking the UI.
        if (current != null) {
            scope.launch { runCatching { api.logout(current) } }
            unregisterPushToken(current, subdomain)
        }
    }

    /** Best-effort: register this device's push token with the backend after login. */
    private fun registerPushToken(bearer: String, subdomain: String?) {
        val api = deviceTokens ?: return
        val provider = pushTokens ?: return
        scope.launch {
            runCatching { provider.currentToken()?.let { api.register(it, bearer, subdomain) } }
        }
    }

    private fun unregisterPushToken(bearer: String, subdomain: String?) {
        val api = deviceTokens ?: return
        val provider = pushTokens ?: return
        scope.launch {
            runCatching { provider.currentToken()?.let { api.unregister(it, bearer, subdomain) } }
        }
    }

    /**
     * Confirms the restored token is still accepted by the backend.
     * - [SessionStatus.VALID]: token works; the stored profile is refreshed.
     * - [SessionStatus.INVALID]: backend returned 401; the session is cleared.
     * - [SessionStatus.INCONCLUSIVE]: network error — keep the session (offline-tolerant).
     */
    suspend fun validateSession(): SessionStatus {
        val current = token ?: return SessionStatus.INVALID
        return try {
            val user = api.me(current)
            _currentUser.value = user
            session.save(current, user)
            SessionStatus.VALID
        } catch (e: UnauthorizedException) {
            logout()
            SessionStatus.INVALID
        } catch (e: Exception) {
            SessionStatus.INCONCLUSIVE
        }
    }

    fun authToken(): String? = token

    /**
     * Subdomain of the member's organisation, sent as the X-Organisation-Subdomain
     * header on member endpoints (the backend resolves the tenant from it).
     */
    fun organisationSubdomain(): String? = _currentUser.value?.organisation?.subdomain
}
