package nl.aidatim.member.data.auth

import kotlinx.serialization.Serializable

/** Request body for POST /api/auth/token. Field names match the Laravel API. */
@Serializable
data class TokenRequest(
    val email: String,
    val password: String,
    val device_name: String? = null,
)

/** Successful response from POST /api/auth/token. */
@Serializable
data class TokenResponse(
    val token: String,
    val token_type: String,
    val user: UserDto,
)

@Serializable
data class UserDto(
    val id: Int,
    val first_name: String? = null,
    val last_name: String? = null,
    val name: String? = null,
    val email: String,
    val status: String? = null,
    val roles: List<String> = emptyList(),
    val organisation: OrganisationDto? = null,
)

@Serializable
data class OrganisationDto(
    val id: Int,
    val name: String? = null,
    val subdomain: String? = null,
    val status: String? = null,
)

/** Laravel validation/error envelope. */
@Serializable
data class ErrorResponse(
    val message: String? = null,
)
