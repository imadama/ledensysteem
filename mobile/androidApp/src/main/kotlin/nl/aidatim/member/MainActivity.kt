package nl.aidatim.member

import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.fragment.app.FragmentActivity
import nl.aidatim.member.core.biometric.CurrentActivityHolder

// FragmentActivity is required by the androidx BiometricPrompt.
class MainActivity : FragmentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        CurrentActivityHolder.activity = this

        setContent {
            App()
        }
    }

    override fun onDestroy() {
        if (CurrentActivityHolder.activity === this) CurrentActivityHolder.activity = null
        super.onDestroy()
    }
}

@Preview
@Composable
fun AppAndroidPreview() {
    App()
}