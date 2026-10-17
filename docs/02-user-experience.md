# Experience and screen plan

## Interaction principles

Pactra should feel like watching a capable representative work for you. Favor an understandable offer board over an endless chat transcript. Make actions visible, explanations short, and the final purchase deliberate.

Show human-readable action summaries such as "Asked Studio Stack to replace the wireless microphone." Do not display hidden model reasoning or invent internal thoughts. Every displayed price and product fact comes from a validated structured record.

## Buyer journey

1. **Describe:** enter a shopping goal or choose the creator-kit preset.
2. **Confirm:** edit the extracted brief. Separate hard requirements from preferences. Ask a clarifying question if currency, budget, required item, or arrival requirement is ambiguous.
3. **Watch:** enter a room with three seller lanes and a buyer action feed.
4. **Steer:** edit budget or priorities while a negotiation is running or after offers arrive. A new brief version replaces checkout eligibility of previous offers.
5. **Compare:** inspect eligible bundles. A recommended offer has a factual explanation; other valid offers remain selectable.
6. **Review:** inspect exact items, quantities, prices, shipping, fixed demo tax assumption, total, delivery estimate, and seller terms.
7. **Approve and pay:** lock the agreement and use the official PayPal sandbox approval experience.
8. **Receive:** show a persistent receipt linked to the agreement and actual capture state.

## Screens and routes

| Route | Purpose | Primary action |
| --- | --- | --- |
| `/` | Explain the experience and show one useful preset | Start negotiating |
| `/brief/new` | Compose and confirm requirements | Confirm brief |
| `/rooms/:sessionId` | Live seller lanes, offer comparison, and buyer steering | Revise brief or select offer |
| `/checkout/:checkoutId` | Exact agreement and payment state | Approve sandbox payment |
| `/receipts/:receiptId` | Accepted terms, capture reference, and timeline | Return to room or start fresh |
| `/seller-console` | Protected owner demonstration of agent policies | Publish policy revision |
| `/how-it-works` | Explain the prototype boundaries and agent roles | Try the preset |

## Negotiation room: desktop layout

```text
PACTRA     Creator kit / Brief v2                 Sandbox demo
Budget <= $430     Arrival <= 4 days     Quality first   [Edit]

YOUR AGENT: "I am keeping the better camera and asking for fewer extras."

PIXEL PORT                STUDIO STACK                SWIFT GEAR
Price-first seller        Bundle-first seller         Speed-first seller
Round 2: responding       Round 2: offer ready         Round 2: offer ready
Exact kit + total         Exact kit + total           Exact kit + total
Constraint status         Constraint status           Constraint status
[View conversation]       [View conversation]         [View conversation]

Comparison: total | camera | microphone | delivery | warranty
Recommended: Studio Stack — $419 illustrative valid outcome
[Review this offer]       [Compare another valid offer]

ACTIVITY: persisted actions and short reasons; expandable by seller
```

Illustrative numbers describe a valid fixture, not a guaranteed live AI outcome.

On mobile, show stacked seller cards with sticky brief controls and a separate comparison drawer. Do not make the entire interface a horizontally scrolling grid. Keep payment and revision buttons comfortably reachable.

## Required component states

| Area | States |
| --- | --- |
| Brief | Empty, parsing, clarification needed, ready to confirm, invalid budget |
| Seller lane | Waiting, responding, valid offer, countered, declined, timed out, no longer eligible |
| Offer | Active, superseded, expired, invalidated by policy or stock, locked for checkout |
| Room | Running, revising, complete, no eligible deal, paused by limits, interrupted with resume option |
| Connection | Connected, reconnecting, caught up, polling fallback |
| Checkout | Reserving, ready for PayPal, awaiting approval, checking payment, pending, paid, cancelled, needs reconciliation, failed |
| Receipt | Paid, refunded, reversed, pending review; never silently erase payment history |

## Revision behavior

Before checkout starts, a revision is accepted at any time. Display "Brief updated to v2" and clearly dim v1 offers. An old in-flight agent response is stored for diagnostics but cannot become a v2 offer.

After a checkout lock exists, freeze its agreement. To change requirements, first cancel an unpaid, non-capturing checkout and release its reservation. A capture already in flight or under reconciliation must be resolved before another checkout is opened. A completed purchase stays attached to its original brief.

## Comparison and recommendation copy

- State the relevant tradeoff: "Better camera, wired microphone, arrives in four days."
- Mark missing hard requirements before showing a score.
- Explain savings only for an identical item set and delivery option.
- Distinguish "cheaper alternative" from "discount on the same kit."
- Use "No eligible offer yet" when none meets the brief.
- Avoid claims such as "best price on the internet," guaranteed savings, or verified real-world seller trust.

## Seller policy console

The owner selects a fictional seller, edits a draft, and publishes a version. Editable fields are listing floor, available quantity, fixed shipping choices, and agent strategy description. Read-only fields include seller ID and the configured demo merchant arrangement.

Publishing affects fresh proposals and future acceptance checks; a locked checkout retains its validated snapshot. Active rooms must detect invalidated unlocked offers. Buyers never see floors or competitors' policies. The console should use a conventional form rather than another chatbot.

## Accessibility and product tone

Support full keyboard operation, visible focus, labeled fields, sufficient contrast, and reduced motion. Status must use text and icons as well as color. Batch live announcements so a screen reader is not flooded by every event. Preserve readable totals and errors at 200% zoom.

The negotiation may feel energetic, but no artificial typing delay, fake countdown, fabricated social proof, or mandatory confetti should hide real progress. Offer expiry is a real server timestamp. See the [brand direction](../assets/brand/brand-direction.md).
