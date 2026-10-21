# Render readiness — October 21, 2026

The application and catalog-management build are ready for staging preparation. No Render resources have been created and no deployment has been triggered. The owner has confirmed and published six Pixel Port listings. Local sandbox capture and signed webhook processing have been demonstrated; see document 24. The user-approved full USD 140.00 sandbox refund and its signed notification are also verified (document 25). Remaining work includes Render setup, hosted webhook verification, staging smoke checks and submission materials.

## Required before release

| Item | Next action |
| --- | --- |
| Owner catalog approval | Completed locally: six owner-approved Pixel Port listings are published. Preserve those prices/stock; review other shop drafts before publishing. Copying local catalog data to staging requires a deliberate transfer. |
| PayPal sandbox end-to-end evidence | Completed locally on October 21: USD 140.00 sandbox capture, matching agreement/merchant, single stock consumption and verified approval/capture notifications. Retain document 24 and repeat the core flow after deployment. |
| Public webhook | Register `https://<chosen-web-host>/api/webhooks/paypal`, configure its matching `PAYPAL_WEBHOOK_ID`, and verify signed delivery plus durable processing/reconciliation with the worker. A local ngrok webhook and matching ID are configured for testing; register the deployment HTTPS URL separately. See document 23. |
| Render setup and smoke test | Select service/database plans and region, configure secrets and exact public origin, migrate/bootstrap the database once, run web and worker, verify health/owner access, negotiation completion and payment recovery. |
| Hackathon submission | Record the final working core flow and complete repository/submission materials against the supplied rules. |

## Deployment shape and commands

Use a **Node web service**, a **background worker**, and **PostgreSQL** in the same region. Pactra needs server routes and a continuous queue/payment-recovery worker. Static hosting alone does not support this application. Its queue is already PostgreSQL-backed; no extra Redis service is needed.

Keep the service root at the repository root so workspace packages resolve. Use Node 22 LTS, the pinned pnpm 10.34.7 package manager, and install dev dependencies because Prisma CLI, TypeScript and the worker’s `tsx` runtime currently live there.

| Service step | Command |
| --- | --- |
| Web build | `pnpm install --frozen-lockfile --prod=false && pnpm db:generate && pnpm build` |
| Web pre-deploy | `pnpm db:migrate` |
| Web start | `pnpm --filter @pactra/web start` |
| Worker build | `pnpm install --frozen-lockfile --prod=false && pnpm db:generate` |
| Worker start | `pnpm --filter @pactra/worker start` |
| Web readiness path | `/api/health` |
| One-time catalog bootstrap after migration | `pnpm db:seed && pnpm catalog:prepare` |

The web start command binds `0.0.0.0` and Render’s `PORT`. Run migrations once through the web deployment before starting the matching worker version; the current change is additive. Keep initial deploys manual until the staged smoke test passes. The proposed root `render.yaml` passes local validation against Render’s official JSON Schema; it has not been applied or validated against a Render account. Render supports pre-deploy commands on paid web/private/worker services; if choosing a plan without one, run migrations in a controlled release step before startup. Choose and review actual compute/database costs in Render before creating resources.

The initializer preserves existing catalog edits, archives samples and creates review drafts; it never publishes. Provisioning a fresh database does not copy the local owner’s prices/stock or active agreements. Review and publish in the deployed owner workspace or arrange an explicit catalog/data transfer separately. Do not rerun a destructive database reset for deployment.

## Environment

Set the same internal `DATABASE_URL` for web and worker. Set `NODE_ENV=production`, the selected exact HTTPS `PUBLIC_APP_URL`, Groq credentials/model and quota settings, sandbox PayPal app/merchant credentials, `PAYPAL_ENV=sandbox`, webhook ID and a private `OWNER_LOGIN_SECRET`. Configure Channel3 and Duffel test credentials only for enabled discovery addons. Use `.env.example` as the full key list; never upload `.env.local` or put secrets in build logs/client variables.

Database storage holds orders, sessions, stock, rate limits and the durable inbox; use managed backups and a rollback plan. Application images are committed static campaign assets or remote manufacturer URLs, so no local upload disk is required. Browser-owned negotiation sessions are device/browser scoped. Owner access is currently a shared private code for this controlled hackathon workspace; independent seller signup/roles, shipping-address collection/fulfilment, tax calculation, live merchant onboarding and live payments are outside this release. Keep sandbox disclosure visible.

## Staging verification

