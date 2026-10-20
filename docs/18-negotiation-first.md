# Negotiation first: approved product direction

October 20, 2026. This user-approved direction supersedes the creator-only scope and the equal emphasis previously given to external discovery.

## Core problem and promise

Buyers want a fair total and delivery terms without repeatedly contacting sellers. Sellers want to convert interest without giving away control of their margins or stock. Pactra gives each side an agent that works within explicit limits. The buyer makes the final choice and approves the payment.

Primary journey: choose seller-listed products → confirm quantity, budget and delivery → buyer/seller agents negotiate → compare eligible offers → review the exact agreement → approve PayPal test payment.

External retailer search and flight discovery are supporting tools. External sellers do not participate in Pactra negotiations, and their products use their own checkout. No flight booking is provided.

## General product contract

New buyer requests carry `items: [{productId, quantity}]`, selecting one to eight exact catalog products and one to five units of each. A seller must stock the entire selection; a basket cannot silently combine sellers into one payment. At least one seller must have the requested stock before admission consumes a negotiation slot. Categories are open to seller-entered names. Listing details specify exact model, size and colour; arbitrary free-text features are not promised or inferred as new product facts.

Offer validation checks exact product IDs and quantities, rejects unrequested extras, and enforces the all-in USD budget and arrival deadline. General recommendations compare price and delivery for the same selected products; they do not invent a product-quality score. Earlier rooms without `items` retain their original camera-kit compatibility and ranking contract. Checkouts still revalidate stock, current seller rules and the confirmed request before taking an atomic reservation. Existing accepted snapshots and payment recovery rules remain unchanged.

## Seller workspace

The protected workspace manages the three demonstration shops. Sellers can add an item from any category with a name, description, asking price, private minimum and stock. Product creation is atomic, version checked, retry safe and recorded in the immutable shop-rule history. Adding a product invalidates earlier unaccepted offers through the existing rule-version checks. Minimum prices and private notes never enter the buyer catalog. This is a controlled demo workspace, not public multi-merchant onboarding.

A new additive Product.description migration supports general product information. The seed adds four everyday products to all three demo sellers without overwriting edited prices or inventory. The expanded local catalog contains twelve products and thirty-three listings before any additional seller entries. Catalog additions create new seller-rule history records; buyers should negotiate fresh offers after changes.

## User interface and brand

The home hero, navigation and buyer flow lead with negotiation. Seller controls explain minimum prices, stock and delivery in shopping language. External store search is collapsed under an optional tool section, and flights live among supporting footer links. Decorative sparkles, the star next to the wordmark and ornamental dots are removed. Structured offer summaries use validated prices and delivery dates rather than unverified prose.

The original linked-agreement logo is shared by the header and footer. SVG wordmarks, the standalone mark, favicon, Apple touch icon and install icons are versioned. See [the brand kit](../assets/brand/README.md). Product/category illustrations are labeled demo art. No real-money transaction, real fulfillment, live airline booking or external-merchant negotiation is claimed.
