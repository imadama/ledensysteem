package nl.aidatim.member.data.contribution

// ---------------------------------------------------------------------------
// REPOSITORY layer: the bridge between the API (raw backend) and the ViewModel.
// Two responsibilities:
//   1. Catch errors and hand back a Result (success OR failure) — no crashes.
//   2. Map DTOs -> domain models: format amounts/dates and translate NL -> EN.
// All the "make it pretty for the UI" logic lives here, in one place.
// ---------------------------------------------------------------------------

/**
 * Loads contribution history and maps the raw backend records into UI-ready
 * domain models (English labels, normalised status, formatted amount/period).
 */
class ContributionRepository(private val api: ContributionApi) {

    // runCatching wraps the call: returns Result.success(list) or Result.failure(exception).
    // .map { it.toItem() } converts every DTO into a UI-ready ContributionItem.
    suspend fun history(): Result<List<ContributionItem>> = runCatching {
        api.history().map { it.toItem() }
    }

    suspend fun currentContribution(): Result<ContributionSummary?> = runCatching {
        api.current()?.toSummary()
    }
}

// --- Mapping helpers: DTO (backend) -> domain model (UI). Pure functions. ---

// Turns the raw summary DTO into a formatted ContributionSummary for the dashboard.
private fun ContributionSummaryDto.toSummary(): ContributionSummary = ContributionSummary(
    amountLabel = formatAmount(contribution_amount),
    frequencyLabel = formatFrequency(contribution_frequency),
    sinceLabel = contribution_start_date?.let { formatPeriod(it, null) }?.takeIf { it != "—" },
    automatic = has_subscription,
)

/** Maps the backend's Dutch frequency labels to English for the UI. */
// The DoD requires an English GUI, but the backend speaks Dutch -> translate here.
private fun formatFrequency(raw: String?): String = when (raw?.lowercase()) {
    "maandelijks" -> "Monthly"
    "jaarlijks" -> "Yearly"
    "per kwartaal", "kwartaal" -> "Quarterly"
    "wekelijks" -> "Weekly"
    "monthly", "yearly", "quarterly", "weekly" -> raw.replaceFirstChar { it.uppercase() }
    null, "" -> "—"                                     // nothing set -> dash placeholder
    else -> raw.replaceFirstChar { it.uppercase() }
}

// Turns one raw record into a fully formatted ContributionItem.
private fun ContributionRecordDto.toItem(): ContributionItem {
    val (status, statusLabel) = mapStatus(status)     // "paid" -> (PAID, "Paid")
    return ContributionItem(
        id = id,
        periodLabel = formatPeriod(period_iso, period),  // "2026-04-01" -> "April 2026"
        amountLabel = formatAmount(amount),              // "10.00"      -> "€10.00"
        status = status,
        statusLabel = statusLabel,
        note = note?.takeIf { it.isNotBlank() },          // ignore empty notes
    )
}

// Normalises the many possible backend statuses into our fixed enum + an English label.
private fun mapStatus(raw: String?): Pair<ContributionStatus, String> = when (raw?.lowercase()) {
    "paid" -> ContributionStatus.PAID to "Paid"
    "open", "created", "incomplete" -> ContributionStatus.PENDING to "Open"
    "processing" -> ContributionStatus.PROCESSING to "Processing"
    "failed", "disputed" -> ContributionStatus.FAILED to "Failed"
    null -> ContributionStatus.UNKNOWN to "Unknown"
    else -> ContributionStatus.UNKNOWN to raw.replaceFirstChar { it.uppercase() }
}

// "10.00" -> "€10.00"; blank/null -> "—" so the UI never shows an empty amount.
private fun formatAmount(amount: String?): String =
    amount?.takeIf { it.isNotBlank() }?.let { "€$it" } ?: "—"

/** Turns an ISO date ("2026-01-01") into an English "January 2026" label. */
private fun formatPeriod(iso: String?, fallback: String?): String {
    val safeFallback = fallback?.takeIf { it.isNotBlank() }  // use backend label if no ISO date
    if (iso.isNullOrBlank()) return safeFallback ?: "—"
    val parts = iso.split("-")                               // ["2026", "01", "01"]
    val year = parts.getOrNull(0)
    val month = parts.getOrNull(1)?.toIntOrNull()            // "01" -> 1
    val name = month?.let { MONTHS.getOrNull(it - 1) }       // 1 -> "January"
    return if (year != null && name != null) "$name $year" else safeFallback ?: iso
}

private val MONTHS = listOf(
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
)
