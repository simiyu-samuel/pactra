# Demo fixture guide

These are original fictional planning fixtures. No real brands, supplier stock, shipping promises, or independent quality measurements are represented. There is no importer or runtime seed command yet.

## Files

| File | Contents |
| --- | --- |
| `products.csv` | Eight unique fictional products and capability/compatibility facts |
| `listings.csv` | Twenty-one seller listings, listed prices, private demo floors, and starting on-hand stock |
| `seller-policies.csv` | Three seller strategies, fixed shipping choices, currency, and warranty terms |
| `scenarios.md` | User goals, expected constraints, and recovery scenarios |
| `negotiation-examples.md` | Illustrative structured actions and a feasible example result |

CSV money fields are integer USD cents. `capability_score` is a synthetic 0–100 demonstration value. Camera/microphone scores drive the default comparison; other scores are available for future use. All quantities must be nonnegative integers, and all fixture floors must be at or below their listed price.

## Import mapping for implementation

Products become public catalog facts. Listed prices and stock views become seller listings/inventory. `private_floor_cents` goes into that seller's versioned private policy projection. Do not send the full CSV rows to buyers. The fictional floors remain visible in the open-source fixture itself; real commercial floors must never be committed.

Camera microphone inputs and microphone outputs use 3.5mm TRS. All cameras and the mini tripod use the same 1/4-inch mount. Both creator cameras support 4K; Mira S1 is deliberately limited to 1080p to test exclusion. Products have no arbitrary missing stock or specifications that an agent may fill in.

Initial policies permit per-item prices from floor through listed price inclusive, listed shipping options only, and the seller's fixed warranty duration. No free shipping, extra warranty, unlisted gifts, invented promotions, or negative prices. An optional accessory can be removed; a required role needs user-approved brief revision before removal.

## Standard feasibility

Required kit: one 4K camera, one compatible microphone, and one mini tripod. Maximum arrival: four days. Currency: USD. Tax fixture: zero, disclosed as demo-only. No real shipping address is required.

| Seller / kit | Minimum permitted eligible total | Delivery | Meaning |
| --- | --- | --- | --- |
| Pixel Port / Nova M2 | $435 | 2 days, express | Cannot satisfy the revised $430 cap with this camera |
| Pixel Port / Vela C1 | $385 | 2 days, express | Cheaper camera substitution can satisfy $430 |
| Studio Stack / Nova M2 | $417 | 4 days, standard | Higher-quality camera can remain feasible below $430 |
| Studio Stack / Vela C1 | $367 | 4 days, standard | Lower-cost valid alternative |
| Swift Gear / Vela C1 | $392 | 2 days, standard | Faster valid alternative with lower camera capability |
| Swift Gear / Mira S1 | Not eligible for required 4K | 2 days, standard | Lower price does not override a missing hard capability |

Floors establish possible outcomes, not an instruction that agents must always offer their minimum. The negotiation must generate its own permitted price and terms. A $419 Studio Stack Nova kit is one illustrative valid result.

## Fixture hygiene

Seed logical seller IDs exactly as listed. Import policy version 1 for each seller. Use fresh generated room/checkouts for each test, with separate deterministic copies for concurrency tests. Owner reset must respect unresolved payment/hold protections. Never adjust a fixture during a live checkout merely to force the scripted winner.
