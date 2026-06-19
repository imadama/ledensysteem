package nl.aidatim.member.feature.contribution

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import nl.aidatim.member.data.contribution.ContributionItem
import nl.aidatim.member.data.contribution.ContributionRepository

data class ContributionUiState(
    val isLoading: Boolean = true,
    val items: List<ContributionItem> = emptyList(),
    val error: String? = null,
) {
    /** True when the load succeeded but there are no records to show. */
    val isEmpty: Boolean get() = !isLoading && error == null && items.isEmpty()
}

/** MVVM ViewModel for the contribution history screen. */
class ContributionViewModel(private val repository: ContributionRepository) : ViewModel() {

    private val _state = MutableStateFlow(ContributionUiState())
    val state: StateFlow<ContributionUiState> = _state.asStateFlow()

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            val result = repository.history()
            _state.update { state ->
                result.fold(
                    onSuccess = { items -> state.copy(isLoading = false, items = items) },
                    onFailure = { e -> state.copy(isLoading = false, error = e.message ?: "Something went wrong") },
                )
            }
        }
    }
}
