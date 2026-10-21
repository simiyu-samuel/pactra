# Card-free Render deployment

October 21, 2026, Africa/Nairobi. The owner authorized deployment to the Lines Genius Render workspace and confirmed a USD 50 hackathon credit, valid until October 1, 2027. The dashboard independently showed the balance, but required a payment card for the proposed paid instances. The owner chose a card-free deployment instead. No card was entered and no paid resources were created.

## Deployment shape

The current `render.yaml` defines only free compute: one Node web service, `pactra-web`, and one free PostgreSQL instance, `pactra-db`, in Frankfurt. `scripts/start-free-service.mjs` supervises both Next.js and the existing durable worker on that web instance. If either child exits unexpectedly, the supervisor stops the other and exits unsuccessfully so the platform can restart the pair. SIGTERM/SIGINT are forwarded with a bounded shutdown. No keep-alive traffic is introduced.

The free web instance sleeps after 15 minutes without inbound traffic, can take about a minute to wake, and shares its 512 MB memory/CPU allocation between web and worker. Durable database state survives process restarts; processing pauses while the instance sleeps. A later visit or PayPal notification can wake the service. Observe real memory, readiness, negotiation timing and notification retry behavior on staging. This setup is for the hackathon prototype, not an always-on production worker guarantee.

Free PostgreSQL has a 1 GB capacity and expires 30 days after creation, with no managed backups. Export needed data before the actual expiration date and plan a replacement/upgrade separately for continued judging or longer hosting. The workspace’s free instance hours, bandwidth and build-minute limits apply across all its services. Existing unrelated services are preserved. References: [Render free-tier limits](https://render.com/docs/free), [credit behavior](https://render.com/docs/credits).

## Private configuration and initialization

The owner explicitly authorized copying Groq, sandbox PayPal, Channel3 and Duffel credentials into Pactra’s private Render environment settings. The owner also authorized a catalog-only copy: three shops, six real product records, eighteen listings (twelve published, six drafts), current prices/stock, private minimums, agent instructions and delivery/warranty promises. Buyer/owner sessions, orders, payment records, provider inboxes and quota records are excluded.

`scripts/transfer-catalog.ts export .runtime/<private-file>.json` creates a mode-0600, ignored snapshot and refuses active stock holds. The validated snapshot is supplied through the private `PACTRA_CATALOG_JSON` environment setting. No catalog data or credentials are committed. Keep the original file private.

On startup the web command applies migrations, runs `scripts/bootstrap-staging.ts`, then starts the supervised pair. Catalog import only accepts an empty migrated target. It creates an immutable baseline and request hash in seller policy history. Subsequent starts recognize the same snapshot and leave later seller edits untouched. A different snapshot on an initialized target is refused; no reset or overwrite action exists. Do not run the demo seed/prepare scripts on this target.

Render generates a separate owner access code. The public origin references `RENDER_EXTERNAL_URL`; the same-origin and owner checks remain enforced. Register the actual hosted HTTPS `/api/webhooks/paypal` with the sandbox app after provisioning and set its matching `PAYPAL_WEBHOOK_ID` on the web service. Preserve the local ngrok verification ID locally. PayPal remains in sandbox mode and Duffel remains test-only.

## Validation and live evidence

All 125 regression tests passed in isolated PostgreSQL, including new child-process failure/shutdown tests, catalog data-boundary checks, refusal to overwrite an existing target and refusal to export held inventory. Strict TypeScript passed. The all-free Blueprint passed local validation against Render’s official JSON Schema. These checks do not claim a hosted deployment yet; actual provisioning/build/provider verification evidence follows when available.


## Provisioning started

Render accepted the all-free Blueprint at commit `b9dda87` without card entry. Blueprint ID: `exs-dbc6013bc2fs73bduadg`. The initial sync began creating `pactra-runtime` and PostgreSQL 18 `pactra-db` (`dpg-dbc66crbc2fs73bei5a0-a`) in Frankfurt. Web creation/build follows database provisioning. Resource creation does not yet prove successful application startup or hosted PayPal verification.


The free database became available as PostgreSQL 18 with external connections blocked. Render displays an expiration date of **November 20, 2026**. The free Node web service is `srv-dbc6783bc2fs73bel2qg`; its first deployment began from commit `b9dda87`. Build completion and hosted smoke checks are not yet asserted.


## Hosted build and initial smoke checks

The first build/deploy (`dep-dbc678m1cdec73e8v5n0`, commit `b9dda87`) succeeded. The app is live at [pactra-web.onrender.com](https://pactra-web.onrender.com). Render’s optimized Next.js build and TypeScript passed. Startup logs confirm migrations are applied and the approved catalog is initialized (3 shops, 6 products, 18 listings); a subsequent start recognized the same snapshot without overwriting it.

Storefront, seller workspace, negotiation, orders, flights, readiness and icon HTTP checks returned 200. Public catalog redaction passed, unauthenticated owner access returned 401 and a forged origin returned 403. The hosted browser rendered the real product photos, asking prices and available seller offers. The storefront groups six exact products; the underlying approved catalog includes twelve published seller listings.

The hosted sandbox webhook was registered at `https://pactra-web.onrender.com/api/webhooks/paypal`; its ID was stored privately and added to the web service environment. The environment-only deployment (`dep-dbc6ac5g1s2s73974qjg`) became Live. No local ngrok setting was changed. Actual signed notification intake and completed hosted buyer payment remain separate checks.


## Hosted AI and webhook configuration checks

After the webhook-ID restart, public bootstrap reported three shops and twelve published seller listings; Groq, sandbox PayPal and Channel3 were configured, and Duffel reported test mode configured. An unsigned hosted PayPal notification returned 400 rather than being accepted. This proves the configured receiver rejects an unsigned request; it does not prove genuine signed hosted delivery.

The hosted browser completed an actual Groq-backed negotiation in room `52d7ff07-14d6-4bc9-be77-c10b1984d06c` for one AeroPress Original Coffee Maker, with a USD 50 cap, seven-day deadline and undisclosed budget. Pixel Port opened at USD 46 including five-day delivery; the buyer countered at USD 44 and the seller returned a valid USD 44 offer with five-day delivery and twelve-month seller warranty. Studio Stack opened at USD 48 with four-day delivery, received a USD 44 counteroffer and declined the final proposal. The UI correctly retained Pixel Port’s current offer and marked Studio Stack as having no current offer. This confirms the hosted worker/model flow and constraint handling, not a purchase or shipment. No new payment, capture or refund was initiated during this deployment check.

Live proof: [storefront preview](../assets/previews/pactra-render-live.png) and [negotiation window](../assets/previews/pactra-render-negotiation.png). The hosted seller access code is generated separately under `OWNER_LOGIN_SECRET` in the Pactra web service’s private Render environment. It is not copied into this documentation or chat.

Remaining human check: complete a buyer-approved sandbox purchase on the hosted app, then confirm the hosted capture, signed notification intake/processing, buyer/seller receipt and optional seller-approved refund. Local payment/refund evidence remains in documents 24–25; it is not presented as hosted evidence. No hosted real-money or fulfilment capability is enabled.

The free service’s Metrics page exposes the 512 MB memory limit but requires paid compute to display application CPU/memory usage charts. No upgrade was made and no peak memory figure is claimed. The current readiness summary is document 20; earlier paid-plan assumptions are superseded by the owner’s card-free decision.
