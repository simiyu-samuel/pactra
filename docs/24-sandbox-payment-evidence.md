# Verified sandbox payment and signed webhook evidence

October 21, 2026, Africa/Nairobi. The user completed PayPal buyer approval in the browser. This is a real PayPal sandbox transaction, not real money, shipment or merchant settlement.

## Confirmed agreement and capture

- Agreement: `a6dd7f1e-7f20-4bde-b647-11c8cdd67753`.
- Negotiation room: `6fb6487c-f5e3-4809-a718-00876fa7db28`.
- Product: one Bellroy Classic Backpack 20L — Black from Pixel Port.
- Recorded asking total with the same delivery: USD 147.00.
- Accepted and captured total: USD 140.00; negotiated saving: USD 7.00.
- PayPal order: `5PE84038DE361270K`, provider state `COMPLETED`.
- Capture: `2PC56664TG939531C`, provider state `COMPLETED`, USD 140.00.

A fresh server-to-server retrieval passed the existing checks for order identity, configured merchant, USD amount, checkout reference, immutable agreement hash and capture identity/amount. Both buyer and seller order projections showed the same paid agreement. There was one `payment.completed` event and one consumed reservation for quantity one. Payer emails, addresses, credentials and full provider payloads are deliberately excluded from this evidence record.

## Live webhook fault and correction

The ngrok HTTPS tunnel received real `CHECKOUT.ORDER.APPROVED` and `PAYMENT.CAPTURE.COMPLETED` notifications, but the app initially rejected them with `INVALID_WEBHOOK`. Schema validation reconstructed the JSON object before sending it to PayPal's verification endpoint, changing the order of its fields.

Testing the exact same genuine notification against PayPal demonstrated that the original object passed while the schema-reordered object failed. The receiver now validates the JSON separately while retaining the original request text for signature verification. The postback embeds that original signed text directly into `webhook_event`, preserving whitespace, field order and encoding. All other JSON API routes retain their normal validated parsing and the request-size limits remain enforced.

Two authentic, previously rejected notifications were recovered from the local ngrok inspector and passed to the corrected receiver with their original PayPal verification headers. PayPal verified both signatures, the durable inbox stored them, and the running worker processed each on its first attempt without errors:

- Approval: `WH-40K93551AR505270A-3TH660021E869433A`.
- Completed capture: `WH-4LF48126HA4399243-2WD25539SR364304D`.

This recovery replayed real signed events; it did not simulate an event, approve a purchase, initiate another capture or issue a refund. After the optimized production rebuild, the original completed-capture notification was posted twice through the public ngrok HTTPS endpoint to the running production route. Both deliveries returned HTTP 200 with `received: true`. The durable inbox retained one entry per original event, both processed on attempt one without errors. The agreement remained paid at USD 140.00, with one `payment.completed` event and one consumed reservation of quantity one; duplicate delivery created no additional payment or inventory effect.

## Verification

All 120 regression tests passed in the isolated `pactra_test` database with provider stubs. New cases assert that the exact signed JSON, including field order, whitespace and Unicode, reaches the verification request; malformed JSON is rejected before provider verification or durable intake. Existing invalid-signature, duplicate-delivery, ownership, payment mismatch, reservation and refund checks still passed. Strict TypeScript and the final optimized production build passed.

Live sandbox capture and signed local notification verification/processing are now demonstrated. The later user-approved full refund is also verified; see document 25 for the completed refund and signed notification evidence. Render resources, deployment, the hosted webhook registration and staged smoke checks remain outstanding. The order assistant's live Groq check remains separate from payment verification and was previously blocked by automatic approval review; this work did not send payment information to an AI provider.

Reference: [PayPal webhook verification documentation](https://developer.paypal.com/api/rest/webhooks/rest/) requires posting the event back without changes to its formatting or content.
