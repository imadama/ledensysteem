package nl.aidatim.member.data.contribution

import kotlinx.serialization.Serializable

// ---------------------------------------------------------------------------
// DATA MODELS for the contribution feature.
// Two kinds live here:
//   1. DTOs  (@Serializable) — mirror the RAW JSON the backend sends.
//   2. Domain models         — cleaned up and formatted, ready for the UI.
// Keeping them separate means the screen never depends on the backend's shape.
// ---------------------------------------------------------------------------

// --- 1. DTOs: exactly what the backend returns ---

/** Envelope returned by GET /api/member/contribution-history: { "data": [ ... ] }. */
@Serializable
data class ContributionHistoryResponse(
    // Laravel wraps list responses in a "data" field, so we model that wrapper.
    val data: List<ContributionRecordDto> = emptyList(),
)

/**
 * A single monthly contribution record as returned by the backend.
 * `amount` is a string because Laravel serialises decimal casts as strings ("12.50").
 */
@Serializable
data class ContributionRecordDto(
    val id: Int,
    val period: String? = null,      // human label from the backend, e.g. "April 2026"
    val period_iso: String? = null,  // machine date, e.g. "2026-04-01" (we format this)
    val amount: String? = null,      // string on purpose (avoids float rounding issues)
    val status: String? = null,      // raw status, e.g. "paid" / "open" / "failed"
    val note: String? = null,
)

/** Payment state of a contribution record, normalised for the UI. */
// An enum (not a raw string) so the UI can switch on a fixed, safe set of states.
enum class ContributionStatus { PAID, PENDING, PROCESSING, FAILED, UNKNOWN }

/** Envelope from GET /api/member/contribution: { "data": { ... } | null }. */
@Serializable
data class ContributionSummaryResponse(
    val data: ContributionSummaryDto? = null,
)

@Serializable
data class ContributionSummaryDto(
    val contribution_amount: String? = null,
    val contribution_frequency: String? = null,   // Dutch from the backend, e.g. "maandelijks"
    val contribution_start_date: String? = null,
    val contribution_note: String? = null,
    val has_subscription: Boolean = false,
)

// --- 2. Domain models: what the screen actually shows (already formatted) ---

/** The member's current contribution arrangement, formatted for the dashboard. */
data class ContributionSummary(
    val amountLabel: String,      // e.g. "€10.00"
    val frequencyLabel: String,   // e.g. "Monthly" (translated to English)
    val sinceLabel: String?,      // e.g. "April 2026"
    val automatic: Boolean,
)

/** Domain model shown on the contribution screen — already formatted for an English UI. */
data class ContributionItem(
    val id: Int,
    val periodLabel: String,      // "April 2026"  (built from period_iso)
    val amountLabel: String,      // "€10.00"      (built from amount)
    val status: ContributionStatus,
    val statusLabel: String,      // "Paid" / "Open" / "Failed"
    val note: String?,
)
