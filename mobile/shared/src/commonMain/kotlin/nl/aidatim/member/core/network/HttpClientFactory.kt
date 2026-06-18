package nl.aidatim.member.core.network

import io.ktor.client.HttpClient
import io.ktor.client.engine.HttpClientEngine
import io.ktor.client.plugins.DefaultRequest
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.plugins.logging.LogLevel
import io.ktor.client.plugins.logging.Logging
import io.ktor.client.request.header
import io.ktor.http.HttpHeaders
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.json.Json

/** Each platform supplies its own engine (OkHttp on Android, Darwin on iOS). */
expect fun httpClientEngine(): HttpClientEngine

/** Builds a configured Ktor client shared across all platforms. */
fun createHttpClient(): HttpClient = HttpClient(httpClientEngine()) {
    install(ContentNegotiation) {
        json(
            Json {
                ignoreUnknownKeys = true
                isLenient = true
            }
        )
    }
    install(Logging) {
        level = LogLevel.INFO
    }
    install(DefaultRequest) {
        header(HttpHeaders.Accept, "application/json")
    }
}
