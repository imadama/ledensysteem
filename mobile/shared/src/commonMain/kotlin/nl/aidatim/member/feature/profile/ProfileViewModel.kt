package nl.aidatim.member.feature.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import nl.aidatim.member.data.profile.ProfileDto
import nl.aidatim.member.data.profile.ProfileRepository
import nl.aidatim.member.data.profile.UpdateProfileBody

data class ProfileUiState(
    val isLoading: Boolean = true,
    val error: String? = null,
    val profile: ProfileDto? = null,
    val email: String = "",
    val street: String = "",
    val postalCode: String = "",
    val city: String = "",
    val phone: String = "",
    val iban: String = "",
    val isSaving: Boolean = false,
    val saveError: String? = null,
    val saveCount: Int = 0,
) {
    val canSave: Boolean get() = email.isNotBlank() && !isSaving && !isLoading
}

/** MVVM ViewModel for viewing and editing the member profile. */
class ProfileViewModel(private val repository: ProfileRepository) : ViewModel() {

    private val _state = MutableStateFlow(ProfileUiState())
    val state: StateFlow<ProfileUiState> = _state.asStateFlow()

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            repository.load().fold(
                onSuccess = { dto ->
                    _state.update {
                        it.copy(
                            isLoading = false,
                            profile = dto,
                            email = dto.member.email ?: dto.user.email,
                            street = dto.member.street_address.orEmpty(),
                            postalCode = dto.member.postal_code.orEmpty(),
                            city = dto.member.city.orEmpty(),
                            phone = dto.member.phone.orEmpty(),
                            iban = dto.member.iban.orEmpty(),
                        )
                    }
                },
                onFailure = { e ->
                    _state.update { it.copy(isLoading = false, error = e.message ?: "Something went wrong") }
                },
            )
        }
    }

    fun onEmail(value: String) = _state.update { it.copy(email = value, saveError = null) }
    fun onStreet(value: String) = _state.update { it.copy(street = value, saveError = null) }
    fun onPostalCode(value: String) = _state.update { it.copy(postalCode = value, saveError = null) }
    fun onCity(value: String) = _state.update { it.copy(city = value, saveError = null) }
    fun onPhone(value: String) = _state.update { it.copy(phone = value, saveError = null) }
    fun onIban(value: String) = _state.update { it.copy(iban = value, saveError = null) }

    fun save() {
        val current = _state.value
        if (!current.canSave) return

        viewModelScope.launch {
            _state.update { it.copy(isSaving = true, saveError = null) }
            val body = UpdateProfileBody(
                email = current.email.trim(),
                street_address = current.street.trim().ifBlank { null },
                postal_code = current.postalCode.trim().ifBlank { null },
                city = current.city.trim().ifBlank { null },
                phone = current.phone.trim().ifBlank { null },
                iban = current.iban.trim().ifBlank { null },
            )
            repository.update(body).fold(
                onSuccess = { dto ->
                    _state.update { it.copy(isSaving = false, profile = dto, saveCount = it.saveCount + 1) }
                },
                onFailure = { e ->
                    _state.update { it.copy(isSaving = false, saveError = e.message ?: "Could not save profile") }
                },
            )
        }
    }
}
