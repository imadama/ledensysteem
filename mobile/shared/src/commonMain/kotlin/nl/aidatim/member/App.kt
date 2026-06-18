package nl.aidatim.member

import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import nl.aidatim.member.di.appModule
import nl.aidatim.member.navigation.AppNavHost
import org.koin.compose.KoinApplication

@Composable
fun App() {
    KoinApplication(application = { modules(appModule) }) {
        MaterialTheme {
            AppNavHost()
        }
    }
}
