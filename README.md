# Pactra

**Your agent negotiates. You make the call.**

Pactra gives buyers and sellers their own negotiating agents. Buyers select products, quantities, budget and delivery limits. Sellers set asking prices, private minimum prices, stock and delivery options. Their agents exchange offers in a live conversation window with separate seller threads and a pinned deal summary; the buyer compares the complete terms and approves the exact agreed PayPal test payment. External store search and flights are optional discovery tools.

The current approved direction is [negotiation first](docs/18-negotiation-first.md). The marketplace supports any seller-listed product category. Six real branded product references with manufacturer photos are prepared as private drafts in each seller workspace. Owner review sets prices, private minimums, stock and delivery before publication. See [catalog review](docs/19-catalog-review.md).

**Project status:** negotiation-first marketplace, general product requests, real-product review drafts and seller catalog management implemented; final release validation continues. The web app, database, worker, negotiation rules, and provider adapters are implemented. The protected seller policy console and immutable buyer/seller history are implemented. Live Groq negotiation and unpaid PayPal sandbox order creation are verified; buyer approval/capture, webhook delivery, and the full hackathon release remain incomplete. See [implementation status](docs/15-implementation-status.md) for verified behavior and remaining work.

## Approved marketplace direction

See the [approved expansion plan](docs/16-marketplace-expansion.md) for the three discovery paths, consumer storefront, provider boundaries, rollout and acceptance criteria. External offers redirect to their merchant checkout; participating Pactra sellers use the existing negotiated PayPal sandbox flow. The native storefront displays published real-product listings; earlier fictional samples are archived. PayPal remains in sandbox mode.

## The native negotiation experience

> "Negotiate this backpack and kettle within $150, including delivery within five days."

The buyer confirms exact products and quantities. Independent seller agents respond within their own published stock and price limits. A live eleven-step Groq run for that mixed-category request completed successfully. Existing camera-kit rooms keep their original contracts; new buyer requests select catalog products directly.

The distinguishing feature is **negotiation over several terms with enforceable boundaries**. An attractive sentence from an agent cannot create stock, change the payable amount, or override the customer's approval.

## The hackathon release

| Decision | Baseline |
| --- | --- |
| Audience | Buyers and sellers negotiating product purchases |
| Market | Owner-reviewed product listings across categories, with optional external discovery |
| Sellers | Three simulated storefronts with separate agent context and policies |
| Checkout | One selected seller’s product agreement, USD, PayPal test payments |
| Merchant arrangement | One platform-owned sandbox business account for all simulated storefronts |
| AI | Groq API free tier, initially GPT-OSS 20B, with strict JSON decisions and application validation |
| Application | TypeScript, Next.js, PostgreSQL, dedicated Node.js negotiation worker |
| Hosting target | Render web service, background worker, and managed PostgreSQL |
| Publication | Public source repository with MIT license, working demo, and video under 3 minutes |
| Deadline supplied in the brief | November 12, 2026, 23:00 Africa/Nairobi (UTC+3) |
| Internal submission target | November 11, 2026, 21:00 Africa/Nairobi |

The product name and Groq provider were selected by the user. Other implementation choices are planning defaults for a complete hackathon build. AI usage targets the Groq free tier; account-specific limits are verified in M0, and paid inference is not an automatic fallback.

## Run locally

Prerequisites: Node.js 22+, pnpm 10.34.7, and PostgreSQL 18 (or Docker Compose). If pnpm is not installed, use `npx --yes pnpm@10.34.7` in its place, for example `npx --yes pnpm@10.34.7 install`.

