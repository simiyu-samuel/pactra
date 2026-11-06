# Hackathon and demo plan

> October 19 approved scope update: [Marketplace expansion](16-marketplace-expansion.md) supersedes the original single-category discovery/UI boundary below. Native negotiation and PayPal integrity requirements remain in force.

## Submission thesis

**Pactra makes an agreement between AI buyer and seller agents visible, enforceable, and payable.**

The submission should show independent agent decisions, application-enforced seller and buyer limits, and a buyer-approved PayPal Sandbox checkout for the chosen offer. A polished animation or chat log alone does not establish the product.

## Judging alignment

| Criterion from supplied brief | Evidence to show |
| --- | --- |
| Technological implementation | Groq-powered buyer and seller agents, structured decisions, deterministic policy checks, and PayPal order creation, capture, and reconciliation |
| Design | A coherent marketplace-to-negotiation-to-offer-review-to-receipt journey |
| Potential impact | A specific buyer and seller problem: negotiating price and delivery terms without manually contacting sellers one at a time; do not claim unmeasured traction |
| Innovation / idea | Multiple independent seller agents respond to one buyer brief, with the buyer steering priorities and choosing the agreement |
| Presentation | Real agent conversations, comparable terms, human approval, and a matching Sandbox receipt in under three minutes |

The strongest fit is Best Use of PayPal + AI, Best Use of Agentic Commerce, and Best Demo Delivery, while keeping the overall judging criteria central.

## Primary demo story

Start from a currently published Pactra listing. The buyer sets a budget, quantity, delivery deadline, and a preference such as lower price or faster delivery. Pactra sends the brief to eligible seller agents independently. Each seller agent follows its own live inventory, delivery promises, warranty terms, and private minimum price. The buyer watches the conversations, compares complete offers, and chooses one. After reviewing the locked terms and total, the buyer approves the exact PayPal Sandbox payment.

Use a product that is currently published and in stock, and show the actual terms and result returned by the live system. Agent responses and final prices vary; do not script a particular seller, discount, latency, or winning offer.

## Demo video storyboard: target 2 minutes 30 seconds

| Time | Screen/action | Narration purpose |
| --- | --- | --- |
| 0:00–0:12 | Pactra storefront and a product listing | Introduce the problem: buyers compare prices but still negotiate delivery and terms seller by seller. |
| 0:12–0:32 | Open a product and enter the buyer's budget, quantity, and delivery need | Show the concrete brief the buyer agent will represent. |
| 0:32–1:05 | Watch the separate seller conversations and their offers | Explain that seller agents use independent store policies; the app checks stock, price limits, and delivery before offers count. |
| 1:05–1:23 | Compare the available complete offers and select one | Show the actual price, delivery, and other terms, and keep the decision with the buyer. |
| 1:23–1:52 | Review the exact deal and approve PayPal Sandbox checkout | Demonstrate PayPal in the real purchase path. Keep the amount visible and match it to the accepted agreement. |
| 1:52–2:08 | Show the resulting order or receipt | Connect the buyer's approval to the persisted order state. If showing a refunded rehearsal, label its current refunded status accurately. |
| 2:08–2:22 | Briefly show seller inventory/policy controls or an offer boundary | Explain that AI output is only a proposal; application rules protect seller floors, stock, and the buyer's limits. |
| 2:22–2:30 | End on Pactra and the live demo/repository links | State the prototype boundary: PayPal Sandbox, one shared sandbox merchant for the sample shops, and no live seller payouts. |

### Narration draft

“Online shopping makes it easy to compare listings, but negotiating price and delivery still means contacting sellers one at a time. Pactra gives the buyer and each participating seller their own AI agent.

“I’ll choose a product, set my budget and delivery needs, and let my agent ask eligible sellers for a deal. Each seller agent follows its store’s stock and private terms. Here you can watch the separate conversations and compare the offers they actually return.

“I choose this agreement and review the full terms. The agents cannot buy anything: Pactra checks the offer, locks the amount on the server, and asks me to approve that exact purchase through PayPal Sandbox. The order now reflects the buyer-approved result.

“Pactra uses Groq for the agent decisions and PayPal for checkout. Channel3 retailer search and test-mode flight search are optional discovery tools. This is a working prototype: the payment is sandbox-only, and the sample shops do not make real seller payouts.”

Keep narration aligned with the live recording. If the transaction takes longer than the video limit, use a clearly disclosed cut or a separately recorded real run; do not imply that editing shows measured negotiation speed. Hide credentials and unnecessary buyer details. Do not present a refunded order as a completed, unrefunded purchase.

## Rehearsal preparation

1. Verify the deployed release, worker readiness, database, provider quotas, and webhook configuration.
2. Open the marketplace in a clean guest session and confirm the owner workspace remains protected.
3. Choose a currently published, in-stock product and verify that multiple sellers can respond to its brief.
4. Prepare a separate PayPal Sandbox buyer privately; keep credentials off screen and out of the recording.
5. Check stock reservations and unresolved payments before any owner reset.
6. Rehearse the full sequence, then record a fresh run with a real result and accurate payment state.
7. Keep a previous run only as a clearly labeled backup; do not splice events to imply one continuous transaction.
8. Use product images and brand assets that Pactra is allowed to publish; use no unlicensed soundtrack.

## Pitch draft

“Shopping assistants can recommend products, but a useful buying representative should also negotiate the deal. Pactra gives a buyer agent several seller agents to negotiate with. Each seller follows its own inventory, price limits, and delivery terms. The buyer can watch the conversations, compare complete offers, and approve the exact agreement through PayPal Sandbox. Our prototype makes the negotiation visible and keeps purchase authority with the buyer.”

## Submission checklist

- [ ] Functional build meets F01–F14; latest release status is honest.
- [ ] Description explains the problem, audience, AI roles, PayPal flow, architecture, and prototype limits.
- [ ] Public repository contains source, setup instructions, an OSI-approved license, and honest sponsor-integration details.
- [ ] Hosted demo works from a fresh browser and is checked again before judging.
- [ ] Model/service identifiers and how AI was used are documented.
- [ ] Separate simulated storefronts and their shared Sandbox merchant arrangement are disclosed.
- [ ] Public or unlisted YouTube video is under three minutes and shows the functioning product.
- [ ] Video contains no exposed secrets or unlicensed third-party media.
- [ ] Demo and repository links, access, and video visibility are checked after submission.
- [ ] Submission is completed by the internal November 11 target; final event cutoff from supplied brief is November 12, 23:00 EAT.

The public [source repository](https://github.com/simiyu-samuel/pactra) and hosted [Pactra demo](https://pactra-web.onrender.com) are available. The Devpost draft, public video recording, and final submission remain to be completed.
