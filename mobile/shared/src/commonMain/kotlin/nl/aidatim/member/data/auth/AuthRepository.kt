package nl.aidatim.member.data.auth

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import nl.aidatim.member.core.security.SessionStorage

/**
 * Holds the authenticated session. The Bearer token + member profile are kept
 * in memory for the running app and persisted to secure platform storage
 * ([SessionStorage]) so the session survives an app restart.
 */
class AuthRepository(
    private val api: AuthApi,
    private val session: SessionStorage,
) {

    private val _currentUser = MutableStateFlow<UserDto?>(null)
    val currentUser: StateFlow<UserDto?> = _currentUser.asStateFlow()

    private var token: String? = null

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
    }

    fun logout() {
        token = null
        _currentUser.value = null
        session.clear()
    }

    fun authToken(): String? = token

    /**
     * Subdomain of the member's organisation, sent as the X-Organisation-Subdomain
     * header on member endpoints (the backend resolves the tenant from it).
     */
    fun organisationSubdomain(): String? = _currentUser.value?.organisation?.subdomain
}
