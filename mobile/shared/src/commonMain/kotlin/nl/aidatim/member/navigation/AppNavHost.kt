package nl.aidatim.member.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import kotlinx.serialization.Serializable
import nl.aidatim.member.data.auth.AuthRepository
import nl.aidatim.member.feature.login.LoginScreen
import nl.aidatim.member.feature.main.MainScaffold
import nl.aidatim.member.feature.unlock.UnlockScreen
import org.koin.compose.koinInject

object Routes {
    const val LOGIN = "login"
    const val UNLOCK = "unlock"
    const val MAIN = "main"
}

/** Type-safe route for a single announcement (carries the post id). Used inside [MainScaffold]. */
@Serializable
data class PostDetailRoute(val id: Int)

@Composable
fun AppNavHost() {
    val authRepository = koinInject<AuthRepository>()
    val navController = rememberNavController()

    // A restored (persisted) session passes the biometric gate first; otherwise log in.
    val startDestination = if (authRepository.isLoggedIn) Routes.UNLOCK else Routes.LOGIN

    NavHost(navController = navController, startDestination = startDestination) {
        composable(Routes.LOGIN) {
            LoginScreen(
                onLoggedIn = {
                    navController.navigate(Routes.MAIN) {
                        popUpTo(Routes.LOGIN) { inclusive = true }
                    }
                },
            )
        }
        composable(Routes.UNLOCK) {
            UnlockScreen(
                onUnlocked = {
                    navController.navigate(Routes.MAIN) {
                        popUpTo(Routes.UNLOCK) { inclusive = true }
                    }
                },
                onSessionInvalid = {
                    navController.navigate(Routes.LOGIN) {
                        popUpTo(Routes.UNLOCK) { inclusive = true }
                    }
                },
                onSignOut = {
                    authRepository.logout()
                    navController.navigate(Routes.LOGIN) {
                        popUpTo(Routes.UNLOCK) { inclusive = true }
                    }
                },
            )
        }
        composable(Routes.MAIN) {
            MainScaffold(
                onSignOut = {
                    authRepository.logout()
                    navController.navigate(Routes.LOGIN) {
                        popUpTo(Routes.MAIN) { inclusive = true }
                    }
                },
            )
        }
    }
}
