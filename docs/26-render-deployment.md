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
