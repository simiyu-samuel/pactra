# Agent and negotiation specification

## Roles and context separation

| Role | Objective | Context allowed |
| --- | --- | --- |
| Brief interpreter | Convert user intent into a confirmable specification | User text, supported categories and fields; no seller-private data |
| Buyer agent | Improve the buyer's utility within confirmed limits | Private buyer cap and priorities, public request, validated offers, own counter history |
| Seller agent | Reach a permitted sale while preserving its seller's strategy | Its own catalog, stock view, floor prices, delivery rules, public request, counters addressed to it |
| Comparison explainer | Describe deterministic results faithfully | Validated offers, computed scores, factual deltas, selected brief version |
| Orchestrator | Enforce workflow and invariants | Server state; this role is ordinary application code |

Each seller is a separate model invocation and history. Sellers cannot see competitors' private policies or raw internal model messages. The buyer cannot access seller floors. Do not rely on a prompt asking one model to pretend to be every party in one conversation.

## Public and private buyer requirements

The confirmed brief includes currency, maximum total spend, optional target spend, maximum arrival days, required product roles, required capabilities, accepted substitutions, and preference weights.

The hard cap is kept out of seller context by default. Sellers receive required capabilities, delivery constraint, item roles, and the buyer's actual proposed totals or concessions. The UI must let the buyer explicitly choose whether to disclose a budget. Do not promise that sellers cannot infer a budget from counters or the buyer's own wording.

If the brief is ambiguous, request clarification before negotiating. Unsupported requirements produce an explicit unsupported or no-deal result; they do not become fabricated product facts.

## Seller strategies

- **Pixel Port:** price-first; can lower listed item prices within floors; fixed available shipping choices.
- **Studio Stack:** bundle-first; can offer stronger accessory concessions while holding a higher camera floor.
- **Swift Gear:** speed-first; shorter seeded delivery estimates and less camera-price flexibility.

Personalities influence choices, not permissions. A strategy is not authority to violate a floor, give an unlisted warranty, or promise a different delivery window.

## Proposal contract

A seller decision has one action: `offer`, `hold`, or `decline`. An offer references seller ID, brief version, policy version, round, listing IDs, quantities, proposed unit prices in integer cents, a permitted shipping option, permitted warranty terms, a short public message, and evidence references. Expiry and authoritative totals are assigned by the application.

The server recomputes item totals, shipping, and total payable. Seller-generated numeric totals are discarded. No arbitrary discount labels, shipping promises, URLs, payment recipients, or executable content are accepted.

A buyer counter references a specific validated offer and requests permitted changes: a target price, substitution, removal of an optional item, or a listed shipping option. The buyer may ask below a seller's unknown floor; the seller can decline. Required items cannot be removed without a new user-confirmed brief.

## Model integration

Use Groq Chat Completions through `groq-sdk`. Extraction, seller proposals, buyer counters, and explanations return complete strict JSON decision envelopes. The orchestrator interprets and validates these envelopes as domain actions; they are not provider tool calls. Keep the room event stream at application level. The [Groq AI plan](14-groq-ai-plan.md) defines the supported API mode and its limitations.

The user-selected provider is Groq. Start with `openai/gpt-oss-20b` for every role and evaluate `openai/gpt-oss-120b` only as an explicitly configured quality alternative if needed and available within the free plan. Both names identify models hosted by Groq; no OpenAI API account or key is required. Verify model access, strict-schema support, and the account quota in M0. Record provider, exact model ID, prompt version, and schema version for every run. Do not automatically switch models or use a paid provider when quota is exhausted.

For P0, give each invocation a bounded preloaded view of the authorized catalog and relevant validated history. A seller response contains a candidate action for the orchestrator; it does not execute arbitrary external tools. Use non-streaming provider calls and publish a room event after validating each completed decision. Do not add web browsing, shell execution, open-ended MCP servers, or payment tools to the negotiation context.

Handle refusals, incomplete responses, schema errors, provider timeouts, and rate limits as explicit outcomes. A malformed proposal gets at most one correction attempt if the remaining session budget allows it. An explanation that contradicts the computed result falls back to a factual template. Never replace a failed live negotiation with an unlabeled prerecorded success.

## Three-round protocol

