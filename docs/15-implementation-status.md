# Implementation status

Updated October 19, 2026. The other documents describe the intended hackathon release; this file records what actually exists.

## October 19 marketplace expansion

The owner approved a consumer marketplace with native sellers, Channel3 retail discovery and Groq marketplace search. [Document 16](16-marketplace-expansion.md) is the current scope baseline.

- Implemented root storefront with product illustrations, categories, search sources, source/price/stock labels, product-detail dialogs, up-to-three-item comparison, retailer cards and original merchant handoffs. Existing creator-kit negotiation moved to `/negotiate`; room/checkout/owner paths remain available.
- Installed the official Channel3 API skill in `.agents/skills/channel3-api`; integrated pinned official SDK 4.3.0 and adapted official MIT product-card/helper source. Credentials are environment-only.
- Applied additive discovery-ledger migration to local development and isolated test databases. Owned same-origin requests, per-browser pacing, rolling provider daily caps, ID-only Channel3 caching, fresh product retrieval and safe public HTTPS destinations are implemented.
- Live Channel3 adapter check: eight products, fourteen merchant offers, images present on all fourteen. The storefront independently rendered fourteen live offers with real images; opening a product refreshed and produced a current attributed merchant link. This verifies discovery, not a purchase or merchant fulfillment.
- Live Groq browser-search check: eight Jumia Kenya source results. These carry unknown structured price/stock; technical source titles are normalized. Jumia discovery is verified; Kilimall and Amazon use the same domain-restricted adapter but have not had individual live-provider checks in this slice.
- Browser walkthrough verified native category filtering, product details, two-item comparison, source switching, real Channel3 results, current merchant links, and return navigation from `/negotiate`. Desktop and 390px mobile layouts were inspected without document horizontal overflow. Existing kit preference controls still work.
- Latest regression suite: 42 backend tests passed, including six source/URL normalization tests and five real-PostgreSQL cache, ownership, quota and recovery tests. Strict TypeScript passed. The optimized production build passed, including Next.js TypeScript validation and route generation. Production HTTP checks passed storefront/native routes, public redaction, guest ownership, forged-origin rejection, invalid input and foreign product refresh rejection, without provider calls. A fresh browser tab rendered the production storefront; the old development tab needed replacing after the server restart.

Flights and the exact-product external benchmark feature remain subsequent phases. Native goods and merchants remain fictional; external results do not enter native PayPal checkout. Earlier sandbox capture/webhook release gaps still apply.

## Implemented in the first build

- Pinned pnpm/TypeScript workspace with Next.js web app, Node worker, shared domain rules, Prisma/PostgreSQL data layer, and Groq/PayPal integrations.
- Protected responsive seller console, separate four-hour owner sessions, durable owner login throttling, private agent instructions, validated policy publishing, and immutable policy history.
- Immutable confirmed buyer brief versions, room history, and checkout references to the accepted buyer/seller versions.
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
3. Evaluate the shipped owner console and version histories with more live policy-change scenarios. Current publishing validates optimistic policy/stock versions, pricing and reservation constraints, uses seller/listing locks, and preserves accepted snapshots. Pre-migration overwritten historical values cannot be reconstructed.
4. Add durable owner/admission abuse controls, public-demo retention/cleanup jobs, complete per-session input/output accounting, and stronger queued-session admission tests. Current global provider quotas and per-browser room count are initial controls, not a production anti-abuse system.
5. Extend failure-injection coverage for worker crash recovery, stale leases, uncertain captures, and out-of-order refund/reversal events. Current payment recovery code needs these scenarios and live sandbox verification.
6. Add explicit supported-capability extraction/clarification for the whole catalog. This first category fixes required roles to 4K camera/microphone/tripod and rejects several known unsupported capabilities; arbitrary free-text requirements are not a general catalog compatibility system.
7. Deploy the web/worker/database, independently verify clean setup, perform usability/accessibility review, and prepare the public video/submission.

No live-money access, automated unattended payment, physical fulfillment, real merchant onboarding, or cloud deployment is included in this build.

## Current UI paths and API

The application supports `/`, `/rooms/:id`, and `/checkout/:id`. Receipts are the paid state of the same immutable checkout page. Server APIs are implemented in the Next.js catch-all route; the protected `/seller-console` and `/api/owner/*` routes are implemented. A distinct receipt route is not yet shipped.

The optional AI brief reader returns a draft for the user to confirm. Live negotiation is disabled when Groq is not configured; checkout reservation is disabled until PayPal is configured. There is no prerecorded live AI or fake paid-result fallback. Default run explanations are computed factual summaries; an additional explanation-model call is not necessary in this first build.

## Local runtime note (October 19)

The project drive filled while Next.js was compiling. Only regenerable package cache was pruned, and ignored Next.js output was temporarily moved to `/tmp` during diagnosis. The normal project build directory was restored afterward. PostgreSQL recovered successfully, migration/seed checks passed, and the live negotiation/order check ran after recovery. The temporary symlink is no longer needed. Keep sufficient free disk space for PostgreSQL and the Next.js build cache. No credentials are included in the verification report or source control.

## Seller console and history verification (October 19)

- Added additive policy/brief history migrations and UTC normalization for imported baseline timestamps. Published history updates are blocked by database triggers; new checkouts reference the original version records. Existing checkouts retain their original snapshots and nullable legacy references.
- 31 backend tests passed before UI verification: existing domain/payment/quota/reservation tests plus owner token hashing, guest isolation, expiry/rotation, durable rejected-login counts, publish retries/conflicts, publisher races, invalid listings/floors, stock protection, stale-offer rejection, immutable history, and preserved reservations.
- Actual isolated HTTP checks passed for owner login/logout, origin rejection, scoped HttpOnly cookie, protected seller reads, publishing/idempotent retry/stale draft conflict, and buyer API redaction. Test credentials and the separate test database were used; external providers were disabled.
- Browser walkthrough passed: owner sign-in, seller switching, publishing a new version, visible history, and sign-out removing the private editor. No browser console errors were recorded. Desktop and 390-pixel mobile screenshots were visually inspected; neither layout overflowed the document horizontally. Screenshots use fictional isolated test fixtures.
- Private local owner access was generated with `pnpm setup:owner`; the actual code is kept only in ignored `.env.local` with owner-only file permissions.
- The development machine remains short of disk space. Only generated Next.js cache subdirectories were moved to `/tmp`; runtime output stays in the standard project directory. These local cache symlinks are ignored by Git.

- Final verification after the UTC migration and isolated-fixture reset: all 31 backend tests passed again. Strict TypeScript and the optimized production build passed, including the new `/seller-console` page.
- Production HTTP verification passed for readiness, console rendering, real local owner sign-in, private seller catalog, session revocation on sign-out, and buyer catalog redaction. The verification did not publish changes to development seller policies.
