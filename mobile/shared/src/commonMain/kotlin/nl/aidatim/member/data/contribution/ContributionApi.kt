package nl.aidatim.member.data.contribution

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.HttpRequestBuilder
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.http.HttpHeaders
import io.ktor.http.isSuccess
import nl.aidatim.member.core.network.ApiConfig
import nl.aidatim.member.data.auth.AuthRepository
import nl.aidatim.member.data.auth.ErrorResponse

// ---------------------------------------------------------------------------
// API layer: the ONLY place that actually does HTTP calls for contributions.
// It returns DTOs (raw backend shapes). Turning those into UI models is the
// repository's job — this class only knows "how to talk to the backend".
// ---------------------------------------------------------------------------

/** Thrown when loading contributions fails, carrying a user-facing message. */
class ContributionException(message: String) : Exception(message)

/** Talks to the member self-service contribution endpoints of the Aidatim backend. */
class ContributionApi(
    private val client: HttpClient,        // the shared Ktor HTTP client (from Koin)
    private val session: AuthRepository,   // gives us the token + organisation for the headers
) {

    // GET the full payment history for the logged-in member.
    suspend fun history(): List<ContributionRecordDto> {
        val response = client.get("${ApiConfig.BASE_URL}/api/member/contribution-history") {
            authHeaders() // attach Bearer token + organisation header
        }

        // Happy path: 2xx -> parse the JSON envelope and return the list inside "data".
        if (response.status.isSuccess()) {
            return response.body<ContributionHistoryResponse>().data
        }

        // Error path: try to read the backend's error message, else a generic one, then throw.
        val message = runCatching { response.body<ErrorResponse>().message }.getOrNull()
        throw ContributionException(message ?: "Could not load contributions (${response.status.value})")
    }

    /** The member's current contribution arrangement, or null when none is set. */
    suspend fun current(): ContributionSummaryDto? {
        val response = client.get("${ApiConfig.BASE_URL}/api/member/contribution") {
            authHeaders()
        }

        if (response.status.isSuccess()) {
            return response.body<ContributionSummaryResponse>().data
        }

        val message = runCatching { response.body<ErrorResponse>().message }.getOrNull()
        throw ContributionException(message ?: "Could not load contribution (${response.status.value})")
    }

    // Every request needs these two headers:
    //  - Authorization: Bearer <token>  -> proves who the member is (authentication)
    //  - X-Organisation-Subdomain       -> tells the backend which organisation (multi-tenant)
    private fun HttpRequestBuilder.authHeaders() {
        session.authToken()?.let { token -> header(HttpHeaders.Authorization, "Bearer $token") }
        session.organisationSubdomain()?.let { subdomain -> header("X-Organisation-Subdomain", subdomain) }
    }
}
