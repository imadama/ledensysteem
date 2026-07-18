package nl.aidatim.member.feature.main

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.toRoute
import nl.aidatim.member.feature.contribution.ContributionScreen
import nl.aidatim.member.feature.dashboard.DashboardScreen
import nl.aidatim.member.feature.posts.PostDetailScreen
import nl.aidatim.member.feature.posts.PostsScreen
import nl.aidatim.member.feature.profile.ProfileScreen
import nl.aidatim.member.navigation.PostDetailRoute

private sealed class Tab(val route: String, val label: String, val icon: ImageVector) {
    data object Home : Tab("home", "Home", Icons.Filled.Home)
    data object Contributions : Tab("contributions", "Contributions", Icons.Filled.Payments)
    data object Announcements : Tab("announcements", "News", Icons.Filled.Notifications)
    data object Profile : Tab("profile", "Profile", Icons.Filled.Person)
}

private val tabs = listOf(Tab.Home, Tab.Contributions, Tab.Announcements, Tab.Profile)

/**
 * The signed-in area: a bottom navigation bar over the four top-level tabs.
 * The post detail is a pushed screen (no bottom bar). Sign out lives on Profile.
 */
@Composable
fun MainScaffold(onSignOut: () -> Unit) {
    val navController = rememberNavController()
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route
    val showBottomBar = tabs.any { it.route == currentRoute }

    Scaffold(
        bottomBar = {
            if (showBottomBar) {
                NavigationBar {
                    tabs.forEach { tab ->
                        NavigationBarItem(
                            selected = currentRoute == tab.route,
                            onClick = {
                                navController.navigate(tab.route) {
                                    popUpTo(navController.graph.startDestinationId) { saveState = true }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            icon = { Icon(tab.icon, contentDescription = tab.label) },
                            label = { Text(tab.label) },
                        )
                    }
                }
            }
        },
    ) { padding ->
        NavHost(
            navController = navController,
            startDestination = Tab.Home.route,
            modifier = Modifier.padding(padding),
        ) {
            composable(Tab.Home.route) { DashboardScreen() }
            composable(Tab.Contributions.route) { ContributionScreen() }
            composable(Tab.Announcements.route) {
                PostsScreen(onOpenPost = { id -> navController.navigate(PostDetailRoute(id)) })
            }
            composable(Tab.Profile.route) { ProfileScreen(onSignOut = onSignOut) }
            composable<PostDetailRoute> { entry ->
                PostDetailScreen(
                    postId = entry.toRoute<PostDetailRoute>().id,
                    onBack = { navController.popBackStack() },
                )
            }
        }
    }
}
