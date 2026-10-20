# Render readiness — October 20, 2026

The application and catalog-management build are ready for staging preparation. No Render resources have been created and no deployment has been triggered. The owner has confirmed and published six Pixel Port listings. The remaining hackathon release gates are real sandbox payment completion/webhook evidence, staging smoke checks, and submission materials.

## Required before release

| Item | Next action |
| --- | --- |
| Owner catalog approval | Completed locally: six owner-approved Pixel Port listings are published. Preserve those prices/stock; review other shop drafts before publishing. Copying local catalog data to staging requires a deliberate transfer. |
| PayPal sandbox end-to-end evidence | Complete a buyer-approved sandbox payment, confirm captured amount/recipient, and retain its receipt. Existing provider authentication/order-creation and stubbed recovery tests do not prove buyer approval/capture. |
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

The web start command binds `0.0.0.0` and Render’s `PORT`. Run migrations once through the web deployment before starting the matching worker version; the current change is additive. Keep initial deploys manual until the staged smoke test passes. No `render.yaml` has been submitted or validated against a Render account. Render supports pre-deploy commands on paid web/private/worker services; if choosing a plan without one, run migrations in a controlled release step before startup. Choose and review actual compute/database costs in Render before creating resources.

The initializer preserves existing catalog edits, archives samples and creates review drafts; it never publishes. Provisioning a fresh database does not copy the local owner’s prices/stock or active agreements. Review and publish in the deployed owner workspace or arrange an explicit catalog/data transfer separately. Do not rerun a destructive database reset for deployment.

## Environment

Set the same internal `DATABASE_URL` for web and worker. Set `NODE_ENV=production`, the selected exact HTTPS `PUBLIC_APP_URL`, Groq credentials/model and quota settings, sandbox PayPal app/merchant credentials, `PAYPAL_ENV=sandbox`, webhook ID and a private `OWNER_LOGIN_SECRET`. Configure Channel3 and Duffel test credentials only for enabled discovery addons. Use `.env.example` as the full key list; never upload `.env.local` or put secrets in build logs/client variables.

Database storage holds orders, sessions, stock, rate limits and the durable inbox; use managed backups and a rollback plan. Application images are committed static campaign assets or remote manufacturer URLs, so no local upload disk is required. Browser-owned negotiation sessions are device/browser scoped. Owner access is currently a shared private code for this controlled hackathon workspace; independent seller signup/roles, shipping-address collection/fulfilment, tax calculation, live merchant onboarding and live payments are outside this release. Keep sandbox disclosure visible.

## Staging verification

Check all main pages, DB readiness, icons and remote photos. Verify unauthenticated owner access fails, private floors/notes never enter public catalog, and a draft remains invisible. Publish one owner-approved listing, complete a buyer/seller-agent negotiation, verify stale offers and held stock protection, then complete the approved sandbox payment and signed webhook path. Restart the worker during a test job/inbox retry and confirm recovery from durable state. Review redacted logs and quota behavior; preserve the transaction evidence for the demo.

## Official Render references

Checked October 20, 2026: [Next.js web services](https://render.com/docs/deploy-nextjs-app), [background workers](https://render.com/docs/background-workers), [deploy and pre-deploy steps](https://render.com/docs/deploys), [Blueprint specification](https://render.com/docs/blueprint-spec). Commands above are derived for this repository and have not yet been executed on Render.
