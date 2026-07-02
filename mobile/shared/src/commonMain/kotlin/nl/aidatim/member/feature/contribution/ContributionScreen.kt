package nl.aidatim.member.feature.contribution

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeContentPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import nl.aidatim.member.data.contribution.ContributionItem
import nl.aidatim.member.data.contribution.ContributionStatus
import org.koin.compose.koinInject

// ---------------------------------------------------------------------------
// VIEW layer (the "V" in MVVM): a Compose screen. It only DRAWS the state and
// forwards user actions to the ViewModel. There is no network/business logic
// in here — that is the whole point of MVVM.
// ---------------------------------------------------------------------------

@Composable
fun ContributionScreen() {
    // Koin gives us the repository; viewModel { } creates/keeps the ViewModel.
    val repository = koinInject<nl.aidatim.member.data.contribution.ContributionRepository>()
    val viewModel = viewModel { ContributionViewModel(repository) }
    // Subscribe to the state: whenever it changes, Compose re-draws this screen.
    val state by viewModel.state.collectAsStateWithLifecycle()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .safeContentPadding()   // keep content out of the status bar / notch
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text(
            text = "Contributions",
            style = MaterialTheme.typography.headlineSmall,
        )

        // Draw a different thing per state. Covers all four cases -> never a blank/crash.
        when {
            state.isLoading -> CenteredMessage { CircularProgressIndicator() } // 1. loading

            state.error != null -> CenteredMessage {                            // 2. error + retry
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = state.error ?: "Something went wrong",
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodyMedium,
                    )
                    // Retry just calls back into the ViewModel — no logic here.
                    Button(onClick = viewModel::load, modifier = Modifier.padding(top = 12.dp)) {
                        Text("Retry")
                    }
                }
            }

            state.isEmpty -> CenteredMessage {                                  // 3. empty state
                Text(
                    text = "No contributions yet.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) { // 4. the list
                // LazyColumn only renders the rows on screen (efficient scrolling).
                // key = { it.id } lets Compose track items correctly on updates.
                items(state.items, key = { it.id }) { item ->
                    ContributionRow(item)
                }
            }
        }
    }
}

// One row = one month. Period + optional note on the left, amount + status on the right.
@Composable
private fun ContributionRow(item: ContributionItem) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {   // weight(1f) = take the free space
                Text(item.periodLabel, fontWeight = FontWeight.SemiBold)
                item.note?.let {                       // only draw the note if there is one
                    Text(
                        text = it,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(item.amountLabel, fontWeight = FontWeight.SemiBold)
                StatusChip(item)
            }
        }
    }
}

// A small coloured pill showing the payment status (green = paid, red = failed, ...).
@Composable
private fun StatusChip(item: ContributionItem) {
    val (background, foreground) = statusColors(item.status)  // pick colours for this status
    Surface(
        color = background,
        shape = RoundedCornerShape(6.dp),
        modifier = Modifier.padding(top = 4.dp),
    ) {
        Text(
            text = item.statusLabel,
            color = foreground,
            style = MaterialTheme.typography.labelSmall,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
        )
    }
}

// Maps each status to a (background, text) colour pair. Returned as a Kotlin Pair.
private fun statusColors(status: ContributionStatus): Pair<Color, Color> = when (status) {
    ContributionStatus.PAID -> Color(0xFFDCFCE7) to Color(0xFF166534)        // green
    ContributionStatus.PENDING -> Color(0xFFFEF9C3) to Color(0xFF854D0E)     // amber
    ContributionStatus.PROCESSING -> Color(0xFFDBEAFE) to Color(0xFF1E40AF)  // blue
    ContributionStatus.FAILED -> Color(0xFFFEE2E2) to Color(0xFF991B1B)      // red
    ContributionStatus.UNKNOWN -> Color(0xFFF1F5F9) to Color(0xFF475569)     // grey
}

// Small helper: centres its content on the screen (used for loading/error/empty).
@Composable
private fun CenteredMessage(content: @Composable () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        content()
    }
}
