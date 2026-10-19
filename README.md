# Pactra

**Your terms. Negotiated.**

Pactra is a marketplace experience where a buyer's AI negotiates with seller agents over price, bundles, delivery, and supported terms. The buyer watches the offers evolve, changes their priorities, and chooses a deal. PayPal completes the approved transaction.

**Project status:** first implementation available. The web app, database, worker, negotiation rules, and provider adapters are implemented. The protected seller policy console and immutable buyer/seller history are implemented. Live Groq negotiation and unpaid PayPal sandbox order creation are verified; buyer approval/capture, webhook delivery, and the full hackathon release remain incomplete. See [implementation status](docs/15-implementation-status.md) for verified behavior and remaining work.

## The experience we are building

> "Find me a creator camera kit under $500, delivered within four days. Video quality matters more than extras."

Three seller agents compete using their own catalog, stock, and private pricing policies. The buyer agent asks for concessions and substitutions. The user can lower the budget to $430 and watch the market respond. Pactra compares eligible offers, explains its recommendation, and checks out the exact accepted offer through PayPal sandbox.

The distinguishing feature is **negotiation over several terms with enforceable boundaries**. An attractive sentence from an agent cannot create stock, change the payable amount, or override the customer's approval.

## The hackathon release

| Decision | Baseline |
| --- | --- |
| Audience | Budget-conscious first-time video creators |
| Market | Fictional camera and audio equipment; 8 products and 21 seller listings |
| Sellers | Three simulated storefronts with separate agent context and policies |
| Checkout | One selected seller's bundle, USD, PayPal sandbox |
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

1. Run `pnpm install` and copy `.env.example` to `.env.local` in the repository root. Fill the Groq and PayPal sandbox fields locally; never commit the populated file.
2. Start PostgreSQL with `docker compose up -d db`, or use an existing local instance and update `DATABASE_URL`.
3. Run `pnpm db:generate`, `pnpm db:migrate`, and `pnpm db:seed`.
4. Run `pnpm dev` to start the web app and the negotiation/reconciliation worker.
5. Open [Pactra locally](http://localhost:3100). Without provider credentials, the product/catalog preview works and live operations display their setup requirements.

The local UI origin defaults to `http://localhost:3100`; update `PUBLIC_APP_URL` if using another origin. The demo database listens on localhost port 55439 in the supplied Compose configuration. Existing fixture stock/policy edits are preserved by seeding.

For web-only development, run `pnpm --filter @pactra/web dev`; live negotiation also needs `pnpm --filter @pactra/worker dev` in another terminal. Run `pnpm typecheck`, `pnpm test`, and `pnpm build` for the ordinary checks.

Integration tests require a **separate database named `pactra_test`**: create it, apply the migration and seed with `DATABASE_URL` pointing to that database, then run `DATABASE_URL=... TEST_DATABASE_URL=... pnpm test:integration`. These tests clear their isolated fixture data and refuse another database name. For browser checks run `pnpm test:e2e`; install the Playwright Chromium browser first if no system Chromium is available. Browser checks do not spend Groq quota or initiate payments.

After migrations, run `pnpm verify:providers` for an explicit live connectivity check. It uses one Groq request through the shared quota scheduler and authenticates PayPal sandbox without creating or capturing a payment. It does not verify the merchant recipient, buyer approval, capture, or webhook delivery.

Register an externally reachable HTTPS `/api/webhooks/paypal` endpoint and set `PAYPAL_WEBHOOK_ID` before validating actual webhook delivery. Use sandbox merchant and buyer accounts. All accepted payment amounts come from server-owned snapshots; the browser never supplies the payable total.

## Seller workspace

Run `pnpm setup:owner` once to generate a strong owner access code in the ignored `.env.local` file. The command preserves an existing valid code and never prints it. Restart the web server, open `/seller-console`, and copy `OWNER_LOGIN_SECRET` from your local file into the sign-in form. Do not share or commit the code.

The workspace controls each fictional seller's strategy, private instructions, minimum prices, total stock, shipping, and warranty. Publishing requires a change note and creates a new immutable policy version. Private instructions and floors stay behind separate owner authentication. Existing reservations keep their accepted snapshot; unlocked old-policy offers become ineligible. Reload a draft if another edit, stock movement, or reservation conflicts with it. Owner sessions expire after four hours, sign-out revokes them, and changing the configured access code invalidates existing sessions.

New buyer briefs retain every confirmed revision; rooms show their brief history after revision. New checkouts reference their original brief and seller policy records. The migration captures available current values from older data; it cannot reconstruct earlier values that had already been overwritten.

## Read the plan

| Document | What it answers |
| --- | --- |
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
