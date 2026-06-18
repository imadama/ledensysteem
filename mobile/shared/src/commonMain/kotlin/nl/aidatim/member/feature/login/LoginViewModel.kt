package nl.aidatim.member.feature.login

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import nl.aidatim.member.data.auth.AuthRepository

data class LoginUiState(
    val email: String = "",
    val password: String = "",
    val isLoading: Boolean = false,
    val error: String? = null,
    val loggedIn: Boolean = false,
) {
    val canSubmit: Boolean get() = email.isNotBlank() && password.isNotBlank() && !isLoading
}

/** MVVM ViewModel for the login screen. */
class LoginViewModel(private val repository: AuthRepository) : ViewModel() {

    private val _state = MutableStateFlow(LoginUiState())
    val state: StateFlow<LoginUiState> = _state.asStateFlow()

    fun onEmailChange(value: String) = _state.update { it.copy(email = value, error = null) }

    fun onPasswordChange(value: String) = _state.update { it.copy(password = value, error = null) }

    fun login() {
        val current = _state.value
        if (!current.canSubmit) return

        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            val result = repository.login(current.email.trim(), current.password)
            _state.update { state ->
                result.fold(
                    onSuccess = { state.copy(isLoading = false, loggedIn = true) },
                    onFailure = { e -> state.copy(isLoading = false, error = e.message ?: "Login failed") },
                )
            }
        }
    }
}
