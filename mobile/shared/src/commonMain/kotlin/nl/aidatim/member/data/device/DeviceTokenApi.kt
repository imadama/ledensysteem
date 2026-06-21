package nl.aidatim.member.data.device

import io.ktor.client.HttpClient
import io.ktor.client.request.delete
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.contentType
import kotlinx.serialization.Serializable
import nl.aidatim.member.core.network.ApiConfig

@Serializable
data class DeviceTokenBody(val token: String, val platform: String = "android")

/**
 * Registers/unregisters the device's push token with the backend. The bearer
 * token and organisation subdomain are passed in explicitly so this stays
 * decoupled from AuthRepository (avoids a DI cycle) and is usable from the
 * Android FirebaseMessagingService too.
 */
class DeviceTokenApi(private val client: HttpClient) {

    suspend fun register(deviceToken: String, bearer: String, subdomain: String?) {
        client.post("${ApiConfig.BASE_URL}/api/member/device-tokens") {
            authHeaders(bearer, subdomain)
            contentType(ContentType.Application.Json)
            setBody(DeviceTokenBody(deviceToken))
        }
    }

    suspend fun unregister(deviceToken: String, bearer: String, subdomain: String?) {
        client.delete("${ApiConfig.BASE_URL}/api/member/device-tokens") {
            authHeaders(bearer, subdomain)
            contentType(ContentType.Application.Json)
            setBody(DeviceTokenBody(deviceToken))
        }
    }

    private fun io.ktor.client.request.HttpRequestBuilder.authHeaders(bearer: String, subdomain: String?) {
        header(HttpHeaders.Authorization, "Bearer $bearer")
        subdomain?.let { header("X-Organisation-Subdomain", it) }
    }
}
