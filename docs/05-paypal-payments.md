# PayPal and payment integrity

## Payment arrangement

P0 uses one platform-owned PayPal sandbox business account and a separate sandbox buyer account. Pixel Port, Studio Stack, and Swift Gear are fictional storefronts sharing that demo merchant. The interface and video must disclose this. There are no real shipments, real seller payouts, platform commissions, or escrow.

A real marketplace is a later integration. [PayPal's platform overview](https://developer.paypal.com/platforms/overview) describes sandbox testing and approval for live marketplace credentials. Do not assume the single-merchant demo authorizes collecting money for unrelated real sellers.

## Selected PayPal capabilities

- PayPal browser checkout component for explicit buyer approval.
- Orders v2 with `intent=CAPTURE`, followed by server-side capture after approval.
- Server-side retrieval of order and capture details for uncertain outcomes.
- Verified payment webhooks and durable reconciliation.

Use the [standard checkout integration](https://developer.paypal.com/studio/checkout/standard/integrate) and [Orders API reference](https://developer.paypal.com/api/orders/v2/) as the implementation baseline. Use the supported checkout SDK version verified during M0; do not mix examples from different SDK generations.

The server uses `https://api-m.sandbox.paypal.com`. The sandbox environment is mandatory for the hackathon build. Live credentials, vaulting, and unattended charging are outside scope.

## Agreement snapshot

Accepting an offer creates a server-owned immutable snapshot containing:

- Session, brief version, offer ID and version, seller ID and policy version.
- Exact listing IDs, product descriptions, quantities, and unit prices.
- Item subtotal, shipping option and cost, demo tax amount, final total, and currency.
- Supported delivery estimate, destination zone, warranty terms, and prototype disclosures.
- Acceptance timestamp, reservation deadline, configured sandbox merchant identity, and canonical snapshot hash.

The hash detects accidental mismatch and binds internal references. It is not a third-party legal signature or proof against a compromised server. Changing any payable term requires a new snapshot and approval.

P0 uses a fixed seeded destination zone and a disclosed zero-tax fixture. It does not calculate real sales tax or offer global shipping. Before using real products, replace these assumptions with applicable tax and fulfillment logic.

## Happy-path sequence

```mermaid
sequenceDiagram
    participant B as Buyer
    participant W as Web/API
    participant D as PostgreSQL
    participant P as PayPal sandbox
    participant R as Reconciliation worker
    B->>W: Select current eligible offer
    W->>D: Atomically validate, snapshot, reserve stock
    D-->>W: Checkout ID and immutable agreement
    W-->>B: Exact agreement review
    B->>W: Start PayPal approval for checkout ID
    W->>D: Claim create operation with stable request ID
    W->>P: Create matching order
    P-->>W: PayPal order ID
    W->>D: Persist order ID before capture is possible
    W-->>B: Open official PayPal approval
    B->>P: Approve sandbox purchase
    B->>W: Request capture for own checkout
    W->>D: Claim capture operation; recheck immutable agreement
    W->>P: Capture same order with stable request ID
    P-->>W: Verified server response
    W->>D: Apply payment state and inventory effect atomically
    P->>W: Signed webhook, possibly later or duplicated
    W->>D: Verify, deduplicate, apply or enqueue reconciliation
    R->>P: Retrieve status when result is uncertain
    R->>D: Apply confirmed state idempotently
    W-->>B: Persistent receipt or accurate pending state
```

The browser sends offer IDs or checkout IDs, not authoritative money or a merchant ID. The server derives the PayPal amount, currency, and item breakdown from the locked snapshot. Only one purchase unit is needed for P0.

## Approval and capture gates

The review screen is a deliberate human checkpoint before the PayPal button. The official PayPal flow supplies payment approval. The app never treats an agent's recommendation, a return URL, a browser callback, or `CHECKOUT.ORDER.APPROVED` alone as evidence that funds were captured.

Before capture, verify ownership, the local-to-PayPal order mapping, current checkout state, reservation validity, amount, currency, configured payee, and unchanged snapshot. Once capture starts, the checkout is not editable or replaceable until its outcome is known.

Mark a purchase paid only after a completed capture is established from a server-to-server provider response or verified event/retrieval, and the amount, currency, payee, and linkage match the snapshot. Pending remains pending. Suspicious mismatches enter review and reconciliation rather than a success screen.

## Inventory and expiry

An unlocked offer expires ten minutes after creation. Offers do not reserve stock. Starting checkout atomically reserves every bundle item for a ten-minute approval window. Insufficient stock causes the whole reservation attempt to fail.

Track physical demo stock as `on_hand`; usable availability is `on_hand` minus quantities in active reservations. On confirmed completed capture, decrement `on_hand` and consume the reservation in one transaction, once. A cancellation or definitive unpaid failure releases its hold. Refunds and reversals update payment history; they do not automatically restock physical goods.

Expiry processing must not release stock while create/capture outcomes are unknown, capture is in flight, or payment is pending. Reconcile first and retain the hold while an outcome could still consume stock. Alert the owner after a prolonged unresolved result. If an unexpectedly late completed payment arrives after a hold was wrongly released, record the payment, flag an inventory exception, stop further sale of affected stock, and require owner resolution; never erase a real provider result.

An unpaid local checkout can be cancelled before capture starts. Invalidate it server-side and reject future capture attempts, including from an old approval window. Do not assume a generic remote "cancel order" API exists for this flow. Do not auto-capture from approval webhooks.

## Idempotency and crash recovery

Create a durable operation row before each external mutation. Store a distinct stable `PayPal-Request-Id` for create and capture; repeat the same key for retries of that operation. [PayPal's idempotency guidance](https://developer.paypal.com/api/rest/reference/idempotency/) explains this header and notes support/retention vary by endpoint. Verify those endpoint details during implementation.

Database uniqueness prevents multiple successful checkouts per session, duplicate PayPal order/capture mappings, and repeated stock finalization. Serialize an operation with compare-and-set state and a bounded lease. Do not claim a distributed exactly-once guarantee: callbacks, jobs, and webhooks may repeat. Their durable business effects must be idempotent.

If PayPal times out, do not start a new order or use a fresh capture key. Retrieve the known order/capture or retry the same operation as documented. If the process crashes after capture and before local commit, reconciliation recovers from the already persisted order and operation record.

## Webhooks

Receive PayPal headers and the event body, enforce body-size limits, and use the configured webhook ID and [signature verification endpoint](https://developer.paypal.com/api/webhooks/v1/verify-webhook-signature-post). Apply business effects only after successful verification. Preserve the body needed for verification, store a restricted inbox record, and deduplicate by provider event ID. Acknowledge after durable intake; processing retries can run in the worker. Failed verification causes no payment effect.

Subscribe to relevant [documented events](https://developer.paypal.com/api/rest/webhooks/event-names/), including capture completed, pending, declined, refunded, reversed, and approval reversal. Use `CHECKOUT.ORDER.APPROVED` for observation/reconciliation only. Do not depend on `CHECKOUT.ORDER.COMPLETED`, which the documentation restricts to marketplace/platform use.

Reordered events never blindly downgrade a completed capture to pending. Record every verified event; resolve contradictory or stale events by retrieving current provider state. Map only known order/capture IDs to owned local checkouts. Real sandbox transactions are required to prove webhook integration; simulator events alone are insufficient.

## Failure behavior

| Failure | Required response |
| --- | --- |
| Offer stale, expired, or policy changed | Reject selection; refresh or negotiate again |
| Stock lost before acceptance | Explain unavailability; leave no partial reservation |
| User cancels approval | Keep unpaid; permit local cancellation and release after safe state check |
| Provider create/capture timeout | Show checking payment; enqueue reconciliation; no duplicate checkout |
| Capture pending | Retain reservation and show pending; no paid receipt or fulfillment claim |
| Definitive declined capture | Record failure; release hold when verified safe; allow a deliberate retry |
| Invalid signature or unknown webhook linkage | No business effect; retain diagnostic metadata and alert if needed |
| Amount, payee, or currency mismatch | Freeze checkout for review; no automatic fulfillment or success |
| Duplicate request or webhook | Return current result or acknowledge; apply no duplicate stock effect |

## Payment completion gate

Before feature freeze, demonstrate: an actual sandbox capture, matching ledger/snapshot, duplicate capture protection, verified webhook intake, recovery from an uncertain response, concurrent last-item reservations, and correct pending/cancelled states. Payment completion is central to the judged project, not a mocked final button.

## Implemented recovery update — October 19

The webhook route now verifies the signature and persists the notification before acknowledgment. The worker drains the durable inbox with a 45-second lease, per-claim fencing, twelve-attempt limit and exponential retry delay (five seconds initially, up to one hour). Duplicate deliveries preserve the first body. Unmapped or conflicting references remain unprocessed with a safe error code; unsupported event types are recorded without payment effects. `pnpm status:payments` reads queue/state summaries without exposing provider bodies or credentials.

Order retrieval is authoritative for approval/capture reconciliation. Completed capture amounts, currencies and identities are checked separately from the order total. A known capture ID cannot silently change. Full `REFUNDED` capture evidence preserves the original capture and refunded receipt, including when refund evidence precedes local completion. Refund/reversal notifications must identify the known capture and full USD amount; partial or unconfirmed returns require review. Reversal takes precedence over refund when events are reordered. Confirmed receipts cannot be overwritten by stale pending or mismatched retrievals. No return automatically restocks inventory.

Before expiring an approval with a remote order ID, the worker retrieves its current state. Pending or unavailable payment evidence retains the hold; a confirmed completion consumes it once. The original create/capture request keys survive uncertain responses. The current implementation uses the checkout's durable keys, state and operation timestamp rather than a separate operation table.

Verification: 85 backend tests passed, with real PostgreSQL and stubbed provider responses, including nineteen recovery tests and five additional capture-evidence cases. Actual sandbox buyer approval/capture and external HTTPS signature delivery remain separate release gates. The owner console does not yet offer payment-case resolution or dead-inbox retry controls; inspect and resolve these cases against PayPal evidence before deliberately requeuing an identified event.
