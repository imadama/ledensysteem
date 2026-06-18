package nl.aidatim.member.feature.dashboard

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeContentPadding
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import nl.aidatim.member.data.auth.AuthRepository
import org.koin.compose.koinInject

@Composable
fun DashboardScreen(onLogout: () -> Unit) {
    val repository = koinInject<AuthRepository>()
    val user by repository.currentUser.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .safeContentPadding()
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text(
            text = "Welcome${user?.name?.let { ", $it" } ?: ""}",
            style = MaterialTheme.typography.headlineSmall,
        )

        Card(modifier = Modifier.fillMaxWidth()) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Text("Membership", style = MaterialTheme.typography.titleMedium)
                Text("Email: ${user?.email ?: "-"}")
                Text("Organisation: ${user?.organisation?.name ?: "-"}")
                Text("Status: ${user?.status ?: "-"}")
            }
        }

        OutlinedButton(onClick = {
            repository.logout()
            onLogout()
        }) {
            Text("Sign out")
        }
    }
}
