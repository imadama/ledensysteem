package nl.aidatim.member.feature.login

import androidx.compose.material3.MaterialTheme
import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.runComposeUiTest
import kotlin.test.Test
import kotlin.test.assertTrue

/**
 * UI tests for the stateless login screen, run on the device/simulator via the
 * Compose test framework. Covers US-01 acceptance criteria at the UI level.
 */
@OptIn(ExperimentalTestApi::class)
class LoginContentTest {

    @Test
    fun sign_in_is_disabled_when_fields_are_empty() = runComposeUiTest {
        setContent {
            MaterialTheme {
                LoginContent(LoginUiState(), onEmailChange = {}, onPasswordChange = {}, onSubmit = {})
            }
        }
        onNodeWithText("Sign in").assertIsNotEnabled()
    }

    @Test
    fun sign_in_is_enabled_when_email_and_password_filled() = runComposeUiTest {
        setContent {
            MaterialTheme {
                LoginContent(
                    LoginUiState(email = "member@aidatim.nl", password = "secret"),
                    onEmailChange = {},
                    onPasswordChange = {},
                    onSubmit = {},
                )
            }
        }
        onNodeWithText("Sign in").assertIsEnabled()
    }

    @Test
    fun error_message_is_displayed() = runComposeUiTest {
        setContent {
            MaterialTheme {
                LoginContent(LoginUiState(error = "Login failed"), onEmailChange = {}, onPasswordChange = {}, onSubmit = {})
            }
        }
        onNodeWithText("Login failed").assertExists()
    }

    @Test
    fun tapping_sign_in_invokes_the_submit_callback() = runComposeUiTest {
        var submitted = false
        setContent {
            MaterialTheme {
                LoginContent(
                    LoginUiState(email = "member@aidatim.nl", password = "secret"),
                    onEmailChange = {},
                    onPasswordChange = {},
                    onSubmit = { submitted = true },
                )
            }
        }
        onNodeWithText("Sign in").performClick()
        assertTrue(submitted, "onSubmit should fire when Sign in is tapped")
    }
}
