package nl.aidatim.member.feature.posts

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeContentPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import nl.aidatim.member.data.posts.PostComment
import nl.aidatim.member.data.posts.PostsRepository
import org.koin.compose.koinInject

@Composable
fun PostDetailScreen(postId: Int, onBack: () -> Unit) {
    val repository = koinInject<PostsRepository>()
    val viewModel = viewModel { PostDetailViewModel(repository, postId) }
    val state by viewModel.state.collectAsStateWithLifecycle()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .safeContentPadding()
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            TextButton(onClick = onBack) { Text("Back") }
            Text(
                text = "Announcement",
                style = MaterialTheme.typography.headlineSmall,
                modifier = Modifier.padding(start = 4.dp),
            )
        }

        when {
            state.isLoading -> CircularProgressIndicator(modifier = Modifier.padding(top = 48.dp))

            state.error != null -> Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth().padding(top = 32.dp)) {
                Text(state.error ?: "Something went wrong", color = MaterialTheme.colorScheme.error)
                Button(onClick = viewModel::load, modifier = Modifier.padding(top = 12.dp)) { Text("Retry") }
            }

            else -> state.post?.let { post ->
                Text(post.title, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                if (post.dateLabel.isNotBlank()) {
                    Text(post.dateLabel, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Text(post.body, style = MaterialTheme.typography.bodyLarge)

                val likeLabel = if (post.likedByMe) "♥ Liked (${post.likeCount})" else "♡ Like (${post.likeCount})"
                OutlinedButton(onClick = viewModel::toggleLike) { Text(likeLabel) }

                HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))

                Text("Comments (${post.comments.size})", style = MaterialTheme.typography.titleMedium)

                if (post.comments.isEmpty()) {
                    Text(
                        "No comments yet. Be the first to reply.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                } else {
                    post.comments.forEach { CommentRow(it) }
                }

                state.actionError?.let {
                    Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                }

                OutlinedTextField(
                    value = state.commentDraft,
                    onValueChange = viewModel::onDraftChange,
                    label = { Text("Write a comment") },
                    modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
                )
                Button(
                    onClick = viewModel::sendComment,
                    enabled = state.canSend,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(if (state.isSending) "Sending…" else "Post comment")
                }
            }
        }
    }
}

@Composable
private fun CommentRow(comment: PostComment) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier.padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(comment.author, fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.labelLarge)
                if (comment.dateLabel.isNotBlank()) {
                    Text(comment.dateLabel, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            Text(comment.body, style = MaterialTheme.typography.bodyMedium)
        }
    }
}
