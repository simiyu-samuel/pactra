# Scope and acceptance criteria

> Current approved direction (October 20): [Negotiation first](18-negotiation-first.md) makes buyer/seller agent negotiation primary and supports seller-listed products across categories. Earlier creator-only and discovery-led boundaries below are historical.
> October 19 approved scope update: [Marketplace expansion](16-marketplace-expansion.md) supersedes the original single-category discovery/UI boundary below. Native negotiation and PayPal integrity requirements remain in force.

## Release boundary

P0 is the required hackathon release. P1 improves the submission only after P0 passes. P2 is a future product roadmap and is not promised for November 12.

The release supports English text, USD, one seeded destination zone, one seller per order, one active shopping session per browser, three simulated seller agents, and eight fictional product types. All items in an offer belong to its one seller. A seller's catalog may contain several compatible kit combinations.

## P0: required features

| ID | Feature | Acceptance condition |
| --- | --- | --- |
| F01 | Guided buyer brief | Free text becomes editable structured requirements; the user confirms budget, deadline, required items, and priorities before negotiation |
| F02 | Seller-owned policy boundaries | Each seller has its own listings, stock, floors, delivery options, and policy version; no agent can publish outside them |
| F03 | Genuine agent negotiation | Three seller contexts produce structured offers; a buyer context produces counters; accepted actions are recorded round by round |
| F04 | Live negotiation room | Offers, counters, round status, and seller availability update without a full reload; reconnection catches up from persisted events |
| F05 | Mid-session changes | A revised brief gets a new version; old offers remain readable but cannot be newly accepted |
| F06 | Comparable offers | Eligible offers show all-in total, exact items, arrival estimate, warranty, constraint checks, and ranking explanation |
| F07 | Choice and approval | The user can select any valid offer, inspect its exact terms, and explicitly start PayPal checkout |
| F08 | Real sandbox payment | The server creates and captures a PayPal order backed by an immutable local snapshot; a verified response or reconciliation establishes completion |
| F09 | Inventory reservation | Checkout reserves all bundle items atomically; two buyers cannot consume the same last unit |
| F10 | Durable receipt | The receipt records the accepted offer, capture reference, payment state, and negotiation summary; refresh does not lose it |
| F11 | Honest failure and recovery | No eligible offer, model timeout, rejected proposal, checkout cancellation, pending payment, and capture uncertainty each have a distinct recoverable state |
| F12 | Seller control demonstration | A protected console can edit allowed policy fields, publish a new policy version, and launch a fresh test negotiation; floors never appear in buyer APIs |
| F13 | Session protection | Anonymous judge sessions have opaque browser credentials; all private resources check ownership; only the owner console can alter policies or reset fixtures |
| F14 | Submission readiness | Public licensed repository, setup instructions, usable hosted demo or complete local run path, disclosed AI tools, and video under three minutes |

## P1: optional improvements in order

1. Read-only replay of a completed negotiation, clearly labeled replay.
2. A simple comparison chart showing total price across rounds.
3. A "why did this change?" explanation between brief versions.
4. Read-only JSON export of the accepted agreement and redacted decision trace.
5. A second preset shopping scenario using the same catalog and constraints.

Cut P1 before compromising payment integrity, genuine AI behavior, or submission quality.

## P2: future product

- Real merchant accounts and the appropriate PayPal platform onboarding.
- Real shipping quotes, taxes, inventory feeds, fulfillment, returns, and merchant support.
- Seller-hosted agents with authenticated capabilities and versioned offer contracts.
- Customer accounts, preference history, localization, and additional currencies.
- Multiple categories and orders spanning several sellers.
- Merchant subscriptions or explicitly disclosed platform fees.

## Explicit exclusions

No real-money payments, automatic unattended purchases, stored payment credentials, escrow, pooled funds, payouts, cross-seller split settlements, scraping arbitrary stores, claims about real shipping or warranties, AI-created product specifications, voice or AR, recommendation training, or mobile-native applications in P0.

There is no requirement to use a sponsor tool beyond the mandatory PayPal integration. Render is the planned host; optional sponsor integrations must earn their place by improving the core demo.

## Personas and permissions

| Actor | Allowed |
| --- | --- |
| Anonymous buyer | Create and view own sessions, revise own unlocked brief, select own valid offers, approve own sandbox checkout, view own receipt |
| Seller agent | Read its assigned policy/listings and public request; submit proposals for its seller only |
| Buyer agent | Read the owner's brief and published offers; propose counters and explain permitted tradeoffs |
| Orchestrator | Schedule steps, validate actions, persist events, enforce quotas and versions |
| Payment service | Load approved snapshot, reserve stock, create/capture/reconcile matching payment |
| Demo owner | Edit seeded seller policies and view redacted operational state through a protected console |

Agents receive no direct payment capabilities. Public judges cannot read another buyer's history or change the shared seller policies.

## Definition of a complete P0

Every F01–F14 acceptance condition is demonstrated or tested. At least one live negotiation leads to a real sandbox capture. The impossible-demand and reduced-budget scenarios work. Pending or uncertain payments do not produce false success. A second visitor cannot read the first visitor's session. The setup guide can be followed from a clean checkout. The deployed release matches the demonstrated source revision.

All prototype disclosures must be visible: simulated sellers, fictional products and fulfillment terms, USD sandbox payments, and no physical shipment. A payment confirmation proves the sandbox integration; it does not prove delivery.
