package nl.aidatim.member.feature.posts

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import nl.aidatim.member.data.posts.PostSummary
import nl.aidatim.member.data.posts.PostsRepository

data class PostsUiState(
    val isLoading: Boolean = true,
    val items: List<PostSummary> = emptyList(),
    val error: String? = null,
) {
    val isEmpty: Boolean get() = !isLoading && error == null && items.isEmpty()
}

/** MVVM ViewModel for the announcements feed. */
class PostsViewModel(private val repository: PostsRepository) : ViewModel() {

    private val _state = MutableStateFlow(PostsUiState())
    val state: StateFlow<PostsUiState> = _state.asStateFlow()

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            val result = repository.list()
            _state.update { state ->
                result.fold(
                    onSuccess = { items -> state.copy(isLoading = false, items = items) },
                    onFailure = { e -> state.copy(isLoading = false, error = e.message ?: "Something went wrong") },
                )
            }
        }
    }
}
