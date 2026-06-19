package nl.aidatim.member.feature.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import nl.aidatim.member.data.contribution.ContributionRepository
import nl.aidatim.member.data.contribution.ContributionSummary

data class DashboardUiState(
    val isLoading: Boolean = true,
    val contribution: ContributionSummary? = null,
)

/** Loads the member's current contribution summary for the dashboard. */
class DashboardViewModel(private val repository: ContributionRepository) : ViewModel() {

    private val _state = MutableStateFlow(DashboardUiState())
    val state: StateFlow<DashboardUiState> = _state.asStateFlow()

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            val result = repository.currentContribution()
            _state.update { it.copy(isLoading = false, contribution = result.getOrNull()) }
        }
    }
}
