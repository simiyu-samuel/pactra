# Render deployment status — November 6, 2026

Pactra is live at **https://pactra-web.onrender.com** on paid, always-on web and worker instances with paid PostgreSQL 18 in Frankfurt. The owner added a card and explicitly approved the USD 20.30/month base configuration using the existing USD 50 hackathon credit first. [Document 27](27-credit-funded-migration.md) records the migration, backup and actual hosted evidence; [document 26](26-render-deployment.md) preserves the earlier free deployment history.

## Current resources and billing

| Resource | Verified state | Monthly base cost |
| --- | --- | --- |
| `pactra-web` | Live; `0.5c-512mb`; runs Next.js only. Existing service and URL preserved. | USD 7.00 |
| `pactra-worker` | Live; `0.5c-512mb`; dedicated negotiation and sandbox-payment recovery loop. | USD 7.00 |
| `pactra-db` | Available; PostgreSQL 18, `0.1c-256mb`, existing 1 GB storage. Expiry notice removed. | USD 6.30 |
| Total | Hobby workspace, one instance of each service, storage autoscaling disabled. | USD 20.30 |

The billing dashboard still shows USD 50.00 credit, valid through October 1, 2027, and a projected USD 16.75 for the remaining portion of November. The projection is an estimate and can change with usage. Render applies credits at invoice time, so the displayed credit does not decrease immediately as compute accrues. At base usage the credit covers approximately 2.46 months. Extra bandwidth/build usage consumes it sooner; Render charges the saved payment method for any invoice shortfall. No paid workspace subscription, extra disks, replicas or high availability were added.

## Data and backups

The existing database was upgraded in place; no database replacement, reset or seed was used. A PostgreSQL 18 custom-format backup was created over the private network, copied locally with mode 0600 into an ignored backup directory, checksum-matched byte for byte and fully read with `pg_restore --file=/dev/null`. The archive is 65,673 bytes. A managed logical export is downloadable in Render Recovery. Point-in-time recovery initialization also completed: the Restore database control is enabled for the Hobby workspace's three-day recovery window.

All pre-upgrade record counts matched afterward: 3 sellers, 6 products, 18 listings, 5 shopping sessions, 4 checkouts, 4 reservations, 2 payment events and 0 refund requests. The later smoke test adds one shopping session but no checkout. Existing seller edits, stock, agreements and payment records were preserved. The original owner code still opens the seller workspace; the temporary verification login was signed out afterward. The public URL and hosted PayPal webhook URL/ID are retained. Database external access remains blocked.

## Verification completed

- Render accepted the reviewed Blueprint sync. The web and worker deployments at commit `048757a` both became Live. Render's optimized production build and TypeScript passed; the pre-deploy check found nine existing migrations with none pending, and recognized the initialized catalog without overwriting it.
- The dedicated worker logs readiness. A web-container process check found zero resident worker processes.
- Hosted health and bootstrap returned 200. Bootstrap exposed 12 published listings and the published standard/express rates, while excluding private floors, private instructions, session token hashes and PayPal secrets. Groq, PayPal sandbox and Channel3 configuration flags are present; these checks do not claim a fresh external-shopping, flight-search or payment test.
- The buyer request shows eligible shops' delivery rates before budget entry. Each live offer shows products plus its exact delivery fee and total. Both the request form and completed negotiation fit a 390px-wide viewport without horizontal overflow.
- Room `8e241c76-52c1-4ad9-a301-a5a60c0f5c7a` completed a real Groq negotiation for one AeroPress under a USD 50 budget and seven-day deadline: Pixel Port USD 38 + USD 8 delivery = USD 46, five days, twelve-month warranty; Studio Stack USD 37 + USD 10 delivery = USD 47, four days, twenty-four-month warranty. The buyer counteroffer and final seller responses appeared in the live conversation.

The owner had already confirmed a successful buyer-approved hosted PayPal sandbox purchase. No repeat payment, reservation or refund was initiated during this migration. The earlier local signed capture/refund evidence remains in documents 24–25; the hosted order/capture reference and signed notification record still need to be retained in the judging evidence pack.

## Runtime and future deployments

The root `render.yaml` is the applied deployment source. Blueprint Auto Sync is No and service auto-deploy triggers are off; publish future changes, review the manual Blueprint sync and deploy deliberately. The web pre-deploy command runs migrations and verifies the original guarded catalog import receipt, then the web start command runs Next.js only. The worker has its own process lifecycle and uses the same database-backed jobs, leases, quota state and payment inbox. Paid compute removes free-tier idle sleeping; the database no longer has the prior November 20 expiry.

Keep provider credentials, `DATABASE_URL`, `OWNER_LOGIN_SECRET`, the approved private catalog snapshot and the hosted `PAYPAL_WEBHOOK_ID` in Render's private settings. Keep PayPal in sandbox and Duffel in test mode. The earlier free-service supervisor remains available for historical/local use but is not the current hosted start command.

## Remaining release work

Record the hosted payment/capture and notification evidence, rehearse and upload the under-three-minute YouTube demo, finish the Devpost submission, and review accrued charges plus remaining credit before the credit is depleted.

References: [Render pricing](https://render.com/pricing), [credit behavior](https://render.com/docs/credits), [Blueprint specification](https://render.com/docs/blueprint-spec).
