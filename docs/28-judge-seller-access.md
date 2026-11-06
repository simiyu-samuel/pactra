# One-click seller experience for judges

November 6, 2026.

## Entry points

Open [Pactra](https://pactra-web.onrender.com) and choose **Try the seller workspace** in the hero, or **Try seller workspace** in the header navigation. On phones, the header link is inside the navigation menu; the hero action is visible without opening it. The direct link is https://pactra-web.onrender.com/seller-preview. The owner sign-in page also offers this entry.

The practice workspace opens immediately without a shared access code. It reuses the seller sidebar, catalog, product editor, rules editor and activity history. Judges can switch between shops with published products, search/filter the catalog, add or edit a product, try price and stock settings, save agent rules and inspect the resulting activity history.

## Data and access boundary

The workspace reads the existing public catalog once. It uses published product names, photos, asking prices and delivery promises. It generates separate practice identifiers, example minimum prices, example stock of ten units, example instructions and a new local history. Real owner notes, draft products, minimum prices, stock holds and historical private records are never fetched.

Each page instance owns an in-memory store. Saving changes only that page instance; refreshing restores the public catalog and example settings. Practice changes do not affect real offers, inventory or seller policies. The persistent banner and product editor identify this boundary. The practice Orders & payments view explains the actual workflow and links to the buyer negotiation; it contains no fabricated transaction or payment reference and cannot issue refunds. A buyer can still complete a real PayPal sandbox checkout through the normal buyer flow.

The existing `/seller-console` owner sign-in and all `/api/owner/*` authorization checks remain in place. No owner credential is placed in a URL, shipped in a client bundle, embedded in a public button or exchanged for a session by this preview. Every practice action stays local; unsupported paths fail without an HTTP fallback.

## Devpost testing instructions (ready to paste)

> Open https://pactra-web.onrender.com. Choose an in-stock product, select **Start a negotiation**, set a total budget that includes delivery, and confirm the request. Watch the buyer and seller agents negotiate, compare eligible offers and review an agreement. The buyer must approve the exact PayPal Sandbox payment; a separate PayPal Sandbox Personal buyer account is required for that step. No real money is charged or goods shipped. This browser allows three new negotiations in a rolling 24-hour window; existing rooms can be reopened.
>
> To explore the seller side without credentials, choose **Try the seller workspace** on the homepage or open https://pactra-web.onrender.com/seller-preview. Edit products, save example agent rules, switch shops and inspect Activity. This is an interactive practice copy: stock and minimum prices are examples, edits stay in the current tab and refresh resets them. Real seller orders and refund controls remain private.
>
> Channel3 store discovery and test-mode flights are optional tools; the main demonstration is buyer/seller agent negotiation followed by buyer-approved PayPal Sandbox checkout.

Show the real authenticated seller/payment workflow in the project video. Never publish the owner access code. If organizers require sandbox buyer credentials, share a dedicated sandbox test account through the judges-only field rather than real PayPal credentials or the seller owner code.

## Remaining release work

1. Record and upload the required public or unlisted YouTube demo under three minutes; verify playback while signed out. Show a real hosted negotiation/payment and the authenticated seller flow; label practice screens accurately.
2. Add the seller-practice link and these testing instructions to Devpost; finish the contribution field and remaining submission fields; verify the thumbnail, source URL, demo URL and final submission status.
3. Before judging, repeat the hosted smoke check and record non-sensitive hosted order/capture and processed signed-webhook evidence. Local capture/refund/webhook evidence is already documented in documents 24–25; the earlier hosted payment is owner-confirmed but its references are not yet recorded in document 26.
4. Check remaining Render credit near judging. The current always-on app, separate worker and paid database are active; do not change billing or provision extra services for this feature.

## Verification

All 47 unit tests passed, including four practice-boundary checks for private-field exclusion, per-visitor isolation, rejection of privileged routes and local validation/history. A Chromium walkthrough passed product editing, rule saving, section navigation, refresh reset, absence of owner API requests/session cookies and 390px mobile navigation without horizontal overflow. Strict TypeScript and the optimized Next.js production build passed. The initial local build encountered an old temporary-cache symlink whose target had been removed; recreating that regenerable cache directory resolved it. No real catalog, payment or refund mutation was made. GitHub Actions also passed for release commit `0489ea4` ([run](https://github.com/simiyu-samuel/pactra/actions/runs/42176352195)).

## Hosted verification

Render web deployment `dep-dbmnemh5efls7384dl0g` for commit `0489ea4` became Live on November 6, 2026 at 09:47:33 EAT. Pre-deploy reported no pending migrations and preserved the initialized catalog of three shops, six products and eighteen listings. No worker/database configuration changed.

Hosted storefront, seller preview, owner sign-in, negotiation, orders and database health returned HTTP 200. Public bootstrap retained twelve published listings and excluded private pricing/instructions/session secrets. Unauthenticated owner catalog reads and product writes both returned 401.

The homepage hero opened the practice workspace in one click with no access-code field. Saving a speed-focused example rule displayed the practice-only confirmation; refreshing restored the example price-focused rule. The published product photos loaded in the grid. Phone navigation and agent-rule views fit a 390px viewport without horizontal overflow; the viewport was restored afterward. The workspace remains open for review. No real catalog edit, AI negotiation, payment or refund was initiated by these checks.

[Hosted judge workspace screenshot](../assets/previews/pactra-judge-workspace.jpg).
