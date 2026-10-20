# Pactra brand kit

Original vector identity: two sides linked into one agreement. Colours are orange `#C74925`, ivory `#FFFAF0` and ink `#25332B`. The wordmark uses an Arial bold base with consistent spacing. No stars, sparkles or decorative dots accompany the identity.

| Asset | Final path |
| --- | --- |
| Standard logo | `apps/web/public/brand/pactra-logo.svg` |
| Light wordmark | `apps/web/public/brand/pactra-logo-light.svg` |
| Standalone mark | `apps/web/public/brand/pactra-mark.svg` |
| Install icons | `apps/web/public/brand/pactra-192.png`, `pactra-512.png` |
| Browser favicon | `apps/web/src/app/favicon.ico` |
| SVG browser icon | `apps/web/src/app/icon.svg` |
| Apple touch icon | `apps/web/src/app/apple-icon.png` |
| App manifest | `apps/web/public/manifest.webmanifest` |

Use `BrandLogo` for application headers and footers. Use the standalone mark only where the full wordmark will not fit. Keep the proportions intact, preserve clear space, and use the light wordmark on dark backgrounds. SVG sources are authoritative; PNG/ICO copies are rendered exports of the same mark. The artwork was authored as native vector paths, not generated as a bitmap or taken from a logo pack.

The existing seven generated campaign/equipment photos retain their provenance in [image-prompts.json](image-prompts.json). Five new general category illustrations in `apps/web/public/images/category-*.svg` are original native vector artwork and clearly illustrate demo goods.

The earlier lifestyle campaign image `shopping-moment.webp` is retained. The current full-width hero uses `apps/web/public/images/agents-negotiation-hero.webp` and the portrait `agents-negotiation-hero-mobile.webp`, created with the built-in image generator. Two humanoid buyer/seller agents negotiate over unbranded headphones; the $79/$88 offers and delivery/warranty terms are illustrative. The complete generation/refinement prompts are in the manifest. Real catalog photos come from manufacturer references in `assets/catalog/review-products.json`; campaign art must not substitute for those product photos.
