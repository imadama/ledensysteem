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

// ---------------------------------------------------------------------------
// VIEWMODEL layer (the "VM" in MVVM): holds the screen state and the logic.
// The screen only reads `state` and calls functions like load(); it never
// touches the network itself. That separation is what makes MVVM testable.
// ---------------------------------------------------------------------------

// One immutable object describing EVERYTHING the screen needs to draw itself.
data class ContributionUiState(
    val isLoading: Boolean = true,                 // show a spinner
    val items: List<ContributionItem> = emptyList(), // the rows to show
    val error: String? = null,                     // non-null -> show an error + Retry
) {
    /** True when the load succeeded but there are no records to show. */
    // Derived state: the screen doesn't have to compute "empty" itself.
    val isEmpty: Boolean get() = !isLoading && error == null && items.isEmpty()
}

/** MVVM ViewModel for the contribution history screen. */
class ContributionViewModel(private val repository: ContributionRepository) : ViewModel() {

    // _state is PRIVATE and mutable: only this ViewModel may change it.
    private val _state = MutableStateFlow(ContributionUiState())
    // state is PUBLIC and read-only: the screen observes this (one-way data flow).
    val state: StateFlow<ContributionUiState> = _state.asStateFlow()

    // Load immediately when the screen creates this ViewModel.
    init {
        load()
    }

    fun load() {
        // viewModelScope = a coroutine tied to this screen; auto-cancels when it leaves.
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) } // 1. show spinner
            val result = repository.history()                          // 2. suspend call
            _state.update { state ->
                // 3. one success/failure switch produces the next state.
                result.fold(
                    onSuccess = { items -> state.copy(isLoading = false, items = items) },
                    onFailure = { e -> state.copy(isLoading = false, error = e.message ?: "Something went wrong") },
                )
            }
        }
    }
}
