# One-click shared seller experience for judges

November 6, 2026. This replaces the earlier browser-only practice copy at the owner's explicit request. The existing catalog, seller settings, orders and payments are hackathon demo data; judges may modify that shared database and test the complete buyer/seller flow.

## Entry and full flow

Choose **Try the seller workspace** from the homepage hero or header, or open https://pactra-web.onrender.com/seller-demo. The older `/seller-preview` URL redirects here. No owner code is needed.

The page obtains a real four-hour seller session through a same-origin POST, then opens the existing seller console. Judges can select any existing shop, edit its products, add a new product, set asking/minimum prices and stock, publish/archive products, update agent instructions and delivery promises, and inspect the activity history. Saves use the normal database-backed APIs. The selected shop is kept in the URL so refresh returns to that shop; saved changes survive refresh, sign-out and a new browser session.

A published product appears in the actual marketplace and can be selected for a new buyer negotiation. The worker reads the saved seller rules, stock and minimums. Version checks still reject conflicting edits or stale offers; existing accepted agreements retain their original terms. Orders, payment checks, the order assistant and separately approved sandbox refunds remain the normal seller features. The buyer must approve the exact PayPal Sandbox payment.

All visitors use the same demo catalog. Their published products and saved settings affect one another; the banner explains this. Drafts are hidden from the buyer marketplace, but judges entering the shared seller role can inspect and edit them. Do not enter personal information or real credentials into product details or agent instructions.

## Access mechanism

Open entry requires all three server conditions: `SELLER_DEMO_ACCESS=true`, explicit `PAYPAL_ENV=sandbox`, and a configured strong `OWNER_LOGIN_SECRET`. The environment example defaults the open-entry flag to false; the owner-approved Render Blueprint sets it true for this shared hackathon service.

`POST /api/owner/demo-login` creates a random, hashed, expiring session in the existing owner-session table, using a distinct credential digest. The existing HttpOnly, Secure-in-production, SameSite=Strict cookie remains scoped to `/api/owner`. No owner access code is embedded in a URL, a client bundle or a request from the judge. The route checks the standard mutation origin and accepts only an empty object. Valid existing seller sessions are reused. Open entry does not spend the private owner's failed-sign-in quota.

Every protected request rechecks the demo enablement and explicit sandbox setting. Disabling the flag, leaving sandbox, expiration, logout or rotating the owner secret invalidates access as applicable. Owner-code sessions retain the normal independent sign-in flow. Anonymous callers without a seller session still cannot read or write owner APIs. Public buyer catalog/room projections continue to exclude private seller context.

## Devpost testing instructions (ready to paste)

> Open https://pactra-web.onrender.com and choose **Try the seller workspace**, or go directly to https://pactra-web.onrender.com/seller-demo. No code is needed. This opens the full shared demo seller workspace.
>
> Select a shop. Edit an existing product or choose **Add product**. Enter product details and a direct HTTPS photo URL, asking price, minimum price and available stock. Choose **Published**, confirm the price/stock check and save. Refresh to verify the product persists. You can also update Agent rules and delivery fees; save a short change note.
>
> Choose **View marketplace**, find the product and select **Negotiate this item**. Set a total budget including delivery and start the negotiation. Watch the buyer and seller agents negotiate using the saved catalog and seller rules, compare eligible offers and review an agreement. The buyer must approve the exact PayPal Sandbox payment using a separate Sandbox Personal buyer account. No real money is charged or goods shipped. The shared seller workspace shows the order/payment record and supports separately approved sandbox refund requests.
>
> All visitors share this hackathon catalog, so published product and rule changes affect other visitors. Accepted agreements keep their original terms. Each buyer browser allows three new negotiations in a rolling 24-hour window; existing rooms can be reopened. Channel3 discovery and test-mode flights are optional tools; the main demonstration is seller setup → marketplace → agent negotiation → buyer-approved PayPal Sandbox checkout.

