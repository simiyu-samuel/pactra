# Security, privacy, and reliability

## Scope of protection

The demo exposes public AI inference and a real sandbox payment integration. Protect the model budget, session data, seller policy boundary, inventory, and payment state. Use fictional catalog and customer examples; collect no actual delivery address or card details in Pactra.

## Main threats and controls

| Threat | Control | Verification |
| --- | --- | --- |
| User opens another room/checkout ID | Opaque guest cookie, hashed credential, ownership checks on every query and mutation | Two-browser negative access tests |
| Buyer discovers seller-private fields | Explicit public DTO allowlist; separate role context; no raw ORM/provider response serialization | API response assertions and bundle inspection |
| Catalog text tells an agent to ignore its budget | Treat descriptions as data; strict action schema; deterministic policy and budget gates | Prompt-injection evaluation fixtures |
| Agent invents a product, delivery term, or discount | IDs and supported terms only; re-read authoritative records before publication/acceptance | Unknown-ID, below-floor, and unsupported-term tests |
| Browser changes total or payee | Never accept authoritative amounts or recipient IDs from browser input | Tampered request tests |
| Fake webhook marks checkout paid | Verify provider signature and local linkage; deduplicate; reconcile contradictory state | Invalid-signature and mismatched-resource tests |
| Double click or network retry charges twice | Durable operation key, local serialization, stable provider idempotency key | Duplicate/concurrent capture scenarios |
| Two buyers consume last stock | All-item reservations in one transaction; ordered row locks and uniqueness | Real database concurrency tests |
| Anonymous visitors exhaust paid AI quota | Per-session/IP/global limits, bounded jobs/calls/tokens, queue admission controls | Limit and cancellation tests |
| Owner endpoints exposed | Separate owner login/session; CSRF, rate limiting, no URL secrets | Guest-to-owner privilege tests |
| Untrusted content executes in the browser | Escape model text, no arbitrary HTML, approved Markdown rendering if used, CSP | XSS fixtures in descriptions and agent messages |
| Worker crash loses progress | Persisted step checkpoints, lease recovery, idempotent effects | Crash between provider response and local checkpoint |

The published demo fixture contains fictional price floors in its source CSV. Isolation still applies to buyer APIs and role context, but these sample values are not actual commercial secrets. Real merchant policy values must be stored privately and never committed to public source.

## Agent capability limits

Agents can propose structured negotiation actions. They cannot invoke payments, read secrets, execute shell commands, browse arbitrary URLs, modify stock, alter a policy, change the user's confirmed brief, or impersonate owner commands. Never infer permissions from a natural-language message.

The schema constrains shape; validators constrain meaning. Both are required. Prompt-injection detection may provide diagnostics, but no classifier is the authority that permits a financial action.

## Session and browser controls

Issue high-entropy opaque credentials in HttpOnly, Secure, SameSite cookies. Store credential hashes, enforce a 24-hour guest lifetime, and clear access on logout. Owner sessions have a separate credential namespace and a shorter lifetime. Do not accept guest credentials on owner routes.

Apply same-origin checks and CSRF protection to browser-origin mutations. Use constant-time comparison for the configured owner login secret. Rate-limit owner login; never place a secret in a URL, public seed, generated client bundle, or log.

## Data minimization and retention

Retain synthetic room records and restricted diagnostic payloads for seven days in the public demo, then purge them safely. Keep only nonidentifying aggregate metrics beyond that if useful. Guest access expires after 24 hours, even if operational records remain briefly retained. Explain this on the receipt screen.

Do not store card details, PayPal access tokens in logs, full buyer personal profiles, or unnecessary provider payer details. Restrict raw webhook payloads to payment processing access and the short diagnostic retention period. Redact free text and payment personal fields from ordinary logs. Provider-side storage and retention settings must be checked and documented during implementation; do not claim zero retention without verification.

## Reliability policy

- Persist state before acknowledging a command as accepted.
- Keep database transactions short; do not hold locks while waiting for providers.
- Retry safe transient operations with backoff and jitter within the absolute job deadline.
- Reuse mutation idempotency keys. Unknown payment results trigger reconciliation, not a new purchase.
- Do not release stock while a payment could still settle.
- Store accepted state changes and corresponding events atomically.
- Enforce unique step effects when a worker lease is recovered.
- Bound each seller separately so one timeout does not erase other useful offers.
- Preserve a factual fallback explanation when the explanation model fails.

## Proposed abuse limits

Start with one active negotiation per guest and one admitted live room across the demo, two brief versions per shopping session, sixteen provider requests per version, and thirty-two per shopping session. Default to one Groq model request in flight. Brief interpretation and owner tests share the same database-backed provider quota controls so they cannot bypass rate or token limits.

Admission limits, a free-tier usage budget, and a no-paid-fallback policy must be configured before the URL becomes public. Respect Groq retry/reset signals; do not rotate credentials, accounts, or models to evade a shared quota. IP limits are coarse abuse controls, not user identities; allow the owner to accommodate shared judge networks. Use server-side limits and durable counters rather than only disabled UI buttons.

## Observability

Track safe correlation IDs for session, brief, run, step, checkout, provider request, and payment operation. Metrics include queue wait, model latency, tokens, invalid-proposal rate, negotiation duration, offer eligibility, checkout conversion, capture outcomes, webhook lag, and reconciliation age.

Alert or visibly flag repeated signature failures, payment mismatches, unresolved captures, stuck holds, incompatible web/worker versions, and spend-limit exhaustion. Never show private provider errors or stack traces to the buyer.

## Recovery exercises before launch

Restart the worker halfway through a seller round, refresh the room during negotiation, disconnect SSE and reconnect, retry capture after a timeout, deliver a duplicate/out-of-order webhook, and send a stale brief acceptance command. All must preserve ownership, exact agreement, inventory, and payment correctness.
