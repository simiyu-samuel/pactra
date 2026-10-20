# Asset register

| Asset | Status | Provenance and intended use |
| --- | --- | --- |
| Brand direction | Written | Original planning guidance for Pactra |
| Product facts | Written CSV | Fictional original demonstration data; not real product specifications |
| Seller listings and price floors | Written CSV | Fictional original fixtures; split public/private projections during import |
| Seller policies | Written CSV | Fictional strategies and permitted fulfillment terms |
| Scenarios and example transcript | Written | Original acceptance/demo design; example transcript is not live AI output |
| Hackathon reference summary | Written | Paraphrase of the user-supplied overview; organizer rules remain authoritative |
| Architecture diagrams | Embedded Mermaid in docs | Original diagrams, editable with the plan |
| Logo, favicon and app icons | Original vector identity and rendered exports | Linked-agreement mark and standard/light wordmarks in public/brand; Next favicon, SVG icon, Apple touch icon and install icons use the same artwork |
| Product illustrations | Original generated concepts and earlier native SVG | Five equipment WebP concepts for the fictional catalog; earlier native SVG source retained |
| Application screenshots | Created in `previews/` | Desktop/mobile captures from the running first build; no live AI/payment outcome is represented |
| Demo video and narration | Not created | Record the working build; no copyrighted background music |

The MIT license covers original Pactra materials. Third-party SDKs, fonts, provider branding, and future media retain their respective licenses; record provenance when actually added. No third-party logo pack, scraped product image, paid asset, or generated screenshot is bundled in this planning pack.

Seller console screenshots in `assets/previews/pactra-seller-console-*.jpg` are original browser captures of the local isolated test market, October 19, 2026. They show fictional fixture policy values and test-only instructions.

The marketplace includes adapted Channel3 UI product-card and format/variant helpers from [channel3-ai/channel3-ui](https://github.com/channel3-ai/channel3-ui), MIT licensed. Its license is retained in `apps/web/src/components/channel3/LICENSE.channel3-ui`. Imports and styling were adapted for the existing Pactra workspace. Channel3 product photographs are loaded from provider-supplied image URLs; they are not bundled as original assets. Marketplace screenshots under `assets/previews/pactra-marketplace-*.jpg` are browser captures, with retailer captures showing time-specific external provider data.

`previews/pactra-negotiation-allowance.jpg` is an original local browser capture showing the configurable allowance on the creator-kit form. No negotiation was started to capture it.

Flight screenshots in `previews/pactra-flights-*.jpg` are original local browser captures from October 19, 2026. They show clearly labeled fictional itineraries and invented airlines/prices, not Duffel provider inventory or bookable fares. The flight interface uses native CSS/SVG and the existing icon set.

`previews/pactra-duffel-test-*.jpg` captures actual provider test responses in the local production app on October 19, 2026, including successful refresh and two-fare comparison. All displayed fares are Duffel test data and are not evidence of real availability or bookable prices.

`previews/pactra-payment-*-fixture.jpg` contains original browser captures of synthetic receipt UI records in the isolated test database. The `UI-FIXTURE-NO-PAYPAL-*` references and fictional camera label deliberately identify display fixtures. These screenshots are not real PayPal transactions, captures, refunds or reversals. The test records were removed after desktop/mobile verification.

## Warm editorial redesign — October 20, 2026

Seven original built-in `image_gen` images are bundled under `apps/web/public/images/`: `creator-studio.webp`, `coastal-escape.webp`, `camera-concept.webp`, `audio-concept.webp`, `tripod-concept.webp`, `light-concept.webp`, and `storage-concept.webp`. Final prompts, paths and intended uses are recorded in [brand/image-prompts.json](brand/image-prompts.json). WebP delivery copies total approximately 908 KB. The creator and coast images are campaign inspiration; equipment images are labeled fictional concepts and are not photographs of exact products. No generated image represents a payment outcome, provider inventory or actual flight availability. Existing external retailer images remain provider-supplied remote media.

`previews/pactra-editorial-*.jpg` are original browser captures of the redesigned local app. Storefront/agent/coastal views show original campaign or fictional concept imagery. `pactra-editorial-channel3.jpg` displays time-specific retailer data returned by Channel3. `*-fixture.jpg` captures show synthetic isolated test offers and receipts with explicit fixture identifiers, not actual payment or negotiation outcomes. The isolated records were removed after verification.

## Negotiation-first brand and catalog — October 20, 2026

The linked-agreement logo and wordmarks are original SVG path artwork with a type-based wordmark. The favicon and 180/192/512px PNG exports are rendered from that same original mark. The brand kit records final asset paths and usage. Category illustrations (`category-bags.svg`, `category-home.svg`, `category-electronics.svg`, `category-fashion.svg`, `category-other.svg`) are original vector artwork for demo products. They are illustrative and do not claim to be exact product photographs. Decorative stars and dots have been removed from the rendered interface.

`previews/pactra-core-*.jpg` are original browser captures of the negotiation-first interface. The seller captures labeled `*-fixture.jpg` show isolated test-shop controls and synthetic catalog additions, not real merchant data. The temporary book listing and test-only rule change were removed after the check. Marketplace and buyer captures display original branding and clearly labeled demo products.
