package nl.aidatim.member.data.contribution

import kotlinx.serialization.Serializable

/** Envelope returned by GET /api/member/contribution-history: { "data": [ ... ] }. */
@Serializable
data class ContributionHistoryResponse(
    val data: List<ContributionRecordDto> = emptyList(),
)

/**
 * A single monthly contribution record as returned by the backend.
 * `amount` is a string because Laravel serialises decimal casts as strings ("12.50").
 */
@Serializable
data class ContributionRecordDto(
    val id: Int,
    val period: String? = null,
    val period_iso: String? = null,
    val amount: String? = null,
    val status: String? = null,
    val note: String? = null,
)

/** Payment state of a contribution record, normalised for the UI. */
enum class ContributionStatus { PAID, PENDING, PROCESSING, FAILED, UNKNOWN }

/** Envelope from GET /api/member/contribution: { "data": { ... } | null }. */
@Serializable
data class ContributionSummaryResponse(
    val data: ContributionSummaryDto? = null,
)

@Serializable
data class ContributionSummaryDto(
    val contribution_amount: String? = null,
    val contribution_frequency: String? = null,
    val contribution_start_date: String? = null,
    val contribution_note: String? = null,
    val has_subscription: Boolean = false,
)

/** The member's current contribution arrangement, formatted for the dashboard. */
data class ContributionSummary(
    val amountLabel: String,
    val frequencyLabel: String,
    val sinceLabel: String?,
    val automatic: Boolean,
)

/** Domain model shown on the contribution screen — already formatted for an English UI. */
data class ContributionItem(
    val id: Int,
    val periodLabel: String,
    val amountLabel: String,
    val status: ContributionStatus,
    val statusLabel: String,
    val note: String?,
)
