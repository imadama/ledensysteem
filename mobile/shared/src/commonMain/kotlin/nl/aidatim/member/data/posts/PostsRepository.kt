package nl.aidatim.member.data.posts

/** Loads the member's announcement feed and handles comments + likes. */
class PostsRepository(private val api: PostsApi) {

    suspend fun list(): Result<List<PostSummary>> = runCatching {
        api.list().map { it.toSummary() }
    }

    suspend fun detail(id: Int): Result<PostDetail> = runCatching {
        api.detail(id).toDetail()
    }

    suspend fun addComment(id: Int, body: String): Result<PostComment> = runCatching {
        api.addComment(id, body).toComment()
    }

    /** Returns the new like state (liked + count). */
    suspend fun setLike(id: Int, liked: Boolean): Result<LikeStateDto> = runCatching {
        if (liked) api.like(id) else api.unlike(id)
    }
}

private fun PostSummaryDto.toSummary() = PostSummary(
    id = id,
    title = title,
    excerpt = excerpt?.takeIf { it.isNotBlank() } ?: "",
    dateLabel = formatDate(published_at),
    commentCount = comment_count,
    likeCount = like_count,
    likedByMe = liked_by_me,
)

private fun PostDetailDto.toDetail() = PostDetail(
    id = id,
    title = title,
    body = body,
    dateLabel = formatDate(published_at),
    likeCount = like_count,
    likedByMe = liked_by_me,
    comments = comments.map { it.toComment() },
)

private fun CommentDto.toComment() = PostComment(
    id = id,
    body = body,
    author = author?.takeIf { it.isNotBlank() } ?: "Member",
    dateLabel = formatDate(created_at),
)

/** Formats an ISO timestamp ("2026-06-21T12:00:00+00:00") into "21 June 2026". */
private fun formatDate(iso: String?): String {
    if (iso.isNullOrBlank()) return ""
    val datePart = iso.substringBefore('T')
    val parts = datePart.split("-")
    val year = parts.getOrNull(0)
    val month = parts.getOrNull(1)?.toIntOrNull()
    val day = parts.getOrNull(2)?.toIntOrNull()
    val name = month?.let { MONTHS.getOrNull(it - 1) }
    return if (year != null && name != null && day != null) "$day $name $year" else datePart
}

private val MONTHS = listOf(
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
)
