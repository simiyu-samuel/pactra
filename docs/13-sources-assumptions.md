# Sources and assumptions

Technical references were checked on October 17, 2026. They establish supported capabilities; the detailed workflow and safeguards in this pack are Pactra's proposed design. Recheck provider versions, account availability, and pricing during implementation.

## Supplied hackathon material

The user supplied a pasted PayPal AI Hackathon overview. Its summary is retained in [the reference asset](../assets/references/hackathon-brief.txt). The original attachment was read from `/home/simiyusamuel/.codex/attachments/8d0be3cd-63a9-47c4-88dc-de7cc2ccac8d/Pasted text.txt`.

The plan uses its requirements for meaningful PayPal + AI use, a functioning prototype, public licensed source, a runnable setup or hosted demo, tool disclosure, a public YouTube video under three minutes, and the listed judging criteria. The provided deadline is November 12, 2026 at 23:00 GMT+3, equivalent to Africa/Nairobi time.

The full official rules, authoritative event URL, eligibility exceptions, and detailed schedule were not included. Confirm these before submission. The pasted text contains different aggregate prize totals, so no aggregate prize figure is used to justify the project or budget.

## PayPal primary sources

| Source | Capability or decision supported |
| --- | --- |
| [Standard checkout integration](https://developer.paypal.com/studio/checkout/standard/integrate) | Browser approval with server-side order creation/capture and sandbox testing |
| [Orders v2](https://developer.paypal.com/api/orders/v2/) | Order creation, retrieval, and capture operations |
| [Idempotency](https://developer.paypal.com/api/rest/reference/idempotency/) | Request IDs, retry behavior, and endpoint-specific support considerations |
| [Webhook verification](https://developer.paypal.com/api/webhooks/v1/verify-webhook-signature-post) | Server-side event verification using configured webhook identity and provider headers |
| [Webhook event names](https://developer.paypal.com/api/rest/webhooks/event-names/) | Distinguish approval, capture, pending, refunds, and reversals; do not use marketplace-only completion events as a standard-checkout assumption |
| [Platforms overview](https://developer.paypal.com/platforms/overview) | Sandbox development and approval for live platform/marketplace operation |

The previous brainstorm mentioned PayPal's agent toolkit. P0 deliberately uses an explicit server payment adapter; adding an MCP layer is not necessary when the negotiation model has no payment authority. A meaningful integration is measured by the working payment flow, not by the number of tools attached to an agent.

## Groq primary sources

The user confirmed Groq, the API platform with a free tier, as Pactra's AI provider. This supersedes the original OpenAI-hosted API choice.

| Source | Capability or decision supported |
| --- | --- |
| [Groq quickstart](https://console.groq.com/docs/quickstart) | API access and server-side key configuration |
| [Structured outputs](https://console.groq.com/docs/structured-outputs) | Supported strict-schema models and API-mode restrictions |
| [Rate limits](https://console.groq.com/docs/rate-limits) | Free-plan reference limits, account-specific scopes, and retry/reset metadata |
| [Supported models](https://console.groq.com/docs/models) | Current model identifiers and production/preview distinction |

Groq-hosted `openai/gpt-oss-20b` is the initial model. Its model publisher prefix does not mean Pactra calls the OpenAI API. Free capacity, measured latency, and access must be verified for the project account. See the [Groq AI plan](14-groq-ai-plan.md).

## Hosting primary sources

| Source | Capability or decision supported |
| --- | --- |
| [Render background workers](https://render.com/docs/background-workers) | Persistent worker process without inbound HTTP |
| [Render deployments](https://render.com/docs/deploys) | Deployment behavior and temporary filesystem considerations |

## Assumption ledger

- One primary builder and about 128 hours including contingency.
- A browser-based English experience with desktop demo emphasis and usable mobile layouts.
- Three fictional sellers, eight fictional product types, twenty-one seller listings, USD, and one synthetic delivery zone.
- Fixture product scores, stock, prices, warranties, and shipping estimates are invented demonstration data.
- One sandbox business account receives every demo purchase; no real payout/settlement or shipment occurs.
- Every purchase requires a human choice and official PayPal approval.
- AI uses the Groq free tier, with a $0 inference target and no automatic paid fallback. Three agent identities do not imply three simultaneous provider requests.
- The first application build and local verification are recorded in [implementation status](15-implementation-status.md). Live model/payment checks, cloud deployment, and public hackathon submission are not yet claimed.

These assumptions make the build concrete. They should be updated when the user steers the implementation, not treated as established external facts.
