# Implementation status

Updated October 19, 2026. The other documents describe the intended hackathon release; this file records what actually exists.

## Implemented in the first build

- Pinned pnpm/TypeScript workspace with Next.js web app, Node worker, shared domain rules, Prisma/PostgreSQL data layer, and Groq/PayPal integrations.
- Original responsive buyer interface, fictional seller previews, editable confirmed kit brief, independent seller lanes, offer comparison, brief revision, event timeline, agreement review, and payment/receipt states.
- Browser-owned opaque sessions, same-origin mutation checks, explicit public catalog projections, and private seller context boundaries.
- Database migration and idempotent fictional fixture import: eight products, twenty-one listings, three sellers.
- Deterministic pricing/compatibility/stock checks, hard buyer constraints, weighted ranking, and stale-version rejection.
- Three-round Groq worker with separate seller contexts, buyer counters, step checkpoints, model/schema validation, shared quota admission, bounded execution, and preserved valid offers on failure.
- Server-owned accepted snapshots, atomic all-item reservations, sandbox order creation, stable create/capture keys, provider-evidence checking, verified webhook intake, payment reconciliation, cancellation, and expiry handling.
- Unit tests for domain/payment evidence, isolated PostgreSQL reservation tests, browser checks, and CI configuration.

## Verification record

- TypeScript strict check passed.
- Optimized Next.js production build passed.
- 13 domain/payment-evidence unit tests passed.
- 3 real PostgreSQL integration tests passed, including simultaneous last-item reservation and idempotent acceptance/cancellation.
- 3 Chromium browser checks passed, covering desktop rendering, narrow mobile layout, public catalog field projection, forged-origin rejection, and unknown private-resource access.
- Desktop/mobile screenshots were visually inspected; the narrow layout has no horizontal overflow.
- October 19: application-level Groq strict JSON response verified with the configured GPT-OSS 20B model. Usage was recorded through the shared quota scheduler.
- October 19: one full live negotiation completed all eleven steps across three seller agents and two buyer-counter rounds, with five buyer counter messages and no failed decision steps. Studio Stack moved from $537 to $470; Swift Gear moved from $468 to $432; Pixel Port withdrew after its opening offer. The final quality-first recommendation was Studio Stack at $470 within the $500/four-day brief.
- October 19: the actual accepted $470 agreement produced a PayPal sandbox order. Retrieval verified the expected merchant, USD amount, checkout reference, and snapshot hash. The order remained CREATED and unpaid; its local reservation was cancelled and released after testing.
- October 19: fixed a live-only defect in both scheduler locks: Prisma could not deserialize PostgreSQL's void advisory-lock result through `$queryRaw`. `$executeRaw` acquires the same transaction lock without deserializing its result.
- October 19: optimized production build passed after restoring the standard build directory.
- October 19: all 19 backend tests passed (13 unit tests, three reservation integration tests, three new real-database Groq admission tests). Strict TypeScript passed. The three Chromium checks above were previously run on October 17; browser automation was unavailable during the October 19 live walkthrough.
- PayPal buyer approval/capture and real HTTPS webhook delivery remain unverified. PAYPAL_WEBHOOK_ID is not configured.

The first restricted-sandbox production-build attempt failed because its detached TypeScript subprocess output was suppressed. The normal build outside that subprocess restriction completed successfully; type checking was not disabled. Live-provider outcomes must not be inferred from stubbed/unit checks.

## Still required before a hackathon-ready release

1. Extend Groq evaluation beyond the successful live run: compare repeatability, revised/impossible briefs, rate-limit recovery, and output quality across scenarios. Per-request token usage and conservative quota pacing are active; account-wide free-tier limits still need confirmation.
2. Complete an interactive PayPal sandbox buyer approval/capture and exercise actual HTTPS webhook delivery. Sandbox authentication, order creation, and recipient/amount/reference checks now pass. Adapter and local state tests do not establish these outcomes.
3. Add the protected seller policy console and fully versioned historical buyer/seller policy records described in the full plan. Current seller policy version checks are present; the console is not shipped yet.
4. Add durable owner/admission abuse controls, public-demo retention/cleanup jobs, complete per-session input/output accounting, and stronger queued-session admission tests. Current global provider quotas and per-browser room count are initial controls, not a production anti-abuse system.
5. Extend failure-injection coverage for worker crash recovery, stale leases, uncertain captures, and out-of-order refund/reversal events. Current payment recovery code needs these scenarios and live sandbox verification.
6. Add explicit supported-capability extraction/clarification for the whole catalog. This first category fixes required roles to 4K camera/microphone/tripod and rejects several known unsupported capabilities; arbitrary free-text requirements are not a general catalog compatibility system.
7. Deploy the web/worker/database, independently verify clean setup, perform usability/accessibility review, and prepare the public video/submission.

No live-money access, automated unattended payment, physical fulfillment, real merchant onboarding, or cloud deployment is included in this build.

## Current UI paths and API

The application supports `/`, `/rooms/:id`, and `/checkout/:id`. Receipts are the paid state of the same immutable checkout page. Server APIs are implemented in the Next.js catch-all route; the planned protected owner routes and a distinct receipt route are not yet shipped.

The optional AI brief reader returns a draft for the user to confirm. Live negotiation is disabled when Groq is not configured; checkout reservation is disabled until PayPal is configured. There is no prerecorded live AI or fake paid-result fallback. Default run explanations are computed factual summaries; an additional explanation-model call is not necessary in this first build.

## Local runtime note (October 19)

The project drive filled while Next.js was compiling. Only regenerable package cache was pruned, and ignored Next.js output was temporarily moved to `/tmp` during diagnosis. The normal project build directory was restored afterward. PostgreSQL recovered successfully, migration/seed checks passed, and the live negotiation/order check ran after recovery. The temporary symlink is no longer needed. Keep sufficient free disk space for PostgreSQL and the Next.js build cache. No credentials are included in the verification report or source control.
