package nl.aidatim.member.feature.unlock

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeContentPadding
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import nl.aidatim.member.core.biometric.BiometricAuthenticator
import nl.aidatim.member.core.biometric.BiometricResult
import nl.aidatim.member.data.auth.AuthRepository
import nl.aidatim.member.data.auth.SessionStatus
import org.koin.compose.koinInject

/**
 * Shown on startup when a stored session exists: requires a biometric check
 * before revealing the dashboard. If no biometrics are enrolled, it passes
 * through so the user is never locked out of a valid session.
 */
@Composable
fun UnlockScreen(onUnlocked: () -> Unit, onSessionInvalid: () -> Unit, onSignOut: () -> Unit) {
    val authenticator = koinInject<BiometricAuthenticator>()
    val authRepository = koinInject<AuthRepository>()
    val scope = rememberCoroutineScope()
    var failed by remember { mutableStateOf(false) }
    var validating by remember { mutableStateOf(false) }

    // After a passed biometric check, confirm the token is still valid server-side.
    suspend fun validateAndProceed() {
        validating = true
        when (authRepository.validateSession()) {
            SessionStatus.INVALID -> onSessionInvalid()
            SessionStatus.VALID, SessionStatus.INCONCLUSIVE -> onUnlocked()
        }
    }

    suspend fun attempt() {
        when (authenticator.authenticate("Unlock Aidatim", "Confirm your identity to continue")) {
            BiometricResult.SUCCESS, BiometricResult.UNAVAILABLE -> validateAndProceed()
            BiometricResult.FAILED -> failed = true
        }
    }

    LaunchedEffect(Unit) {
        if (!authenticator.canAuthenticate()) validateAndProceed() else attempt()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .safeContentPadding()
            .padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(text = "Aidatim", style = MaterialTheme.typography.headlineMedium)
        Text(
            text = "Locked — confirm your identity",
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.padding(top = 4.dp),
        )

        if (failed) {
            Text(
                text = "Authentication failed. Try again.",
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodySmall,
                modifier = Modifier.padding(top = 12.dp),
            )
        }

        if (validating) {
            CircularProgressIndicator(modifier = Modifier.padding(top = 24.dp))
        } else {
            Button(
                onClick = { failed = false; scope.launch { attempt() } },
                modifier = Modifier.padding(top = 24.dp),
            ) {
                Text("Unlock")
            }
        }

        TextButton(onClick = onSignOut, modifier = Modifier.padding(top = 4.dp)) {
            Text("Sign out")
        }
    }
}
