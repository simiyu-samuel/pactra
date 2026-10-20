# Faster negotiations and the PayPal payment journey

Implemented October 20, 2026. The marketplace remains negotiation first; external discovery and flights are supporting tools.

## Negotiation changes

New jobs save a versioned plan in the existing durable checkpoint. Only sellers with published stock for the complete selected basket participate. The default sequence is opening offers, one buyer counter step, then seller responses. One eligible seller uses three model calls instead of eleven; multiple eligible sellers retain separate private contexts. Existing jobs without the new plan finish on their original schedule.

Models receive compact product and offer facts, excluding image URLs and unrelated products. Server-side minimum price, stock, exact products, quantity, shipping, budget and delivery checks remain in force. A stock change can withdraw an unavailable seller without another model call. The worker skips jobs whose quota pause has not elapsed, preserves the plan when recording counters, fences stale worker commits by lease, and sleeps only when idle. Payment maintenance runs separately from model latency. Provider quotas and cooldowns remain enforced.

The public room projection includes participant seller IDs and accurate round counts, not the private checkpoint. Only participating sellers appear in the room. Buyers can review a valid current offer while other work is in progress.

### Live measurement

A live Groq run in room `78b1a5dd-f0d5-4811-a974-de8e9dd9115a` used three calls. From the room creation timestamp, the first offer arrived at 2,450 ms, the buyer counter at 3,336 ms, the revised offer at 4,552 ms, and completion at 4,710 ms. AeroPress total including the same standard delivery changed from $46 to $43. Earlier reviewed eleven-step runs took approximately 130–135 seconds. This is one measured local run with available quota, not a latency guarantee or a percentile benchmark.

The first browser admission attempt during development compilation exceeded Prisma's interactive transaction timeout and rolled back. Retrying its same command key after setting a bounded 15-second admission transaction limit created one room. Future latency measurements should include request/admission time separately from worker execution, quota waits and provider calls.

## Orders and payments

`/orders` contains agreements belonging to the current buyer browser. It preserves accepted products, quantities, agreed delivery/warranty, recorded asking total, negotiated savings and actual payment references. Savings use the same delivery option and the accepted snapshot, not a later catalog price. The seller workspace has an Orders & payments tab with the same accepted terms, payment status and refund requests. Seller order projections exclude buyer private budgets and minimum-price rules.

PayPal Orders v2 continues to use CAPTURE with explicit buyer approval. Purchase descriptions now identify a negotiated sandbox purchase rather than a fictional creator kit. New snapshots describe the test-payment and fulfillment boundary accurately; existing snapshots are never rewritten. PayPal confirms payment, while Pactra records and checks the commercial terms. The prototype does not arrange real shipments, seller payouts, escrow or live charging.

### Full refund workflow

An additive `RefundRequest` table records one full refund request per agreement. A paid buyer may request a refund with a reason; the seller can also prepare a request. Preparation does not contact the refund API. The seller must separately approve the displayed full amount against the request ID and unchanged order total.

The server records approval and a stable provider request key before requesting the refund. A lease prevents simultaneous approvals. It verifies the returned USD amount, refund ID and available capture linkage. PENDING stays separate from a confirmed return; mismatches require review. Recovery reuses the original key or retrieves the known refund, and unknown outcomes older than a day require operator review. Physical stock is never automatically replenished by a refund.

The order assistant uses Groq to choose one of three narrowly scoped actions: explain the agreement, check its PayPal status, or prepare a refund draft. Facts in its final response come from the server's order record. No money-changing tool is exposed to the model. The existing PayPal REST adapter is reused; this slice does not claim an Agent Toolkit integration.

## Local HTTPS webhook with ngrok

A local proxy forwards only `POST /api/webhooks/paypal` from port 3102 to the web app at port 3100. It preserves PayPal verification headers, limits the body to 50 KB, omits browser cookies and rejects other routes. It does not expose the seller workspace, catalog or browser sessions through the tunnel.

```sh
pnpm webhook:proxy
ngrok http http://127.0.0.1:3102
pnpm webhook:setup https://YOUR-NGROK-HOST/api/webhooks/paypal
```

The setup command uses the configured sandbox app, reuses an exact matching webhook or creates a new one for supported capture/approval events, and writes `PAYPAL_WEBHOOK_ID` to ignored `.env.local` with mode 0600. It leaves unrelated webhook registrations unchanged. Restart web and worker after setup. If the tunnel host changes, register the new URL again. ngrok must remain running for PayPal to reach the listener.

The tunnel was registered successfully on October 20. Public GET requests to the app root and seller routes returned 404. An unsigned POST reached the application and returned 400, with no payment effect. This proves routing and rejection, not signed delivery. PayPal's webhook simulator cannot prove this application's postback signature-verification flow; use an actual sandbox transaction.

## Validation and remaining evidence

All 118 regression tests passed against isolated `pactra_test` with provider stubs, including four new worker tests, eight order/refund tests and accurate short-plan conversation progress. Strict TypeScript passed. New cases cover three-call completion, paused-room scheduling, stale leases, stock changes without AI usage, buyer isolation, seller projection redaction, explicit refund approval, duplicate prevention, original-key recovery after a lost response, pending/mismatched refunds and an AI draft that cannot execute a refund.

Actual sandbox buyer approval/capture, signed webhook processing, and live refund confirmation must be recorded separately from stubbed tests. Buyer approval was requested for the measured $43 agreement; it remained unpaid and its ten-minute reservation expired. A code review also identified an approval-window teardown when polling changed reserved to awaiting approval. The checkout now keeps the SDK mounted across those two states, while closing it when payment becomes unavailable or confirmed. The final optimized production build passed. Desktop and actual 390px mobile buyer history were reviewed; the mobile document measured 375px scroll/client width in a 390px viewport, without horizontal overflow. Screenshots are in assets/previews/pactra-buyer-agreements*.jpg. No Render deployment has occurred.

References: [PayPal checkout](https://developer.paypal.com/studio/checkout/standard/integrate), [Payments v2](https://developer.paypal.com/api/payments/v2/), [webhooks](https://developer.paypal.com/api/rest/webhooks/rest/), [webhook management](https://developer.paypal.com/api/webhooks/v1/), [Groq quotas](https://console.groq.com/docs/rate-limits), [ngrok](https://ngrok.com/docs/start).

Production HTTP checks passed the homepage, negotiation, buyer history, seller workspace, flights and database readiness. Unauthenticated seller orders returned 401, a forged origin returned 403 before AI dispatch, and authenticated seller projections excluded private floors and buyer budgets. A live order-assistant call was not executed: automatic approval review rejected transmission of private order facts to Groq. Its supported actions and no-refund-execution boundary were verified with stubbed model responses.
