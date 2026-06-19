package nl.aidatim.member.data.profile

/** Loads and updates the member's profile. */
class ProfileRepository(private val api: ProfileApi) {

    suspend fun load(): Result<ProfileDto> = runCatching { api.get() }

    suspend fun update(body: UpdateProfileBody): Result<ProfileDto> = runCatching { api.update(body) }
}
