# Credit-funded Render upgrade — November 6, 2026

Status: applied and verified. The owner added a payment method and explicitly approved the USD 20.30/month configuration using the USD 50 hackathon credit first, after reviewing Render's policy of charging the saved payment method for any invoice shortfall. The existing web service and database were upgraded in place, the dedicated worker is Live, and the hosted public URL is preserved. Billing still shows USD 50 credit, valid through October 1, 2027, with a projected USD 16.75 for the remaining portion of November at the last review.

Blueprint Auto Sync was changed from Yes to No before publishing configuration, allowing a controlled manual sync. Before submitting the database upgrade, a full PostgreSQL 18 custom-format archive was created inside the web service's private network, copied to an ignored local backup directory with mode 0600, and checksum-matched byte for byte (65,673 bytes). Local `pg_restore --list` successfully read its table of contents, and `pg_restore --file=/dev/null` then read and decompressed the full archive without connecting to a target database. No database network access was widened. Pre-upgrade aggregate counts: 3 sellers, 6 products, 18 listings, 5 shopping sessions, 4 checkouts, 4 reservations, 2 payment events and 0 refund requests.

## Cost and budget

The Hobby workspace remains USD 0/month. Only Pactra's resources were upgraded:

| Resource | Plan | Monthly base cost |
| --- | --- | --- |
| Existing `pactra-web` | `0.5c-512mb` | USD 7.00 |
| New `pactra-worker` | `0.5c-512mb` | USD 7.00 |
| Existing `pactra-db` compute | `0.1c-256mb` | USD 6.00 |
| Existing database storage | 1 GB, autoscaling disabled | USD 0.30 |
| Total | One web instance, one worker, one database | USD 20.30 |

