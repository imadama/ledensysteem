package nl.aidatim.member.data.auth

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.http.isSuccess
import nl.aidatim.member.core.network.ApiConfig

/** Thrown when authentication fails, carrying a user-facing message. */
class AuthException(message: String) : Exception(message)

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
}
