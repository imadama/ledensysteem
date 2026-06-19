package nl.aidatim.member.data.contribution

/**
 * Loads contribution history and maps the raw backend records into UI-ready
 * domain models (English labels, normalised status, formatted amount/period).
 */
class ContributionRepository(private val api: ContributionApi) {

    suspend fun history(): Result<List<ContributionItem>> = runCatching {
        api.history().map { it.toItem() }
    }

    suspend fun currentContribution(): Result<ContributionSummary?> = runCatching {
        api.current()?.toSummary()
    }
}

private fun ContributionSummaryDto.toSummary(): ContributionSummary = ContributionSummary(
    amountLabel = formatAmount(contribution_amount),
    frequencyLabel = formatFrequency(contribution_frequency),
    sinceLabel = contribution_start_date?.let { formatPeriod(it, null) }?.takeIf { it != "—" },
    automatic = has_subscription,
)

/** Maps the backend's Dutch frequency labels to English for the UI. */
private fun formatFrequency(raw: String?): String = when (raw?.lowercase()) {
    "maandelijks" -> "Monthly"
    "jaarlijks" -> "Yearly"
    "per kwartaal", "kwartaal" -> "Quarterly"
    "wekelijks" -> "Weekly"
    "monthly", "yearly", "quarterly", "weekly" -> raw.replaceFirstChar { it.uppercase() }
    null, "" -> "—"
    else -> raw.replaceFirstChar { it.uppercase() }
}

private fun ContributionRecordDto.toItem(): ContributionItem {
    val (status, statusLabel) = mapStatus(status)
    return ContributionItem(
        id = id,
        periodLabel = formatPeriod(period_iso, period),
        amountLabel = formatAmount(amount),
        status = status,
        statusLabel = statusLabel,
        note = note?.takeIf { it.isNotBlank() },
    )
}

private fun mapStatus(raw: String?): Pair<ContributionStatus, String> = when (raw?.lowercase()) {
    "paid" -> ContributionStatus.PAID to "Paid"
    "open", "created", "incomplete" -> ContributionStatus.PENDING to "Open"
    "processing" -> ContributionStatus.PROCESSING to "Processing"
    "failed", "disputed" -> ContributionStatus.FAILED to "Failed"
    null -> ContributionStatus.UNKNOWN to "Unknown"
    else -> ContributionStatus.UNKNOWN to raw.replaceFirstChar { it.uppercase() }
}

private fun formatAmount(amount: String?): String =
    amount?.takeIf { it.isNotBlank() }?.let { "€$it" } ?: "—"

/** Turns an ISO date ("2026-01-01") into an English "January 2026" label. */
private fun formatPeriod(iso: String?, fallback: String?): String {
    val safeFallback = fallback?.takeIf { it.isNotBlank() }
    if (iso.isNullOrBlank()) return safeFallback ?: "—"
    val parts = iso.split("-")
    val year = parts.getOrNull(0)
    val month = parts.getOrNull(1)?.toIntOrNull()
    val name = month?.let { MONTHS.getOrNull(it - 1) }
    return if (year != null && name != null) "$name $year" else safeFallback ?: iso
}

private val MONTHS = listOf(
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
)