Check all main pages, DB readiness, icons and remote photos. Verify unauthenticated owner access fails, private floors/notes never enter public catalog, and a draft remains invisible. Publish one owner-approved listing, complete a buyer/seller-agent negotiation, verify stale offers and held stock protection, then complete the approved sandbox payment and signed webhook path. Restart the worker during a test job/inbox retry and confirm recovery from durable state. Review redacted logs and quota behavior; preserve the transaction evidence for the demo.

## Official Render references

Checked October 20, 2026: [Next.js web services](https://render.com/docs/deploy-nextjs-app), [background workers](https://render.com/docs/background-workers), [deploy and pre-deploy steps](https://render.com/docs/deploys), [Blueprint specification](https://render.com/docs/blueprint-spec). Commands above are derived for this repository and have not yet been executed on Render.


## Proposed Blueprint for review

The root [render.yaml](../render.yaml) proposes Frankfurt services: a `0.5c-512mb` web service, a `0.5c-512mb` worker and `0.1c-256mb` PostgreSQL with 1 GB storage. Automatic deploys and previews are off. The database blocks external connections; web/worker use its private connection string. Web migrations run before web startup. The worker’s existing retry loop waits for database/schema availability during first provisioning; confirm migration completion before admitting demo traffic.

The October 21 published baseline is USD 7/month web + USD 7/month worker + USD 6/month database compute (USD 20/month before storage, workspace charges, bandwidth, taxes and any other usage). This is a planning estimate, not an account quote or a spending authorization. Confirm the dashboard total and any hackathon credits before creating resources. References: [Render pricing](https://render.com/pricing) and [Render’s representative baseline](https://render.com/articles/production-rails-hosting-guide).

Creation prompts for Groq and PayPal sandbox credentials. The worker references the same values from the web service. A new owner access code is generated on Render; retrieve it privately from the web service environment. `PUBLIC_APP_URL` references Render’s own `RENDER_EXTERNAL_URL`, preserving the exact-origin check without guessing a hostname. Override it explicitly if a custom domain becomes canonical.

After the actual URL exists, register its `/api/webhooks/paypal` endpoint and add the resulting `PAYPAL_WEBHOOK_ID` to the web service. Do not reuse the ngrok ID. Configure optional `CHANNEL3_API_KEY`, `DUFFEL_ACCESS_TOKEN` and addon limits on the web service if enabling discovery. These credentials are intentionally absent from the repository. No local orders, sessions or private seller rules are copied by this Blueprint.

For a fresh staging catalog, seed/prepare only in that new database and review its private drafts, or arrange a deliberate transfer of owner-approved catalog data. Do not copy a whole local database containing sessions/payment records or reset the existing catalog. Keep the empty storefront private until approved listings and all provider checks are ready. Review full compute plans and region before applying; an initial 512 MB runtime is a small-demo starting point and must be monitored for memory pressure.


## Sponsor credits and zero-cash preference

The owner requires free resources or confirmed sponsor credits; no out-of-pocket infrastructure spending is approved. The [official hackathon Render page](https://paypalaihackathon.devpost.com/details/render) advertises **USD 50 in building credits** and links to the [claim portal](https://credits-portal-mmdm.onrender.com/claim/paypal-ai-hackathon). These are separate from the Render winner prizes. The portal redirected browser inspection to GitHub sign-in, which automatic approval review blocked as separate account access. The owner must complete that claim; no code was claimed or applied during this review.

Select the intended Render workspace, open Billing, and redeem the promo code in Credit Balance following [Render’s redemption guide](https://render.com/docs/credits). Verify the balance, eligibility, expiry and any payment-method requirement in the account before applying the Blueprint. The public guide says expiry depends on the promotion; this review could not establish an event-specific expiry. Credits offset eligible bills at the end of the billing period, and excess usage can charge a payment method. Keep resource and total workspace usage below the confirmed remaining credit and remove/suspend resources before coverage ends. A USD 50 balance would cover approximately 2.5 months of the USD 20/month compute baseline alone; storage/other usage and expiry reduce that window.

The default recommendation is the existing architecture funded by confirmed hackathon credits. Render’s [free-tier documentation](https://render.com/docs/free) offers free web services and one free 1 GB PostgreSQL database, but no free background worker. A free web service sleeps after 15 minutes without traffic and can take about a minute to wake; its free PostgreSQL expires after 30 days and has no backups. A strictly free deployment therefore needs a deliberate worker-execution change or another free worker host, plus a database longevity plan. Do not silently omit the worker or introduce keep-alive pings: negotiation and payment recovery depend on durable job processing.

The Blueprint remains an unapplied, credit-gated proposal. It is not a claim that its compute plans are free. If sponsor credits cannot be redeemed, choose and implement the free architecture before deployment.
