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
| Logo and favicon | Not created | Develop original vector mark after the brand direction is reviewed |
| Product illustrations | Created as native SVG | Original camera, microphone, tripod, light and storage illustrations in product-art.tsx; fictional equipment only |
| Application screenshots | Created in `previews/` | Desktop/mobile captures from the running first build; no live AI/payment outcome is represented |
| Demo video and narration | Not created | Record the working build; no copyrighted background music |

The MIT license covers original Pactra materials. Third-party SDKs, fonts, provider branding, and future media retain their respective licenses; record provenance when actually added. No third-party logo pack, scraped product image, paid asset, or generated screenshot is bundled in this planning pack.

Seller console screenshots in `assets/previews/pactra-seller-console-*.jpg` are original browser captures of the local isolated test market, October 19, 2026. They show fictional fixture policy values and test-only instructions.

The marketplace includes adapted Channel3 UI product-card and format/variant helpers from [channel3-ai/channel3-ui](https://github.com/channel3-ai/channel3-ui), MIT licensed. Its license is retained in `apps/web/src/components/channel3/LICENSE.channel3-ui`. Imports and styling were adapted for the existing Pactra workspace. Channel3 product photographs are loaded from provider-supplied image URLs; they are not bundled as original assets. Marketplace screenshots under `assets/previews/pactra-marketplace-*.jpg` are browser captures, with retailer captures showing time-specific external provider data.

`previews/pactra-negotiation-allowance.jpg` is an original local browser capture showing the configurable allowance on the creator-kit form. No negotiation was started to capture it.

Flight screenshots in `previews/pactra-flights-*.jpg` are original local browser captures from October 19, 2026. They show clearly labeled fictional itineraries and invented airlines/prices, not Duffel provider inventory or bookable fares. The flight interface uses native CSS/SVG and the existing icon set.
