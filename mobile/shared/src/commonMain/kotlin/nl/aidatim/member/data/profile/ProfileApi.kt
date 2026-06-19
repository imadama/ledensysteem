package nl.aidatim.member.data.profile

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.HttpRequestBuilder
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.put
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.contentType
import io.ktor.http.isSuccess
import nl.aidatim.member.core.network.ApiConfig
import nl.aidatim.member.data.auth.AuthRepository
import nl.aidatim.member.data.auth.ErrorResponse

/** Thrown when loading or saving the profile fails, carrying a user-facing message. */
class ProfileException(message: String) : Exception(message)

/** Talks to the member self-service profile endpoints of the Aidatim backend. */
class ProfileApi(
    private val client: HttpClient,
    private val session: AuthRepository,
) {

    suspend fun get(): ProfileDto {
        val response = client.get("${ApiConfig.BASE_URL}/api/member/profile") { authHeaders() }
        if (response.status.isSuccess()) return response.body<ProfileResponse>().data
        throw ProfileException(errorMessage(response) ?: "Could not load profile (${response.status.value})")
    }

    suspend fun update(body: UpdateProfileBody): ProfileDto {
        val response = client.put("${ApiConfig.BASE_URL}/api/member/profile") {
            authHeaders()
            contentType(ContentType.Application.Json)
            setBody(body)
        }
        if (response.status.isSuccess()) return response.body<ProfileResponse>().data
        throw ProfileException(errorMessage(response) ?: "Could not save profile (${response.status.value})")
    }

    private fun HttpRequestBuilder.authHeaders() {
        session.authToken()?.let { token -> header(HttpHeaders.Authorization, "Bearer $token") }
        session.organisationSubdomain()?.let { subdomain -> header("X-Organisation-Subdomain", subdomain) }
    }

    private suspend fun errorMessage(response: io.ktor.client.statement.HttpResponse): String? =
        runCatching { response.body<ErrorResponse>().message }.getOrNull()
}
