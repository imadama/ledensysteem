package nl.aidatim.member.data.posts

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.HttpRequestBuilder
import io.ktor.client.request.delete
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.HttpResponse
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.contentType
import io.ktor.http.isSuccess
import nl.aidatim.member.core.network.ApiConfig
import nl.aidatim.member.data.auth.AuthRepository
import nl.aidatim.member.data.auth.ErrorResponse

/** Thrown when a posts request fails, carrying a user-facing message. */
class PostException(message: String) : Exception(message)

/** Talks to the member posts/announcements endpoints of the Aidatim backend. */
class PostsApi(
    private val client: HttpClient,
    private val session: AuthRepository,
) {

    suspend fun list(): List<PostSummaryDto> {
        val response = client.get("${ApiConfig.BASE_URL}/api/member/posts") { authHeaders() }
        if (response.status.isSuccess()) return response.body<PostListResponse>().data
        throw PostException(errorMessage(response) ?: "Could not load posts (${response.status.value})")
    }

    suspend fun detail(id: Int): PostDetailDto {
        val response = client.get("${ApiConfig.BASE_URL}/api/member/posts/$id") { authHeaders() }
        if (response.status.isSuccess()) return response.body<PostDetailResponse>().data
        throw PostException(errorMessage(response) ?: "Could not load post (${response.status.value})")
    }

    suspend fun addComment(id: Int, body: String): CommentDto {
        val response = client.post("${ApiConfig.BASE_URL}/api/member/posts/$id/comments") {
            authHeaders()
            contentType(ContentType.Application.Json)
            setBody(CommentBody(body))
        }
        if (response.status.isSuccess()) return response.body<CommentResponse>().data
        throw PostException(errorMessage(response) ?: "Could not post comment (${response.status.value})")
    }

    suspend fun like(id: Int): LikeStateDto = toggleLike(id, liked = true)

    suspend fun unlike(id: Int): LikeStateDto = toggleLike(id, liked = false)

    private suspend fun toggleLike(id: Int, liked: Boolean): LikeStateDto {
        val url = "${ApiConfig.BASE_URL}/api/member/posts/$id/like"
        val response = if (liked) {
            client.post(url) { authHeaders() }
        } else {
            client.delete(url) { authHeaders() }
        }
        if (response.status.isSuccess()) return response.body<LikeResponse>().data
        throw PostException(errorMessage(response) ?: "Could not update like (${response.status.value})")
    }

    private fun HttpRequestBuilder.authHeaders() {
        session.authToken()?.let { token -> header(HttpHeaders.Authorization, "Bearer $token") }
        session.organisationSubdomain()?.let { subdomain -> header("X-Organisation-Subdomain", subdomain) }
    }

    private suspend fun errorMessage(response: HttpResponse): String? =
        runCatching { response.body<ErrorResponse>().message }.getOrNull()
}
