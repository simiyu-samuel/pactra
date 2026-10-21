# Seller workspace and release review

October 21, 2026. This review follows the user-completed purchase and seller-approved full refund.

## Seller experience

The seller workspace now has a persistent desktop sidebar and focused Overview, Products, Agent rules, Orders & payments and Activity views. The current-shop selector replaces the large seller tiles. Section links use URL fragments so browser history and reloads return to the chosen section. The shared header has a collapsible tablet/phone menu with Escape handling; seller navigation has its own phone menu.

Overview shows current catalog counts and saved delivery/warranty promises. These are derived from the selected shop; no sales or revenue figures are invented. The checklist directs sellers to catalog, negotiation rules and agreements.

Products opens as a compact list with photos, asking/private minimum prices, available/held stock and publication status. Search covers product names, brands and categories. Status and availability filters, sorting, a photo-grid alternative, empty states and 12-item pagination support catalog management. Archived products remain available through their filter. Historical sample products stay in order history and are excluded from the manageable catalog.

The product editor groups photos/details and price/stock boundaries, keeps the save action visible, and asks before discarding unsaved changes. Saving/publishing retains the existing authenticated, version-checked APIs and seller confirmation requirements. Unsaved agent rules prevent conflicting shop/product edits and warn before page exit. Temporary browser-review edits were discarded; this redesign did not publish, archive, reprice or restock products.

Embedded agreements adapt to the available content width, with a bounded scroll area for agreement selection. Existing PayPal checks, human refund approval and the narrow order assistant remain available. The review did not invoke the assistant or send order facts to Groq.

## Completed refund evidence

For agreement `a6dd7f1e-7f20-4bde-b647-11c8cdd67753`, the user requested and approved the full sandbox refund. The stored checkout is `refunded`, the refund request is `completed`, and fresh PayPal retrieval returned `COMPLETED` for refund `7KW21078JP376210H`, USD 140.00, linked to the original capture. The signed `PAYMENT.CAPTURE.REFUNDED` notification is verified and processed without an error. There is exactly one `payment.refunded` event; the consumed reservation remains unchanged. Verification retrieved the existing refund and did not initiate another financial operation.

The seller workspace visibly rendered the Bellroy agreement as “Refund confirmed”, including the original USD 147 asking total, USD 140 agreed total and USD 7 negotiated saving. See [the original capture evidence](24-sandbox-payment-evidence.md).

## Verification record

- All 120 regression tests passed in isolated PostgreSQL with provider stubs.
- Browser checks at 1440px desktop, 820px tablet, 390px phone and 320px narrow phone confirmed readable layouts and no document horizontal overflow in the reviewed views.
- Product search, price sorting, list/grid switching, phone menus, header Escape handling, product image editing, keep/discard of unsaved form changes and agent-rule conflict guards were exercised. No catalog changes were saved during these checks.
- The proposed [Render Blueprint](../render.yaml) passed local validation against Render's official JSON Schema. This does not validate an account, plans, credentials, build resources or a hosted deployment.

Strict TypeScript and the final optimized production build passed. Production HTTP checks returned 200 for the storefront, seller workspace, negotiation, orders, flights, readiness and icon. Public catalog redaction passed; unauthenticated owner access returned 401, a forged origin returned 403 and an unsigned webhook returned 400. The approved local restart now serves the release on port 3100. Its isolated build uses `PACTRA_DIST_DIR=.next-review`; normal Render builds retain the default `.next` directory.

Screenshots of the overview omit private minimum prices and seller notes: [desktop](../assets/previews/pactra-seller-workspace-desktop.png) and [phone](../assets/previews/pactra-seller-workspace-mobile.png). Final production screenshots/checks added a 1280px desktop and 390px phone review.

## Next release step

Claim the hackathon’s USD 50 Render building credit and confirm its balance/expiry in the chosen workspace before using the proposed credit-funded web/worker/database plans. No out-of-pocket infrastructure spending is approved. Register its new HTTPS webhook, set the matching verification ID, then repeat the negotiation, buyer approval, capture and refund flow on staging. Keep real payments disabled. See [Render readiness](20-render-readiness.md).
