# Groq AI implementation plan

Provider decision: user-confirmed on October 17, 2026. Planning only; no credentials, inference calls, paid resources, or application code have been created.

## Baseline

| Setting | Planned value |
| --- | --- |
| Provider | Groq API, free plan |
| Initial model | `openai/gpt-oss-20b` |
| Optional quality benchmark | `openai/gpt-oss-120b`, explicitly configured only if available in the free account |
| JavaScript client | Official `groq-sdk` |
| Endpoint family | Chat Completions at `https://api.groq.com/openai/v1` |
| Authentication | Server-only `GROQ_API_KEY` |
| Model configuration | `GROQ_MODEL`; initial model above, verified during M0 |
| Agent output | Strict JSON decision envelope with application-level business validation |
| Initial execution capacity | One admitted room and one provider request in flight |
| AI spending target | $0 inside verified free-plan limits; no automatic paid fallback |

The `openai/` prefix identifies the model publisher. Inference is served through Groq, using a Groq key. The three seller agents and the buyer have independent histories and objectives; they can use the same hosted model.

## Supported output mode

Groq's [structured-output documentation](https://console.groq.com/docs/structured-outputs) lists GPT-OSS 20B and 120B as strict-schema models and currently excludes combining structured outputs with streaming or tool use. P0 therefore requests a complete JSON response for each decision. The server validates and applies its action; no provider tool call or token stream is required.

Use explicit action values such as offer, hold, decline, and counter. Product IDs, prices, and terms still pass deterministic validation. Strict schema shape does not establish stock availability, permitted pricing, factual correctness, or approval to pay.

Room progress remains live through Pactra's own persisted SSE events: seller started, offer accepted by validator, buyer countered, round completed. There is no claim that individual JSON tokens are streamed from the model. The application publishes only completed validated decisions.

## Free-tier capacity

The [published rate-limit reference](https://console.groq.com/docs/rate-limits) currently lists the following for the proposed GPT-OSS models:

| Reference limit | Value |
| --- | --- |
| Requests per minute | 30 |
| Requests per day | 1,000 |
| Tokens per minute | 8,000 |
| Tokens per day | 200,000 |

The project's actual organization/model limits and provider reset signals are authoritative. These are reference values, not a reservation of capacity for Pactra or a promise that limits remain unchanged.

## Scheduling design

All inference paths share one database-backed admission controller, including brief interpretation, negotiation, explanations, and owner tests. Reserve estimated input plus bounded output before dispatch; reconcile actual usage afterward. Account for every applicable minute/day request/token constraint and preserve headroom for estimation error and other account usage.

Each seller keeps its separate context even when requests are scheduled sequentially. Buyer counters wait for the seller round. Queue new rooms rather than launching parallel bursts against one free allowance. Honor reset/cooldown signals and `retry-after` when supplied. A provider cooldown is not a model failure and must not trigger an immediate retry storm or credential/model rotation.

The full three-round protocol uses thirteen nominal model calls per brief version. At an illustrative 1,500 total tokens per call, that is 19,500 tokens before retries, so it cannot be assumed to fit one minute of the reference allowance. Measure prompt/schema/history overhead and real completion usage before estimating demonstration capacity.

Compact role context, relevant catalog rows only, bounded recent public history, short public messages, and early stopping should reduce usage without changing accepted business rules. Keep the sixteen-request per-version ceiling and a 300-second active-version deadline. End with available valid offers if another round cannot safely finish.

## Verification before implementation proceeds beyond M0

1. Confirm a Groq API key and the free plan's current model access in the project account.
2. Exercise extraction, seller action, counter, and explanation schemas with no streaming/tool combination.
3. Benchmark quality and total tokens per step; confirm independent role context and honest no-deal results.
4. Read actual quota/reset metadata and test the shared scheduler using reproducible limit fixtures.
5. Set per-call completion/reasoning budgets supported by the chosen model; verify schema responses finish within them.
6. Record measured active-run and queue latency separately. Fit rehearsal/evaluation runs into daily allowance.

If the free allowance is exhausted, show a waiting or bounded-stop state and preserve current offers. A paid plan, alternate paid provider, or account change requires a separate explicit decision. No key is needed for reviewing this planning pack.
