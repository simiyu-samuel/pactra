# Decisions, assumptions, and risks

## Architecture decision register

| ID | Decision | Rationale | Revisit when |
| --- | --- | --- | --- |
| ADR-01 | One category: fictional creator equipment | Demonstrates meaningful multi-term tradeoffs without crawling the web | Core journey and catalog integration are reliable |
| ADR-02 | Three seller agents with separate context | Enough variety to demonstrate competing objectives and bounded concurrency | Additional sellers create measurable buyer value |
| ADR-03 | One platform-owned sandbox merchant | Provides a complete sandbox payment without pretending real merchant onboarding exists | Real sellers or live money enter scope |
| ADR-04 | One seller per checkout | Preserves a straightforward agreement/payment/stock boundary | Real multi-seller payment design is funded and validated |
| ADR-05 | Deterministic policy/constraint/ranking authority | Protects money, stock, and user intent from invalid AI actions | Never remove this boundary; only extend supported rules |
| ADR-06 | Groq API with strict JSON decisions, initially GPT-OSS 20B | User-selected provider; inspectable decisions and bounded free-tier usage | Verified model access/quality requires a user-approved provider change |
| ADR-07 | No model payment tools | Human approval and server-owned payment state are central to the product | A separately designed, explicitly authorized recurring purchase feature exists |
| ADR-08 | Web service + persistent worker + PostgreSQL | Supports durable asynchronous negotiation with few moving parts | Queue throughput/operations justify a dedicated queue service |
| ADR-09 | Anonymous guest sessions and separate owner console | Fast judge access without full account management | Saved personal preferences or real merchant membership is needed |
| ADR-10 | Three rounds, two brief versions, bounded calls | A complete interactive story with controlled latency/cost | Benchmarks justify a better bounded protocol |
| ADR-11 | USD and fixed demo destination/tax fixture | Avoids unsupported cross-border, tax, and fulfillment claims | Real commerce and additional regions are planned |
| ADR-12 | MIT for original project materials | Satisfies the supplied open-source submission requirement | Contributor or third-party licensing requires specific treatment |
| ADR-13 | Free-tier-first scheduling with no paid AI fallback | Match the user's cost preference and actual Groq capacity | User explicitly opts into a paid inference plan |

## Risk register

| Risk | Likelihood / impact | Mitigation and trigger |
| --- | --- | --- |
| Agents merely repeat fixed discounts | Medium / high | Evaluate altered budgets/priorities/policies; require genuine live proposals and counters; do not hardcode a winner |
| Agent invents offer terms | Medium / high | Structured IDs, deterministic validation, bounded correction; never publish invalid offers |
| Groq free-tier limits slow or stop agent rounds | High / medium | Compact contexts, one admitted room, shared quota pacing, early stopping, visible cooldown, measured capacity |
| Payment integration delayed until late | Medium / high | Build fixed-bundle payment vertical slice in M1, before visual polish |
| One merchant demo misrepresented as marketplace settlement | Medium / high | Visible disclosure; future real merchant integration explicitly separated |
| Capture succeeds while application times out | Medium / high | Stable operations, persisted order mapping, reconciliation, no premature stock release |
| Inventory race or stale quote charged | Medium / high | Atomic holds, immutable snapshots, expected-version checks, concurrency tests |
| Shared demo abused or depleted | Medium / medium | Quotas, protected resets, owner diagnostics, safe seed replenishment |
| Schedule expands into a full marketplace | High / high | Enforce P0/P1/P2 boundary and the cut list; one category, one currency, one seller per checkout |
| Judges cannot access external providers | Medium / high | Test fresh-browser access, hosted readiness, clear sandbox buyer instructions kept separate from secrets |
| Public repository exposes credentials/private data | Low / high | Placeholder configuration, secret scan, fictional fixtures, log redaction |
| Unsupported claims in pitch | Medium / medium | Show actual behavior and measured results; label fixture ratings, simulated sellers, and video cuts |

## M0 checks to resolve during implementation

These are implementation preflight tasks, not requests for approval now:

1. Confirm the event's complete official rules and deadline on its authoritative submission page; only the pasted overview is currently archived.
2. Verify the project's PayPal developer account, sandbox merchant/buyer setup, required checkout behavior, and webhook delivery.
3. Verify Groq free-tier access, GPT-OSS 20B strict-output/quality behavior, exact account limits, and measured tokens per run. Record whether the configured free model meets the acceptance targets; no paid fallback is assumed.
4. Confirm supported library/runtime versions and Render resource availability/cost within the agreed spending envelope.
5. Validate the buyer's actual availability and adjust the 128-hour capacity assumption if needed.
6. Confirm whether the team wants to keep creator equipment as the first category; it is the proposed baseline, not a dependency on a real supplier.

No domain registration, public branding clearance, vendor account creation, deployment, remote repository creation, or spend is included in this planning task. The name Pactra is the selected working product name; availability has not been researched.

## Change management

Use this planning pack as the baseline at implementation start. Record meaningful scope or architectural changes here and update related acceptance criteria and fixtures together. Prefer a smaller complete P0 to accumulating half-connected features. A future builder should be able to understand the final design without reconstructing the chat.
