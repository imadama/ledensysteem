package nl.aidatim.member.feature.posts

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import nl.aidatim.member.data.posts.PostDetail
import nl.aidatim.member.data.posts.PostsRepository

data class PostDetailUiState(
    val isLoading: Boolean = true,
    val post: PostDetail? = null,
    val error: String? = null,
    val commentDraft: String = "",
    val isSending: Boolean = false,
    val actionError: String? = null,
) {
    val canSend: Boolean get() = commentDraft.isNotBlank() && !isSending && !isLoading
}

/** MVVM ViewModel for a single announcement: shows it, toggles the like, posts comments. */
class PostDetailViewModel(
    private val repository: PostsRepository,
    private val postId: Int,
) : ViewModel() {

    private val _state = MutableStateFlow(PostDetailUiState())
    val state: StateFlow<PostDetailUiState> = _state.asStateFlow()

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            repository.detail(postId).fold(
                onSuccess = { post -> _state.update { it.copy(isLoading = false, post = post) } },
                onFailure = { e -> _state.update { it.copy(isLoading = false, error = e.message ?: "Something went wrong") } },
            )
        }
    }

    fun onDraftChange(value: String) = _state.update { it.copy(commentDraft = value, actionError = null) }

    fun toggleLike() {
        val post = _state.value.post ?: return
        viewModelScope.launch {
            repository.setLike(postId, liked = !post.likedByMe).fold(
                onSuccess = { likeState ->
                    _state.update {
                        it.copy(post = it.post?.copy(likedByMe = likeState.liked_by_me, likeCount = likeState.like_count))
                    }
                },
                onFailure = { e -> _state.update { it.copy(actionError = e.message ?: "Could not update like") } },
            )
        }
    }

    fun sendComment() {
        val current = _state.value
        if (!current.canSend) return
        viewModelScope.launch {
            _state.update { it.copy(isSending = true, actionError = null) }
            repository.addComment(postId, current.commentDraft.trim()).fold(
                onSuccess = { comment ->
                    _state.update {
                        val updated = it.post?.let { p -> p.copy(comments = p.comments + comment) }
                        it.copy(isSending = false, commentDraft = "", post = updated)
                    }
                },
                onFailure = { e -> _state.update { it.copy(isSending = false, actionError = e.message ?: "Could not post comment") } },
            )
        }
    }
}
