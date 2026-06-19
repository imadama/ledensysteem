package nl.aidatim.member.di

import nl.aidatim.member.core.biometric.BiometricAuthenticator
import nl.aidatim.member.core.network.createHttpClient
import nl.aidatim.member.core.security.SessionStorage
import nl.aidatim.member.core.security.createSecureSettings
import nl.aidatim.member.data.auth.AuthApi
import nl.aidatim.member.data.auth.AuthRepository
import nl.aidatim.member.data.contribution.ContributionApi
import nl.aidatim.member.data.contribution.ContributionRepository
import org.koin.dsl.module

/** Koin dependency graph for the app. */
val appModule = module {
    single { createHttpClient() }
    single { SessionStorage(createSecureSettings()) }
    single { BiometricAuthenticator() }
    single { AuthApi(get()) }
    single { AuthRepository(get(), get()) }
    single { ContributionApi(get(), get()) }
    single { ContributionRepository(get()) }
}
