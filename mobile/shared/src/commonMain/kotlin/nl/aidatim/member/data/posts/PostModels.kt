package nl.aidatim.member.data.posts

import kotlinx.serialization.Serializable

// ── Wire DTOs (match the Laravel member post endpoints) ──

@Serializable
data class PostListResponse(val data: List<PostSummaryDto> = emptyList())

@Serializable
data class PostSummaryDto(
    val id: Int,
    val title: String,
    val excerpt: String? = null,
    val published_at: String? = null,
    val comment_count: Int = 0,
    val like_count: Int = 0,
    val liked_by_me: Boolean = false,
)

@Serializable
data class PostDetailResponse(val data: PostDetailDto)

@Serializable
data class PostDetailDto(
    val id: Int,
    val title: String,
    val body: String,
    val published_at: String? = null,
    val comment_count: Int = 0,
    val like_count: Int = 0,
    val liked_by_me: Boolean = false,
    val comments: List<CommentDto> = emptyList(),
)

@Serializable
data class CommentDto(
    val id: Int,
    val body: String,
    val author: String? = null,
    val created_at: String? = null,
)

@Serializable
data class CommentResponse(val data: CommentDto)

@Serializable
data class LikeResponse(val data: LikeStateDto)

@Serializable
data class LikeStateDto(
    val liked_by_me: Boolean = false,
    val like_count: Int = 0,
)

@Serializable
data class CommentBody(val body: String)

// ── Domain models (formatted for the UI) ──

data class PostSummary(
    val id: Int,
    val title: String,
    val excerpt: String,
    val dateLabel: String,
    val commentCount: Int,
    val likeCount: Int,
    val likedByMe: Boolean,
)

data class PostComment(
    val id: Int,
    val body: String,
    val author: String,
    val dateLabel: String,
)

data class PostDetail(
    val id: Int,
    val title: String,
    val body: String,
    val dateLabel: String,
    val likeCount: Int,
    val likedByMe: Boolean,
    val comments: List<PostComment>,
)
