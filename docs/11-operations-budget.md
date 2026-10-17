# Operations and budget

## Environments

| Environment | Purpose | External services |
| --- | --- | --- |
| Local | Implementation and deterministic tests | Local PostgreSQL; optional model and PayPal sandbox access for explicit smoke tests |
| CI | Reproducible checks | Disposable PostgreSQL and provider stubs; secrets only for deliberately enabled integration jobs |
| Hosted demo | Judge-facing complete prototype | Render web/worker/database, Groq free-tier model, PayPal sandbox |

All environments use sandbox payments. Do not add live keys to the hackathon configuration.

## Configuration inventory

| Variable / setting | Visibility | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Server secret | PostgreSQL connection with required transport settings |
| `GROQ_API_KEY` | Worker/server secret | Groq inference only; never expose to the browser |
| `GROQ_MODEL` | Server configuration | Initial value `openai/gpt-oss-20b`; verify in M0 |
| Groq API origin | Server-fixed configuration | `https://api.groq.com/openai/v1`; no browser-controlled provider URL |
| Groq account limits | Server configuration | Verified request/token limits and reset windows used by the shared scheduler |
| `PAYPAL_ENV` | Server configuration | Fixed to `sandbox` for this release |
| `PAYPAL_CLIENT_ID` | Server configuration; public value may reach official checkout UI | Identify the sandbox app |
| `PAYPAL_CLIENT_SECRET` | Server secret | Server-to-server PayPal authentication |
| `PAYPAL_EXPECTED_MERCHANT_ID` | Server configuration | Check provider payee against configured demo merchant |
| `PAYPAL_WEBHOOK_ID` | Server configuration | Verify events for the registered webhook |
| `PUBLIC_APP_URL` | Public configuration | Canonical HTTPS origin and allowed return routes |
| `OWNER_LOGIN_SECRET` | Server secret | Long random secret exchanged for protected owner session |
| `SESSION_PEPPER` | Server secret | Protect stored guest/owner credential hashes |
| Negotiation limits | Server configuration | Concurrent runs, per-version deadline, calls and tokens, admission limits |
| Payment recovery limits | Server configuration | Reconciliation cadence, alert age, reservation policy |

Future `.env.example` must contain placeholders only. Production/demo secrets belong in host-managed configuration. Do not log environment dumps or put owner secrets in public seed data.

## Budget approach

No resources are purchased in this planning task. The user selected Groq for its free API tier. The AI spending target is $0 within the verified account allowance; free access is limited and is not an unlimited capacity promise. Hosting prices and account-specific Groq access remain M0 checks.

Revise the proposed planning envelope to **up to $100 total**: $0 planned AI usage on Groq free tier, up to $80 reserved for hosting/database/worker, and $20 contingency. These are internal allowances, not vendor quotes or spending authorization. Contingency does not authorize paid inference; any paid AI plan must be an explicit later choice. A custom domain and media generation are unnecessary for P0.

Measure one negotiation's input/output usage, including retry and reasoning usage where reported. Forecast how many evaluation, rehearsal, and visitor runs fit the actual free account quota. Stop or queue when capacity is unavailable. Do not attach billing, upgrade a plan, or silently switch to a paid provider. Hosting remains a separate budget because a persistent worker is not assumed free.

## Initial cost controls

- Per brief version: sixteen provider requests at most, including correction and retry calls.
- Per shopping session: two brief versions and thirty-two provider requests at most.
- Initial token guardrails: at most 36,000 cumulative input tokens and 12,000 cumulative output tokens per shopping session, further constrained by actual Groq organization/model windows. Tune lower from measured compact contexts.
- Per-call output allowance and any model reasoning settings are tuned during M0; stop early when remaining budget cannot support a complete structured action.
- One admitted negotiation room and one provider request in flight initially; queue visitors and independently schedule the three seller contexts.
- Brief interpretation has an endpoint admission limit and also consumes the same shared Groq quota as worker decisions.
- Configure conservative daily request/token allowances against the verified account limits before public access. Keep headroom for judge demonstrations and provider accounting differences.

Reserve estimated request/token usage before dispatch and reconcile actual usage afterward. Respect provider reset/cooldown signals and account-level scopes; local estimates must not assume quota is dedicated to one browser. Requests, failures, and retries may consume allowance. Paid inference is disabled by policy.

## Operational dashboard

The owner needs a small protected view of ready/leased/dead jobs, active holds, model request/token counts, provider errors, unresolved payments, webhook processing failures, and oldest reconciliation item. This can begin as structured operational logs and a minimal owner status panel; a full analytics suite is out of scope.

Health checks expose process readiness without secrets. Check web and worker source/version compatibility and schema version. Hosting logs must carry safe correlation IDs.

## Runbooks

**Groq unavailable or quota exhausted:** respect retry timing, preserve current validated offers, and show waiting or bounded-stop state. Resume a checkpoint only when quota and the run deadline allow it. Never use a paid provider or model automatically, and never substitute a fake live result.

**Worker stalled:** inspect lease/heartbeat, restart safely, and allow checkpoint recovery. Do not delete jobs or room events to clear the screen.

**Payment result unknown:** keep checkout in checking/reconciling state, retain the hold, retrieve the existing provider order/capture, and apply the result idempotently. Do not create a fresh order as a shortcut.

**Webhook delayed:** use server-side retrieval and the scheduled reconciler. Do not label approval as payment. Inspect registration, signature inputs, processing inbox, and provider delivery logs.

**Unresolved payment beyond alert age:** flag owner attention, block a replacement checkout, retain evidence and stock protection, and resolve against provider state. Initial alert target: five minutes; provider-pending states may legitimately last longer.

**Demo reset requested:** require owner authentication and an explicit command. Refuse resets with unresolved external operations or holds. Reset synthetic catalog state safely; retain paid history for the configured short audit period. Never let a public URL reset shared stock.

**Deployment rollback:** stop admission of new runs if contracts are incompatible. Keep reconciliation operating on the deployed schema. Prefer backward-compatible migrations; destructive migrations require backup and a tested recovery path.

## Release handoff

The final repository must explain prerequisite accounts, local setup, environment variables, migrations/seeding, running both processes, connecting sandbox accounts, webhook registration, tests, deployment, known limits, and operational recovery. Do not advertise a `pnpm dev` or hosted link until it actually works.
