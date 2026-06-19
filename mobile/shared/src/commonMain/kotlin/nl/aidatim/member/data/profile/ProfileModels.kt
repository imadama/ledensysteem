package nl.aidatim.member.data.profile

import kotlinx.serialization.Serializable

/** Envelope from GET/PUT /api/member/profile: { "data": { user, member, organisation } }. */
@Serializable
data class ProfileResponse(val data: ProfileDto)

@Serializable
data class ProfileDto(
    val user: ProfileUserDto,
    val member: ProfileMemberDto,
    val organisation: ProfileOrganisationDto? = null,
)

@Serializable
data class ProfileUserDto(
    val id: Int,
    val email: String,
    val status: String? = null,
)

@Serializable
data class ProfileMemberDto(
    val id: Int,
    val first_name: String? = null,
    val last_name: String? = null,
    val birth_date: String? = null,
    val street_address: String? = null,
    val postal_code: String? = null,
    val city: String? = null,
    val phone: String? = null,
    val iban: String? = null,
    val email: String? = null,
)

@Serializable
data class ProfileOrganisationDto(
    val id: Int? = null,
    val name: String? = null,
)

/** Request body for PUT /api/member/profile — only the editable fields. */
@Serializable
data class UpdateProfileBody(
    val email: String,
    val street_address: String? = null,
    val postal_code: String? = null,
    val city: String? = null,
    val phone: String? = null,
    val iban: String? = null,
)
