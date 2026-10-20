# Full-width agent negotiation hero

Requested October 20, 2026: replace the separate right-hand lifestyle photo with a generated background showing two humanoid agents negotiating a product, including prices and other terms.

The marketplace hero now spans the page behind the headline and buyer/seller actions. An original warm ivory/orange/green studio scene shows two ceramic humanoid robots discussing unbranded headphones. The buyer proposes $79 and the seller asks $88; the panels include example three-day delivery and twelve-month warranty terms. The image is identified as an illustrated negotiation, separate from published product listings and live room offers. Actual product pricing, stock, negotiation and checkout behavior are unchanged.

At tablet widths, the same full-width scene sits below the headline so both agents remain visible. A dedicated portrait composition keeps both agents and their offer panels in view on phones, with quiet wall space above them for text. The browser selects it through a responsive picture source. An overlay preserves headline contrast; readable HTML copy and navigation remain interactive. No stars, sparkles or decorative particles were added. Image alternatives describe the illustrated product, amounts and terms.

## Saved assets and prompts

- `apps/web/public/images/agents-negotiation-hero.webp` — 1904×826, approximately 171 KB.
- `apps/web/public/images/agents-negotiation-hero-mobile.webp` — 887×1774, approximately 164 KB.
- `assets/brand/image-prompts.json` — complete initial prompt, desktop price-label correction and portrait adaptation prompt. Mode: built-in `image_gen`.

Original generated PNGs are retained in the local Codex generated-image directory. The previous lifestyle asset remains available for historical reference. Responsive WebP copies are committed to the project, so the site does not depend on local generated-image paths.

## Validation

Desktop, 820px tablet and actual 390px mobile browser review confirmed a single background hero, readable overlaid headline/actions, visible agents/product/offer cards, correct responsive image selection and no document horizontal overflow. The published six-item public catalog remained available. Both WebP routes returned 200 with the expected image type. Strict TypeScript and the final optimized production build passed. Production smoke checks returned 200 for the storefront, negotiation page, seller workspace, flight finder and database readiness; public bootstrap redaction passed. This presentation change did not require new backend tests, packages or database migrations, and its verification did not initiate negotiations or payments.

Visual references: `assets/previews/pactra-agents-hero-desktop.jpg` and `assets/previews/pactra-agents-hero-mobile.jpg`.
