package nl.aidatim.member.di

import nl.aidatim.member.core.network.createHttpClient
import nl.aidatim.member.data.auth.AuthApi
import nl.aidatim.member.data.auth.AuthRepository
import org.koin.dsl.module

/** Koin dependency graph for the app. */
val appModule = module {
    single { createHttpClient() }
    single { AuthApi(get()) }
    single { AuthRepository(get()) }
}
