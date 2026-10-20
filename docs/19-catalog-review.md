# Real-product catalog review

Prepared October 20, 2026, after the owner chose real branded listings for review and reserved price/stock confirmation.

## Prepared catalog

Six exact references are private drafts in each of Pixel Port, Studio Stack and Swift Gear (18 listings). Asking prices, private minimums and stock are unset/zero. None are published. Earlier fictional listings are archived; their historical product IDs, offers, stock holds and accepted snapshots remain available for existing order history.

| Product | Manufacturer reference |
| --- | --- |
| AeroPress Original Coffee Maker | https://aeropress.com/products/aeropress-coffee-maker |
| Bellroy Classic Backpack 20L, Black | https://bellroy.com/products/classic-backpack |
| JBL Flip 6, Black | https://www.jbl.com/FLIP-6-.html |
| Logitech Pebble Mouse 2 M350s, Tonal Graphite | https://www.logitech.com/en-us/shop/p/pebble-2-m350s-wireless-mouse |
| soundcore Q20i, Navy Blue | https://www.soundcore.com/products/q20i-a3004z31 |
| Stanley Quencher H2.0 FlowState 40 oz, Cream 2.0 | https://www.stanley1913.com/products/adventure-quencher-travel-tumbler-40-oz?variant=44559859613823 |

The source register is `assets/catalog/review-products.json`, including exact image URLs, source date and manufacturer credits. Descriptions summarize the referenced model. Photos load from manufacturer hosts; no generated product lookalikes are used for these listings. Manufacturer references establish product identity, not this seller’s inventory, authorization, warranty or local delivery availability. Before public use, the owner should confirm the exact stock/variant and use photos they are permitted to publish. Source pages and images can change.

## Owner workflow

1. Sign in at `/seller-console` with the local shop access code; choose a shop.
2. Open **Edit product**. Review the description, exact model/finish and photos. Add/reorder up to four direct HTTPS photo links; the first is the cover. The manufacturer page is retained for review.
3. Enter your asking price, private minimum and total quantity in stock. Minimums stay private. Check delivery cost, timing and warranty under **Agent rules**.
4. Keep **Draft** while reviewing. To publish, choose **Published** and confirm price, stock and shop delivery rules. A published listing with zero available units is shown as out of stock; it cannot start a new purchasable negotiation.
5. **Archived** hides a listing without deleting its history. Real listings can be restored to a draft or published again. Retired fictional samples stay archived.

Product names, descriptions, photos and source links are shared between shops listing the same product. Price, minimum, stock and listing status apply only to the selected shop. Newly added products belong to the selected shop. This is one owner’s three-shop hackathon workspace, not a public multi-merchant onboarding system.

## Data and safeguards

The additive `20261020140000_catalog_management` migration adds product brand/photos/source/version and listing status. `pnpm catalog:prepare` is an idempotent, non-destructive import: it preserves existing owner edits, never guesses stock/prices, and does not publish. It expects the three shops initialized by `pnpm db:seed`.

Drafts/archives and sample products are excluded from public bootstrap. Product edits are authenticated and origin-checked; command keys support retry and reject conflicting reuse. Product facts and seller rules carry versions. Editing shared product facts invalidates old unaccepted offers across affected shops; a changed selection must be reviewed again. Existing accepted snapshots are immutable. Inventory checks reject stale editor stock and quantities lower than units held for buyers. Shop/product locks serialize concurrent edits.

Photo links are browser-loaded HTTPS URLs, with no server-side fetch or upload storage. Broken images show an honest fallback. Uploaded-file storage is a later enhancement. Product publication requires a photo, an asking price and explicit confirmation. PayPal is still in test mode; publication does not enable live charges.

## Campaign art

The home-page hero uses original AI-generated lifestyle campaign art, separate from manufacturer product photos. Built-in image generation produced `apps/web/public/images/shopping-moment.webp`; its prompt and purpose are recorded in `assets/brand/image-prompts.json`. The original PNG is preserved in the local Codex generated-image directory. The scene is not an actual customer testimonial.