Never share the actual owner code. If organizers require buyer credentials, use a dedicated PayPal sandbox test account in the judges-only field, never a real PayPal account.

## Remaining release work

- Record/upload the required public or unlisted YouTube demo under three minutes; show the actual shared seller → marketplace → negotiation → sandbox payment flow.
- Update Devpost's testing instructions and links, confirm the contribution and remaining fields, verify the video/thumbnail/public source/demo URLs, and finish submission.
- Before judging, repeat the hosted smoke check and record non-sensitive hosted capture/signed-webhook evidence. Local payment/refund/webhook evidence is already documented in documents 24–25.
- Review remaining Render credit near judging. This seller change adds no service or paid plan.

## Verification

All 128 unit/integration tests passed against isolated `pactra_test`, including shared-session issuance, hashing/expiry/logout, explicit sandbox/flag gating and revocation. The database-backed Chromium walkthrough passed one-click sign-in, existing product editing, refresh persistence (including the selected shop), adding/publishing a new product, saving delivery rules, marketplace visibility, new-product negotiation admission, real seller orders, forged-origin rejection and logout. It used isolated `pactra_test`, with no real provider/payment calls. Strict TypeScript and the optimized production build passed. GitHub Actions passed for release `fadd7a0` ([run](https://github.com/simiyu-samuel/pactra/actions/runs/42209482619)).


## Hosted activation and full-flow evidence

The owner explicitly confirmed enabling public, persistent seller access to the existing shared demo data. Render saved `SELLER_DEMO_ACCESS=true` and deployed release `fadd7a0` as `dep-dbmrgvk9v7es73aij9b0`; it became Live on November 6, 2026 at 14:24:50 EAT. Pre-deploy found no pending migrations and retained the existing three shops, six original products and eighteen original listings. The worker/database plans, credentials and billing were unchanged.

A fresh demo seller session created a temporary Swift Gear product from the already-approved Logitech mouse details/photos. The draft persisted through subsequent database reads and was absent from the public catalog. Editing/publishing it made it visible in the actual marketplace. The hosted seller form then changed the asking price to USD 27; refresh retained Swift Gear, the saved price, stock of three units and published status. Public marketplace search returned that same product at USD 27.

Selecting **Negotiate this item** created room `05740669-fe68-43a6-b20f-2355a6221920` for the new database product `d982b3aa-0041-40b7-96d2-01d92bd583b5`, with a USD 50/seven-day buyer limit. The existing hosted Groq worker completed the buyer/seller exchange: Swift Gear opened at USD 36 total, the buyer asked for USD 34, and the seller returned USD 35 (USD 20 item + USD 15 standard delivery), two-day arrival and twelve-month warranty. This proves the persistent seller → public marketplace → buyer request → live seller negotiation path. No offer was accepted, checkout reserved, payment captured or refund initiated in this verification.

The temporary listing `17b5accb-6a63-49ec-a081-8bee1a3cf0fb` was archived afterward, leaving all twelve original published listings and the six original Swift Gear drafts unchanged. The new product/listing and immutable edit history remain as archived verification records; the completed room is historical evidence, and archiving makes its old offers ineligible for a new checkout. Only the separate verification API session was signed out. An ignored, private catalog snapshot was saved before the test; no credential was exposed.

Hosted storefront, seller demo, older redirect, owner sign-in, negotiation, orders and health routes returned 200. Public buyer responses still excluded private floors, agent instructions and token hashes. Anonymous owner catalog access returned 401; a forged-origin demo login returned 403. The in-app browser opened all three existing shops without a code, showed real order/payment records, and passed a 390px product/navigation check without horizontal overflow. The normal viewport was restored and the shared workspace remains open for review.

Screenshots: [shared workspace](../assets/previews/pactra-judge-workspace.jpg), [persisted product edit](../assets/previews/pactra-shared-seller-persistence.jpg), [completed live agent negotiation](../assets/previews/pactra-shared-seller-negotiation.jpg). These show the hosted application, with the temporary listing clearly labeled as a verification item.
