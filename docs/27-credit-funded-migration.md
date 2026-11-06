# Credit-funded Render upgrade — November 6, 2026

Status: migration in progress. The owner added a payment method and explicitly approved the USD 20.30/month configuration using the USD 50 hackathon credit first, after reviewing Render's policy of charging the saved payment method for any invoice shortfall. The billing dashboard confirmed the full USD 50 balance, valid through October 1, 2027. The existing web service's paid upgrade has been submitted and its shell is available. The existing database's in-place compute upgrade has been submitted; the separate worker and final Blueprint sync are not yet verified.

Blueprint Auto Sync was changed from Yes to No before publishing configuration, allowing a controlled manual sync. Before submitting the database upgrade, a full PostgreSQL 18 custom-format archive was created inside the web service's private network, copied to an ignored local backup directory with mode 0600, and checksum-matched byte for byte (65,673 bytes). Local `pg_restore --list` successfully read its table of contents. No database network access was widened. Pre-upgrade aggregate counts: 3 sellers, 6 products, 18 listings, 5 shopping sessions, 4 checkouts, 4 reservations, 2 payment events and 0 refund requests.

## Cost and budget

Keep the Hobby workspace plan at USD 0/month and upgrade only Pactra's resources:

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

Apply the root `render.yaml` to the existing Blueprint `exs-dbc6013bc2fs73bduadg`, rather than creating a replacement Blueprint or database. Preserve:

- Web service `srv-dbc6783bc2fs73bel2qg` and public URL `https://pactra-web.onrender.com`.
- Database `dpg-dbc66crbc2fs73bei5a0-a`, PostgreSQL 18, Frankfurt region, existing credentials and records.
- The saved owner code, private approved catalog snapshot, provider keys and hosted PayPal sandbox webhook ID. The webhook URL does not change.
- All current seller edits, stock, agreements, payment/refund history and durable jobs. Do not reset or seed the database and do not re-import a changed catalog snapshot.
- Existing unrelated workspace resources.

The paid web service runs only Next.js. A separate paid worker runs the existing negotiation and payment-recovery loop continuously. Database-backed leases and guarded commits handle worker replacement without inventing a new queue. The web pre-deploy command applies existing migrations and verifies the original guarded catalog import receipt; it does not overwrite the initialized catalog. This import check remains idempotent.

## Apply and verify

1. Review the existing Blueprint's sync mode and the pending change set. Preserve the current service identities; stop if the preview proposes deleting/replacing the database, expanding network access or changing the public origin.
2. Upgrade the existing web instance. Before changing database compute, use its paid internal shell to capture a private logical export and aggregate record counts if the export tooling is available; resolve backup access without opening the database to the internet.
3. Upgrade the same database in place to `0.1c-256mb`, retaining 1 GB and disabled storage autoscaling. Verify its identity, data and availability, removal of the November 20 expiry notice, and recovery/backup availability.
4. Sync the prepared Blueprint, start the dedicated worker, and deploy the web start-command change. Verify the worker readiness message and successful pre-deploy migration/catalog checks. Existing durable jobs remain in the same database.
5. Check hosted readiness, storefront and seller access; confirm the published catalog and aggregate records are preserved. Verify the web process is not also running a second resident worker.
6. Run one hosted negotiation and review its exact item/delivery/total breakdown. Do not initiate another payment automatically; any buyer approval remains with the owner. Existing successful sandbox payment evidence is retained.
7. Verify both service plans, database storage/recovery and the updated billing projection. Record actual results and remaining release checks in documents 20 and 26 after deployment; those documents currently describe the last verified free deployment.

The prepared configuration is not evidence of a successful paid deployment or a future uptime guarantee. A successful hosted deployment and smoke checks must be recorded separately.
