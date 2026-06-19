package nl.aidatim.member.data.auth

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.contentType
import io.ktor.http.isSuccess
import nl.aidatim.member.core.network.ApiConfig

/** Thrown when authentication fails, carrying a user-facing message. */
class AuthException(message: String) : Exception(message)

/** Thrown when the backend rejects the token (HTTP 401) — the session is no longer valid. */
class UnauthorizedException : Exception("Unauthorized")

/** Talks to the authentication endpoints of the Aidatim backend. */
class AuthApi(private val client: HttpClient) {

    suspend fun login(email: String, password: String): TokenResponse {
        val response = client.post("${ApiConfig.BASE_URL}/api/auth/token") {
            contentType(ContentType.Application.Json)
            setBody(TokenRequest(email = email, password = password, device_name = "mobile"))
        }

        if (response.status.isSuccess()) {
            return response.body()
        }

        val message = runCatching { response.body<ErrorResponse>().message }.getOrNull()
        throw AuthException(message ?: "Login failed (${response.status.value})")
    }

    /**
     * Fetches the current user for the given token. Throws [UnauthorizedException]
     * on HTTP 401 so callers can distinguish an invalid/expired token from a
     * transient network error.
     */
    suspend fun me(token: String): UserDto {
        val response = client.get("${ApiConfig.BASE_URL}/api/auth/me") {
            header(HttpHeaders.Authorization, "Bearer $token")
        }

        if (response.status == HttpStatusCode.Unauthorized) throw UnauthorizedException()
        if (response.status.isSuccess()) return response.body()

        throw AuthException("Session check failed (${response.status.value})")
    }
}
