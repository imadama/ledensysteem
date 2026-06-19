package nl.aidatim.member.data.auth

import com.russhwolf.settings.MapSettings
import io.ktor.client.HttpClient
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.respond
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.headersOf
import io.ktor.serialization.kotlinx.json.json
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.Json
import nl.aidatim.member.core.security.SessionStorage
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

/**
 * Verifies how AuthRepository reacts when an existing (restored) session is
 * checked against the backend — covering US-02 acceptance criterion 3
 * (an expired/invalid token must end the session).
 */
class AuthRepositoryTest {

    private val sampleUser = UserDto(
        id = 1,
        email = "imad@aidatim.nl",
        name = "Imad",
        organisation = OrganisationDto(id = 1, name = "HDV", subdomain = "hdv"),
    )

    private fun storedSession(): SessionStorage =
        SessionStorage(MapSettings()).apply { save("token-123", sampleUser) }

    private fun clientReturning(status: HttpStatusCode, body: String): HttpClient {
        val engine = MockEngine {
            respond(
                content = body,
                status = status,
                headers = headersOf(HttpHeaders.ContentType, "application/json"),
            )
        }
        return HttpClient(engine) {
            install(ContentNegotiation) { json(Json { ignoreUnknownKeys = true }) }
        }
    }

    private fun clientThrowing(): HttpClient {
        val engine = MockEngine { throw RuntimeException("network down") }
        return HttpClient(engine) {
            install(ContentNegotiation) { json(Json { ignoreUnknownKeys = true }) }
        }
    }

    @Test
    fun validateSession_clears_session_on_401() = runTest {
        val storage = storedSession()
        val repository = AuthRepository(
            AuthApi(clientReturning(HttpStatusCode.Unauthorized, """{"message":"Unauthenticated."}""")),
            storage,
        )
        assertTrue(repository.isLoggedIn, "session should be restored from storage on init")

        val status = repository.validateSession()

        assertEquals(SessionStatus.INVALID, status)
        assertFalse(repository.isLoggedIn, "an invalid token must end the in-memory session")
        assertFalse(storage.hasSession(), "an invalid token must be wiped from secure storage")
    }

    @Test
    fun validateSession_keeps_and_refreshes_session_on_200() = runTest {
        val storage = storedSession()
        val body = """{"id":1,"email":"imad@aidatim.nl","name":"Imad Updated",""" +
            """"organisation":{"id":1,"name":"HDV","subdomain":"hdv"}}"""
        val repository = AuthRepository(AuthApi(clientReturning(HttpStatusCode.OK, body)), storage)

        val status = repository.validateSession()

        assertEquals(SessionStatus.VALID, status)
        assertTrue(repository.isLoggedIn)
        assertEquals("Imad Updated", repository.currentUser.value?.name, "profile should be refreshed")
    }

    @Test
    fun validateSession_keeps_session_on_network_error() = runTest {
        val storage = storedSession()
        val repository = AuthRepository(AuthApi(clientThrowing()), storage)

        val status = repository.validateSession()

        assertEquals(SessionStatus.INCONCLUSIVE, status)
        assertTrue(repository.isLoggedIn, "a transient network error must not log the user out")
    }
}
