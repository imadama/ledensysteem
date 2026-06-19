package nl.aidatim.member.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import nl.aidatim.member.feature.contribution.ContributionScreen
import nl.aidatim.member.feature.dashboard.DashboardScreen
import nl.aidatim.member.feature.login.LoginScreen

object Routes {
    const val LOGIN = "login"
    const val DASHBOARD = "dashboard"
    const val CONTRIBUTION = "contribution"
}

@Composable
fun AppNavHost() {
    val navController = rememberNavController()

    NavHost(navController = navController, startDestination = Routes.LOGIN) {
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
            )
        }
        composable(Routes.CONTRIBUTION) {
            ContributionScreen(onBack = { navController.popBackStack() })
        }
    }
}
