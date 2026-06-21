package nl.aidatim.member.feature.dashboard

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeContentPadding
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import nl.aidatim.member.data.auth.AuthRepository
import nl.aidatim.member.data.contribution.ContributionRepository
import org.koin.compose.koinInject

/** Home tab: membership status + contribution summary. Navigation is via the bottom bar. */
@Composable
fun DashboardScreen() {
    val repository = koinInject<AuthRepository>()
    val user by repository.currentUser.collectAsState()

    val contributionRepository = koinInject<ContributionRepository>()
    val viewModel = viewModel { DashboardViewModel(contributionRepository) }
    val state by viewModel.state.collectAsStateWithLifecycle()

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

        state.contribution?.let { contribution ->
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    Text("Contribution", style = MaterialTheme.typography.titleMedium)
                    Text("Amount: ${contribution.amountLabel} · ${contribution.frequencyLabel}")
                    contribution.sinceLabel?.let { Text("Since: $it") }
                    Text(
                        if (contribution.automatic) {
                            "Automatic collection: active"
                        } else {
                            "Automatic collection: not set up"
                        },
                    )
                }
            }
        }
    }
}
