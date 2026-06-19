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

/** Domain model shown on the contribution screen — already formatted for an English UI. */
data class ContributionItem(
    val id: Int,
    val periodLabel: String,
    val amountLabel: String,
    val status: ContributionStatus,
    val statusLabel: String,
    val note: String?,
)