Prices were checked against the actual Render web/database compute screens and [Render pricing](https://render.com/pricing). The database documentation permits 1 GB or a multiple of 5 GB; preserve its existing 1 GB allocation. The current database uses about 6.75% of that capacity. No paid workspace upgrade, high availability, replicas, extra disks or autoscaling is proposed.

At base usage, USD 50 covers approximately 2.46 months. Usage over the workspace's included bandwidth/build allowances can consume credit sooner. The credit is an invoice balance, not a prepaid hard limit: [Render's credit policy](https://render.com/docs/credits) says eligible charges are deducted at the end of each billing period, and any shortfall is charged to the saved payment method. Review the total unbilled charges as well as the displayed credit balance before depletion. Do not represent the USD 50 as an automatically enforced spending cap.

## Preserve the existing deployment

The root `render.yaml` was applied to the existing Blueprint `exs-dbc6013bc2fs73bduadg`, without creating a replacement Blueprint or database. Preserved:

- Web service `srv-dbc6783bc2fs73bel2qg` and public URL `https://pactra-web.onrender.com`.
- Database `dpg-dbc66crbc2fs73bei5a0-a`, PostgreSQL 18, Frankfurt region, existing credentials and records.
- The saved owner code, private approved catalog snapshot, provider keys and hosted PayPal sandbox webhook ID. The webhook URL does not change.
- All current seller edits, stock, agreements, payment/refund history and durable jobs. Do not reset or seed the database and do not re-import a changed catalog snapshot.
- Existing unrelated workspace resources.

The paid web service runs only Next.js. A separate paid worker runs the existing negotiation and payment-recovery loop continuously. Database-backed leases and guarded commits handle worker replacement without inventing a new queue. The web pre-deploy command applies existing migrations and verifies the original guarded catalog import receipt; it does not overwrite the initialized catalog. This import check remains idempotent.

## Repeatable migration procedure

1. Review the existing Blueprint's sync mode and the pending change set. Preserve the current service identities; stop if the preview proposes deleting/replacing the database, expanding network access or changing the public origin.
2. Upgrade the existing web instance. Before changing database compute, use its paid internal shell to capture a private logical export and aggregate record counts if the export tooling is available; resolve backup access without opening the database to the internet.
3. Upgrade the same database in place to `0.1c-256mb`, retaining 1 GB and disabled storage autoscaling. Verify its identity, data and availability, removal of the November 20 expiry notice, and recovery/backup availability.
4. Sync the prepared Blueprint, start the dedicated worker, and deploy the web start-command change. Verify the worker readiness message and successful pre-deploy migration/catalog checks. Existing durable jobs remain in the same database.
5. Check hosted readiness, storefront and seller access; confirm the published catalog and aggregate records are preserved. Verify the web process is not also running a second resident worker.
6. Run one hosted negotiation and review its exact item/delivery/total breakdown. Do not initiate another payment automatically; any buyer approval remains with the owner. Existing successful sandbox payment evidence is retained.
7. Verify both service plans, database storage/recovery and the updated billing projection. Record actual results and remaining release checks in documents 20 and 26 after deployment. Document 20 now reflects this completed migration; document 26 preserves the original free-deployment history.

## Applied result and hosted evidence

- Source: `38683c7` publishes the previously tested delivery-fee UI/API changes; `048757a` publishes the paid Blueprint. Blueprint sync `exe-dbmmt8gm7kps73bqqbjg` applied the reviewed worker creation and web start/pre-deploy commands.
- Web: existing `srv-dbc6783bc2fs73bel2qg`, deployment `dep-dbmmtj5g1s2s73bc2e0g`, Live at `048757a`. The production build and TypeScript passed. Pre-deploy found nine existing migrations with none pending and recognized the initialized 3-shop/6-product/18-listing catalog. The container runs Next.js only; the process check found zero resident worker processes.
- Worker: new `srv-dbmmtj5g1s2s73bc2e10`, deployment `dep-dbmmtjdg1s2s73bc2gag`, Live at `048757a`. Logs confirm: “Pactra worker ready. Short negotiations and sandbox payment recovery enabled.”
- Database: original `dpg-dbc66crbc2fs73bei5a0-a`, PostgreSQL 18, Available on `0.1c-256mb`, still 1 GB with autoscaling disabled. Its expiry notice was removed. External database access remains blocked. A managed logical export is downloadable. Point-in-time recovery initialization completed and the Restore database control is enabled for the three-day Hobby recovery window.
- Data: every recorded pre-upgrade count matched after deployment: 3 sellers, 6 products, 18 listings, 5 shopping sessions, 4 checkouts, 4 reservations, 2 payment events and 0 refund requests. The subsequent negotiation test adds one shopping session and does not create a checkout. The existing owner access code successfully opened the seller workspace and its shops; the temporary owner session was signed out afterward.
- API: hosted health and bootstrap returned 200. The catalog still exposes twelve published listings. Delivery rates appear publicly; private seller floors/instructions, token hashes and PayPal secrets are absent. Groq, sandbox PayPal and Channel3 configuration flags remain present. No new flight/external-product lookup or payment was attempted.
- Negotiation: room `8e241c76-52c1-4ad9-a301-a5a60c0f5c7a` completed a real Groq-backed AeroPress negotiation under a USD 50/seven-day brief. Pixel Port returned USD 38 products + USD 8 delivery = USD 46 with five-day arrival; Studio Stack returned USD 37 + USD 10 = USD 47 with four-day arrival. Both offers met the request, with itemized delivery shown in the cards. The actual agent counteroffers and final responses appeared in the conversation.
- Responsive UI: the request form and completed room both fit a 390px viewport without horizontal overflow. Standard and express rates were visible before negotiation; normal browser sizing was restored after the check.
- Billing: Hobby workspace, USD 20.30/month base, USD 50 credit still displayed and USD 16.75 projected for the remaining November period. This projection excludes future changes and usage; it is not a spending cap.

Public UI evidence: [completed negotiation](../assets/previews/pactra-paid-negotiation.jpg) and [mobile request](../assets/previews/pactra-paid-mobile.jpg). The private database archive and Render billing/settings screenshots are not committed. The prior owner-confirmed hosted PayPal purchase is retained; no new payment, stock reservation or refund was initiated during this migration.
