# Render deployment status — October 21, 2026

Pactra is live at **https://pactra-web.onrender.com** using a free Node web service and free PostgreSQL 18 in Frankfurt. The owner chose card-free deployment after Render required a card for paid instances despite an available USD 50 hackathon credit. No card or paid instance was added. [Document 26](26-render-deployment.md) records the architecture, approvals and actual hosted evidence.

## Current services

| Resource | State |
| --- | --- |
| `pactra-web` | Live, free compute; Next.js and the durable worker run as supervised child processes. |
| `pactra-db` | Available, free PostgreSQL 18; external connections blocked. Expires **November 20, 2026**. |
| Catalog | Imported with owner approval: 3 shops, 6 exact products, 12 published listings and 6 private drafts. |
| Providers | Groq, sandbox PayPal, Channel3 and Duffel test credentials configured privately. |
| PayPal webhook | Hosted HTTPS endpoint registered, matching verification ID configured and environment restart Live. |

The hosted seller access code is the generated `OWNER_LOGIN_SECRET` in the web service’s private Render Environment page. It differs from the local access code. Do not paste it into documentation or chat.

## Verification completed

All 125 regression tests, strict TypeScript and local official Blueprint schema validation passed. Render’s optimized production build passed. Hosted main pages, database readiness and icon returned 200; private catalog redaction, unauthenticated owner rejection, forged-origin rejection and unsigned-webhook rejection passed.

A real hosted negotiation completed with a valid USD 44 AeroPress offer including five-day delivery, under a USD 50 cap and seven-day deadline. The buyer/seller transcript rendered correctly, including another seller declining the counteroffer. This demonstrates the deployed worker/Groq flow. Provider configuration flags do not prove live external-shopping or flight searches; those were not called during deployment verification.

## Remaining release checks

| Item | Next action |
| --- | --- |
| Hosted PayPal purchase | A human buyer completes sandbox approval; verify exact capture, signed notification processing and buyer/seller receipts. Local capture/refund evidence is separate. |
| Hosted refund | Optionally request and approve a full hosted sandbox refund, then verify its provider state and signed notification. |
| Seller access | Open the hosted workspace with its generated private access code and review current catalog/rules. |
| Database longevity | Export needed data before November 20; arrange a replacement or separately approved upgrade if the demo must continue after expiry. |
| Hackathon submission | Record the working core flow and finish the public repository/video/submission materials. |

## Runtime and recovery

The root `render.yaml` is the current deployment source. It contains only free compute plans, with automatic service deploys and previews disabled. The build installs pinned workspace dependencies, generates Prisma Client and builds Next.js. Startup applies migrations, checks/imports the private owner-approved catalog snapshot once, then starts `scripts/start-free-service.mjs`.

The supervisor forwards shutdown signals, stops the remaining child if either exits unexpectedly and exits unsuccessfully for platform restart. Jobs, reservations, quotas and the PayPal inbox stay in PostgreSQL. Repeated startup recognizes the catalog’s immutable import receipt and preserves subsequent seller edits. A different snapshot on an initialized target is refused. Do not run demo seeding, catalog preparation or database resets against this deployment.

Free web instances sleep after 15 idle minutes; startup can take about a minute and both web and worker pause during sleep. There is no keep-alive workaround. Web and worker share 512 MB of RAM; free Render does not expose application CPU/memory usage charts. The actual hosted negotiation passed, but this is not a production uptime or load guarantee. Workspace-wide free instance hours, bandwidth and build-minute limits also apply. Free PostgreSQL has 1 GB capacity, 30-day expiry and no managed backups.

## Configuration

Keep `DATABASE_URL`, owner access, private catalog snapshot and provider keys in Render’s private environment settings. `PUBLIC_APP_URL` references the platform’s `RENDER_EXTERNAL_URL`; change it explicitly if adopting a canonical custom domain. `PAYPAL_ENV` stays `sandbox`; Duffel stays test-only. The hosted `PAYPAL_WEBHOOK_ID` belongs to the hosted HTTPS URL, while the local ignored configuration retains the ngrok webhook ID.

The USD 50 credit is visible in the workspace and valid until October 1, 2027, but the chosen resources use free plans. Any future paid compute or card use needs separate authorization.

References: [Render free-tier limits](https://render.com/docs/free), [Blueprint specification](https://render.com/docs/blueprint-spec), [credit behavior](https://render.com/docs/credits).
