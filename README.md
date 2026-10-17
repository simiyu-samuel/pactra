# Pactra

**Your terms. Negotiated.**

Pactra is a marketplace experience where a buyer's AI negotiates with seller agents over price, bundles, delivery, and supported terms. The buyer watches the offers evolve, changes their priorities, and chooses a deal. PayPal completes the approved transaction.

**Project status:** planning complete; application implementation has not started. This repository contains specifications and planning assets, not a runnable application. No services have been provisioned and no payment or model credentials are included.

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
- [Products](assets/demo/products.csv), [listings](assets/demo/listings.csv), and [seller policies](assets/demo/seller-policies.csv): planning fixtures; no runtime importer exists yet.
- [Demo scenarios](assets/demo/scenarios.md): happy path, changed budget, impossible demand, and recovery cases.
- [Negotiation examples](assets/demo/negotiation-examples.md): illustrative decisions for UX and evaluation; not prerecorded live behavior.
- [Asset register](assets/ASSET-REGISTER.md): provenance and assets still to create.
- [Supplied hackathon brief](assets/references/hackathon-brief.txt): archived user-provided overview.

## Start implementation when requested

Start with milestone M0 in the [roadmap](docs/08-build-roadmap.md). First prove one end-to-end sandbox payment and the catalog's feasibility; then build the negotiation engine and agent loop. Screens, code scaffolding, dependencies, cloud resources, and account setup belong to the next phase.

## Repository status

Git is initialized locally on `main`. No remote repository or initial commit is created as part of this planning task. The license is [MIT](LICENSE).
