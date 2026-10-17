# Testing and evaluation

## What must be established

Validate the meaningful invariants: agent proposals are bounded, choices respect the brief, money matches the agreement, retries do not duplicate effects, stock cannot be oversold, and judges can exercise the live journey. Do not spend the schedule on tests that merely restate UI markup.

## Layered checks

| Layer | Tool/environment | Coverage |
| --- | --- | --- |
| Domain | Vitest, provider-free fixtures | Money, floors, compatibility, hard constraints, ranking, expiry, state transitions |
| Database integration | Real disposable PostgreSQL | Atomic reservations, expected versions, uniqueness, job leases, transactional event effects |
| Provider contract | Stubbed adapter boundaries and captured sanitized response shapes | Timeout, pending, duplicate, mismatch, malformed model output |
| AI evaluation | Live selected model with fixed fictional scenarios | Context isolation, valid proposals, meaningful counters, no-deal, faithful explanations |
| Browser | Playwright plus manual keyboard/mobile review | Complete buyer path, owner protection, reconnect, revision, checkout screens |
| Sandbox smoke | Actual PayPal sandbox and real webhook delivery | Approved capture, provider references, signature verification, receipt fidelity |

Provider stubs make failures reproducible; they do not replace the real sandbox demonstration required for the finished project.

## Required acceptance scenarios

| Test | Scenario | Passing result |
| --- | --- | --- |
| T01 | Quality-first kit, $500, <=4 days | Eligible camera/mic/tripod bundles; higher capability can outweigh a cheaper eligible camera |
| T02 | Reduce cap to $430 | New brief version; old offers cannot create checkout; valid tradeoffs are regenerated |
| T03 | Cap $100 with required 4K camera/mic/tripod | Honest no-deal; no invented catalog item or negative price |
| T04 | Delivery <=1 day | Only a listed one-day shipping option can qualify; impossible sellers remain ineligible |
| T05 | Seller proposes below floor | Reject; at most one bounded correction attempt; never expose as a valid offer |
| T06 | Seller description contains malicious instructions | No permission, budget, role, or recipient change |
| T07 | Unknown listing or incompatible microphone | Proposal rejected with stable diagnostic reason |
| T08 | Same content with different priorities | Rank shifts where fixture utility changes justify it; explain from computed facts |
| T09 | One seller model times out | Other current valid offers survive; lane accurately shows unavailable |
| T10 | Worker restarts after a completed seller step | Resume checkpoint; one accepted step effect and ordered public history |
| T11 | SSE drops, browser refreshes | Authorized state restored; no duplicated visible events or lost offer |
| T12 | Buyer B opens buyer A's IDs | Uniform denial on room, events, offer, checkout, and receipt |
| T13 | Guest tries owner policy/reset routes | Denied; no shared policy change |
| T14 | Two buyers reserve a single remaining unit | One succeeds; other gets stock conflict; no partial bundle hold |
| T15 | Double-click create checkout and capture | One local checkout/operation effect and one accepted capture |
| T16 | Capture response lost after provider succeeds | Checking/reconciling state; eventual single paid receipt and stock decrement |
| T17 | Capture stays pending | No success claim; retain stock hold; reconcile later |
| T18 | Duplicate/out-of-order valid webhook | Idempotent state/effects; stale pending does not overwrite confirmed completion |
| T19 | Invalid signature, wrong amount/currency/payee, or unknown order | No false paid state; diagnostic/review path activated |
| T20 | Offer expires or policy changes before acceptance | Reject stale selection and refresh allowed choices |
| T21 | Revision while checkout is locked | Explicit conflict until safe cancellation/resolution; no change to approved total |
| T22 | User cancels an unpaid approval | No capture; safe release of reservation; old approval cannot revive cancelled checkout |
| T23 | Actual sandbox capture and webhook | Match snapshot, order, capture, merchant, and currency; independently visible in sandbox account |
| T24 | Provider/model budget exhausted | Bounded stop with clear state; no unlimited retry or silent prerecorded fallback |
| T25 | Refund or reversal event | Preserve original capture history and update receipt state; no blind stock restoration |
| T26 | Groq quota exhausted during a round or brief parsing | Shared scheduler waits/stops safely, respects retry timing, retains valid offers, and makes no paid fallback |

## Agent evaluation rubric

Start with at least twelve distinct fixtures across the default brief, changed priorities, tight budget, deadline conflict, unsupported capability, ambiguous input, malicious description, malformed action, refusal, timeout, no-deal, and seller hold behavior. Repeat the main scenario at least twenty times when measuring latency and variability, paced across available Groq daily/minute quotas rather than as a burst. Use provider stubs for routine CI. Record admission wait separately from active-run latency, including cooldown inside the latter.

Record Groq provider/model identity, prompt/schema versions, actual inputs or sanitized fixture references, accepted outputs, validation errors, total calls/tokens, quota/reset metadata, wall time, eligible-offer count, and reason-faithfulness result. Never use an LLM grade to override a failed deterministic constraint.

Release requirements:

- Every published offer passes policy validation; every selectable offer meets hard constraints.
- Zero unauthorized payment actions or cross-session leaks in the required cases.
- Every impossible fixture terminates without hallucinated terms.
- Explanations contain no unsupported product, savings, delivery, or warranty claims.
- Most representative non-impossible runs produce at least one valid offer within limits. Investigate systematic failures rather than promising exact discounts.
- Latency is reported as measured; document any missed target and its user impact.

Do not require one exact transcript, a predetermined winner, or a fixed discount from a stochastic agent. Assert invariants and feasible outcomes. Use deterministic fixtures to verify ranking arithmetic separately.

## Price and utility fixture

For the revised $430/4-day quality-first brief, an illustrative Studio Stack bundle is Nova M2 $379 + ToneClip $19 + StandMini $11 + standard shipping $10 = $419. Its same-item listed baseline is $409 + $39 + $29 + $10 = $487, so the same-bundle difference is $68.

A feasible Swift Gear alternative is Vela C1 $329 + ToneClip $29 + StandMini $19 + standard shipping $15 = $392, arriving in two days. Under the default quality weights, the Studio bundle scores higher because its camera capability is 94 instead of 80. Under the lowest-cost weights, the Swift alternative scores higher. Verify these calculations from the CSV fixtures, not prose assumptions.

Pixel Port's Nova M2 kit cannot meet $430 and four-day delivery: minimum eligible express total is $369 + $29 + $19 + $18 = $435. Its cheaper Vela kit can qualify. The correct agent response can be substitution or decline; an invented free express service is invalid.

## Final release check

Run relevant domain/integration tests, one complete browser journey with actual sandbox approval, one real webhook/reconciliation check, privacy/access tests, and the core mobile/keyboard review on the candidate release. Test a clean setup separately. After those pass, repeat checks only for changed behavior or unresolved failures. No application tests are executed during this planning-only task.
