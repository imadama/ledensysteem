package nl.aidatim.member.data.auth

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Holds the authenticated session. For this PoC slice the Bearer token is kept
 * in memory; persistent (secure) storage is added with the biometric unlock story.
 */
class AuthRepository(private val api: AuthApi) {

    private val _currentUser = MutableStateFlow<UserDto?>(null)
    val currentUser: StateFlow<UserDto?> = _currentUser.asStateFlow()

    private var token: String? = null

    val isLoggedIn: Boolean get() = token != null

    suspend fun login(email: String, password: String): Result<Unit> = runCatching {
        val response = api.login(email, password)
        token = response.token
        _currentUser.value = response.user
    }

    fun logout() {
        token = null
        _currentUser.value = null
    }

    fun authToken(): String? = token

    /**
     * Subdomain of the member's organisation, sent as the X-Organisation-Subdomain
     * header on member endpoints (the backend resolves the tenant from it).
     */
    fun organisationSubdomain(): String? = _currentUser.value?.organisation?.subdomain
}
