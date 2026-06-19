package nl.aidatim.member.data.contribution

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.http.HttpHeaders
import io.ktor.http.isSuccess
import nl.aidatim.member.core.network.ApiConfig
import nl.aidatim.member.data.auth.AuthRepository
import nl.aidatim.member.data.auth.ErrorResponse

/** Thrown when loading contributions fails, carrying a user-facing message. */
class ContributionException(message: String) : Exception(message)

/** Talks to the member self-service contribution endpoints of the Aidatim backend. */
class ContributionApi(
    private val client: HttpClient,
    private val session: AuthRepository,
) {

    suspend fun history(): List<ContributionRecordDto> {
        val response = client.get("${ApiConfig.BASE_URL}/api/member/contribution-history") {
            session.authToken()?.let { token ->
                header(HttpHeaders.Authorization, "Bearer $token")
            }
            session.organisationSubdomain()?.let { subdomain ->
                header("X-Organisation-Subdomain", subdomain)
            }
        }

        if (response.status.isSuccess()) {
            return response.body<ContributionHistoryResponse>().data
        }

        val message = runCatching { response.body<ErrorResponse>().message }.getOrNull()
        throw ContributionException(message ?: "Could not load contributions (${response.status.value})")
    }
}