1. Run `pnpm install` and copy `.env.example` to `.env.local` in the repository root. Fill the Groq, Channel3 and PayPal sandbox fields locally; never commit the populated file.
2. Start PostgreSQL with `docker compose up -d db`, or use an existing local instance and update `DATABASE_URL`.
3. Run `pnpm db:generate`, `pnpm db:migrate`, `pnpm db:seed`, then `pnpm catalog:prepare`. The last command archives sample listings and prepares private real-product drafts without overwriting your edits.
4. Run `pnpm dev` to start the web app and the negotiation/reconciliation worker.
5. Open [Pactra locally](http://localhost:3100). Without provider credentials, the product/catalog preview works and live operations display their setup requirements.

The local UI origin defaults to `http://localhost:3100`; update `PUBLIC_APP_URL` if using another origin. The demo database listens on localhost port 55439 in the supplied Compose configuration. Existing fixture stock/policy edits are preserved by seeding.

For web-only development, run `pnpm --filter @pactra/web dev`; live negotiation also needs `pnpm --filter @pactra/worker dev` in another terminal. Run `pnpm typecheck`, `pnpm test`, and `pnpm build` for the ordinary checks.

Integration tests require a **separate database named `pactra_test`**: create it, apply the migration and seed with `DATABASE_URL` pointing to that database, then run `DATABASE_URL=... TEST_DATABASE_URL=... pnpm test:integration`. These tests clear their isolated fixture data and refuse another database name. For browser checks run `pnpm test:e2e`; install the Playwright Chromium browser first if no system Chromium is available. Browser checks do not spend Groq quota or initiate payments.

For external discovery, configure `CHANNEL3_API_KEY` in `.env.local` and restart the web service. The Channel3 skill is installed under `.agents/skills/channel3-api`. Open the storefront, choose **Across retailers**, enter a product query and press Search. Jumia/Kilimall/Amazon use explicit Groq web searches and merchant redirects. Channel3 uses US/USD; Kenya delivery is not assumed. No external provider is called on initial load or typing.

`pnpm verify:discovery` explicitly performs one live Channel3 search plus current-product retrievals. Add `-- --web` to also test Jumia through Groq browser search. It uses the shared quota controls and does not initiate a purchase. Provider account limits and tool billing still apply.

After migrations, run `pnpm verify:providers` for an explicit live connectivity check. It uses one Groq request through the shared quota scheduler and authenticates PayPal sandbox without creating or capturing a payment. It does not verify the merchant recipient, buyer approval, capture, or webhook delivery.

Keep the worker running for verified webhook processing and payment recovery. `pnpm status:payments` prints a read-only summary of checkout states and pending inbox IDs, without webhook bodies or credentials. Verified notifications are acknowledged after durable intake, then retried with a lease/backoff; items that reach twelve attempts require operator review.

Register an externally reachable HTTPS `/api/webhooks/paypal` endpoint and set `PAYPAL_WEBHOOK_ID` before validating actual webhook delivery. Use sandbox merchant and buyer accounts. All accepted payment amounts come from server-owned snapshots; the browser never supplies the payable total.

## Flight discovery

Open `/flights` from the marketplace. Compare one-way/return itineraries, nearby dates, all-traveller totals, stops, travel time, baggage and reported fare permissions. **Preview an example** works without credentials and explicitly shows fictional itineraries.

For provider checks, create a Duffel **test** token and set `DUFFEL_ACCESS_TOKEN` in `.env.local`, then restart the web service. This slice accepts only tokens beginning `duffel_test_` and independently rejects live-mode responses. The default `DUFFEL_DAILY_CALL_LIMIT=100` counts allocated searches and refreshes; a flexible-date search allocates up to three provider calls. No provider calls happen on page load.

`pnpm verify:flights` explicitly performs one test-mode search. Fares can be refreshed from an owned search, but flights cannot be booked or paid for. KAYAK handoff opens its general flight-search page; no fare or reservation transfers. See [flight discovery scope](docs/17-flight-discovery.md).

## Negotiation allowance

The default demo limit is three new negotiation rooms per browser in a rolling 24-hour window. Every newly created room counts, including failed or unfinished ones. Reopening a room and retrying the same creation command use no extra slot. The negotiation page shows remaining slots, the next available time when exhausted, and links to this browser’s recent rooms.

Set `NEGOTIATIONS_PER_BROWSER_PER_DAY` to an integer from 1 to 100 in the server environment and restart the web service to change the cap. Keep the default for a public demo; local testing can use 50. This does not change Groq’s shared request/token limits or provider cooldowns. Admission is serialized per browser so simultaneous requests cannot exceed the configured cap.

## Seller workspace

Run `pnpm setup:owner` once to generate a strong owner access code in the ignored `.env.local` file. The command preserves an existing valid code and never prints it. Restart the web server, open `/seller-console`, and copy `OWNER_LOGIN_SECRET` from your local file into the sign-in form. Do not share or commit the code.

The workspace controls each fictional seller's strategy, private instructions, minimum prices, total stock, shipping, and warranty. Publishing requires a change note and creates a new immutable policy version. Private instructions and floors stay behind separate owner authentication. Existing reservations keep their accepted snapshot; unlocked old-policy offers become ineligible. Reload a draft if another edit, stock movement, or reservation conflicts with it. Owner sessions expire after four hours, sign-out revokes them, and changing the configured access code invalidates existing sessions.

New buyer briefs retain every confirmed revision; rooms show their brief history after revision. New checkouts reference their original brief and seller policy records. The migration captures available current values from older data; it cannot reconstruct earlier values that had already been overwritten.

## Read the plan

| Document | What it answers |
| --- | --- |
| [Approved marketplace expansion](docs/16-marketplace-expansion.md) | Current product scope, discovery architecture and implementation phases |
| [Product brief](docs/00-product-brief.md) | Who needs Pactra, why it matters, and what makes it interesting |
| [Scope and acceptance criteria](docs/01-project-scope.md) | Exactly what ships, what waits, and how we know it works |
| [Experience and screen plan](docs/02-user-experience.md) | Buyer journey, seller policy console, screens, and error states |
| [System architecture](docs/03-system-architecture.md) | Services, diagrams, trust boundaries, deployment, and repository layout |
| [Agent and negotiation specification](docs/04-agent-negotiation.md) | Agent roles, rounds, policies, scoring, revisions, and AI evaluation |
| [PayPal and payment integrity](docs/05-paypal-payments.md) | Offer locking, inventory, checkout, capture, verification, and recovery |
| [Data and API contracts](docs/06-data-and-api.md) | Entities, state machines, routes, events, and access rules |
| [Security and reliability](docs/07-security-reliability.md) | Ownership checks, prompt injection, retry behavior, privacy, and limits |
| [Build roadmap and backlog](docs/08-build-roadmap.md) | Milestones, dependencies, effort, priorities, and release gates |
| [Testing and evaluation](docs/09-testing-evaluation.md) | Domain tests, payment failure scenarios, AI benchmarks, and demo checks |
| [Hackathon and demo plan](docs/10-hackathon-demo.md) | Judging alignment, video storyboard, submission checklist, and pitch |
| [Operations and budget](docs/11-operations-budget.md) | Configuration, observability, hosting, cost controls, and runbooks |
| [Decisions and risks](docs/12-decisions-risks.md) | Design decisions, uncertainties, and when to revisit them |
| [Sources and assumptions](docs/13-sources-assumptions.md) | Official technical references and the supplied competition brief |
| [Groq AI implementation plan](docs/14-groq-ai-plan.md) | Chosen provider/model, free-tier scheduling, structured actions, and verification gates |

## Assets

- [Brand direction](assets/brand/brand-direction.md): positioning, colors, typography, and visual tone.
- [Demo data guide](assets/demo/README.md): fictional product facts, seller listings, private policies, and expected feasibility.
- [Products](assets/demo/products.csv), [listings](assets/demo/listings.csv), and [seller policies](assets/demo/seller-policies.csv): fictional fixtures imported by `pnpm db:seed`.
- [Demo scenarios](assets/demo/scenarios.md): happy path, changed budget, impossible demand, and recovery cases.
- [Negotiation examples](assets/demo/negotiation-examples.md): illustrative decisions for UX and evaluation; not prerecorded live behavior.
- [Asset register](assets/ASSET-REGISTER.md): provenance and assets still to create.
- [Supplied hackathon brief](assets/references/hackathon-brief.txt): archived user-provided overview.

## Continue implementation

Use the [implementation status](docs/15-implementation-status.md) together with the [roadmap](docs/08-build-roadmap.md). Complete live-provider validation and the remaining acceptance criteria before calling the release hackathon-ready.

## Repository status

Source repository: [simiyu-samuel/pactra](https://github.com/simiyu-samuel/pactra). Original project materials are licensed under [MIT](LICENSE). Local credentials, dependencies, build output, and database files are ignored.

## Review products and prepare deployment

Open `/seller-console` and choose a shop. Products can be saved as drafts, published, edited or archived, with up to four photos and a manufacturer source link. Existing accepted agreements preserve their original terms. Prices and stock are not inferred from manufacturer pages. [Catalog guide](docs/19-catalog-review.md) · [Render readiness and commands](docs/20-render-readiness.md).

The [live negotiation window](docs/21-live-negotiation-window.md) follows real buyer/seller exchanges, preserves private pricing context, and opens as a floating desktop panel or mobile sheet.

The [full-width agent hero](docs/22-agent-hero.md) uses original desktop/mobile artwork to show buyer and seller agents negotiating a product, with illustrative prices and delivery/warranty terms.