1. **Round 1 — opening:** three sellers independently propose a bundle, hold, or decline.
2. **Buyer turn 1:** inspect published offers and issue at most one counter per participating seller in one structured buyer response.
3. **Round 2 — concessions:** sellers respond to their own counter using their own policies.
4. **Buyer turn 2:** request a final permitted improvement or stop negotiating with a seller.
5. **Round 3 — final:** sellers return their final valid offer, hold, or decline.
6. **Decision:** application code filters and scores eligible offers. The explainer describes the evidence. The user chooses.

Early stop is allowed when all sellers decline, no seller can improve, the user stops, or limits are reached. The best still-active eligible offer remains selectable after a later seller timeout. A seller can supersede its previous offer by issuing a replacement; superseded offers cannot be accepted.

Nominal full-run budget per brief version: one interpreter call, nine seller calls, two buyer calls, and one explanation call, totaling thirteen. Allow up to sixteen provider requests including retries, and at most thirty-two requests across the session's maximum two brief versions. Count every actual provider request, including retries and any continuation. Hard stop a version after 300 seconds, including provider cooldowns after admission. Pace calls against shared token/request quotas; stop with current valid offers when the remaining time cannot support another complete round. A rejected third brief version prompts a fresh session rather than extending the quota silently.

These limits are initial engineering defaults. Measure actual tokens and latency before changing them. The demo should normally use fewer calls through early stopping.

## Validation order

1. Confirm expected role, seller, session, brief version, step key, and current job generation.
2. Confirm listing ownership, supported quantity, active policy version, and current inventory eligibility.
3. Validate unit-price floors, quantity bounds, shipping option, supported capabilities, compatibility, and fixed warranty rules.
4. Calculate all money in integer cents and apply the configured demo tax assumption.
5. Check hard requirements. An offer may be recorded as an above-budget negotiating position, but is prominently ineligible and cannot be selected for payment.
6. Assign server ID, expiry, version, validation status, and a public event projection.

Policy-invalid proposals are never shown as offers. Valid seller proposals that miss a buyer constraint can be shown as ineligible with a specific reason, so the buyer can understand the negotiation. Only eligible offers enter ranking and checkout.

## Ranking specification

Hard constraints are evaluated before scoring: matching currency, all-in total at or below cap, arrival within the specified maximum, required item roles and capabilities, compatible items, positive stock, supported destination, unexpired offer, and current brief/policy versions.

For the initial "quality first" preset, weights total 100: camera capability 70, price 20, delivery 5, microphone capability 5. Product capability scores are disclosed fictional fixture values, not real-world reviews or model-invented ratings.

- Camera component: catalog capability score from 0 to 100.
- Microphone component: catalog capability score from 0 to 100.
- Price component: 100 multiplied by `(cap - total) / cap`, clamped to 0–100.
- Delivery component: 100 multiplied by `(maximum_days - arrival_days) / maximum_days`, clamped to 0–100.
- Final utility: weighted average of those components.

Require cap and maximum days to be positive. Compare using unrounded values; round only for display. Break ties by lower total, earlier arrival, then stable offer ID. Include a "lowest cost" preset with price 70, camera 15, delivery 10, microphone 5. Manual weight edits must normalize to 100 and create a new brief version.

The utility score expresses the buyer's selected preferences. It is not an objective quality certification. The user may choose a different eligible offer.

## Revisions and cancellation

Every revision creates a new immutable brief version and job generation. Cancel pending work for the old generation, reject new acceptance of its offers, and negotiate again against the new brief. Do not rewrite an old offer into the new version. Payment-locked checkouts freeze revisions until cancelled or resolved, as defined in the payment specification.

## Evidence and trace design

Persist model/provider request IDs, prompt and schema versions, role, step, timing, token usage, validation outcome, accepted action, and catalog/policy references. Redact private inputs from the buyer projection. Public explanations must reference actual offer IDs and product fields. Display concise action summaries; do not request or publish hidden chain of thought.

The example transcript in assets is an illustrative design fixture. A live demo must generate its own decisions. Evaluate on validity, faithful explanations, meaningful changes in response to altered requirements, honest failure, and bounded completion rather than reproducing an exact sentence or discount.
