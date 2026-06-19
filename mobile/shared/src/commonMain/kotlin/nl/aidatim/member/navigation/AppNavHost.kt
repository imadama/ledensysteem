package nl.aidatim.member.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import nl.aidatim.member.data.auth.AuthRepository
import nl.aidatim.member.feature.contribution.ContributionScreen
import nl.aidatim.member.feature.dashboard.DashboardScreen
import nl.aidatim.member.feature.login.LoginScreen
import nl.aidatim.member.feature.profile.ProfileScreen
import nl.aidatim.member.feature.unlock.UnlockScreen
import org.koin.compose.koinInject

object Routes {
    const val LOGIN = "login"
    const val UNLOCK = "unlock"
    const val DASHBOARD = "dashboard"
    const val CONTRIBUTION = "contribution"
    const val PROFILE = "profile"
}

@Composable
fun AppNavHost() {
    val authRepository = koinInject<AuthRepository>()
    val navController = rememberNavController()

    // A restored (persisted) session must pass the biometric gate first.
    val startDestination = if (authRepository.isLoggedIn) Routes.UNLOCK else Routes.LOGIN

    NavHost(navController = navController, startDestination = startDestination) {
        composable(Routes.UNLOCK) {
            UnlockScreen(
                onUnlocked = {
                    navController.navigate(Routes.DASHBOARD) {
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
        composable(Routes.LOGIN) {
            LoginScreen(
                onLoggedIn = {
                    navController.navigate(Routes.DASHBOARD) {
                        popUpTo(Routes.LOGIN) { inclusive = true }
                    }
                },
            )
        }
        composable(Routes.DASHBOARD) {
            DashboardScreen(
                onLogout = {
                    navController.navigate(Routes.LOGIN) {
                        popUpTo(Routes.DASHBOARD) { inclusive = true }
                    }
                },
                onOpenContributions = { navController.navigate(Routes.CONTRIBUTION) },
                onOpenProfile = { navController.navigate(Routes.PROFILE) },
            )
        }
        composable(Routes.CONTRIBUTION) {
            ContributionScreen(onBack = { navController.popBackStack() })
        }
        composable(Routes.PROFILE) {
            ProfileScreen(onBack = { navController.popBackStack() })
        }
    }
}
