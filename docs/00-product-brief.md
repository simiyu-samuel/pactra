# Product brief

> October 19 approved scope update: [Marketplace expansion](16-marketplace-expansion.md) supersedes the original single-category discovery/UI boundary below. Native negotiation and PayPal integrity requirements remain in force.

Status: proposed implementation baseline, October 17, 2026.

## Product promise

**Pactra gives shoppers an agent that can negotiate their actual priorities with competing seller agents and turn an accepted agreement into a payable order.**

The buyer defines what matters. Seller agents respond using their own permitted terms. The buyer sees the negotiation and stays in control of spending.

## The problem and first audience

Our first audience is a new video creator assembling a camera kit on a limited budget. Comparing bundles is difficult because the cheapest headline price may omit a microphone, arrive too late, or include accessories the buyer does not value. Sellers can often improve a package through a different mix of products or a permitted concession, but the shopper has to ask repeatedly.

These are product hypotheses to validate, not established market research. Before broadening the product, interview at least five buyers and three equipment sellers about a recent purchase, real negotiation behavior, and what information they would trust an agent to share.

## The product insight

A purchase is an agreement over several terms. A useful agent should negotiate those terms and preserve the resulting agreement all the way through checkout.

Pactra makes that process visible:

1. Translate intent into a confirmed shopping brief.
2. Invite independent seller agents to propose viable bundles.
3. Negotiate price, substitutions, accessories, and permitted delivery options.
4. Compare only offers that satisfy the confirmed hard requirements.
5. Let the buyer approve an immutable offer snapshot.
6. Complete that exact payment through PayPal and show a receipt tied to the offer.

## Why the agents matter

The buyer agent decides which tradeoffs to request and how to counter. Seller agents decide which permitted concessions to make, which products to substitute, and when to hold their position. Agents have different objectives and separate private context. Application logic checks their proposals; it does not fabricate the negotiation transcript.

Examples of visible behavior include trading an optional light for a better camera, requesting a cheaper compatible microphone, or declining an otherwise attractive offer because delivery misses the brief.

No discount is guaranteed. An agent may correctly conclude that no deal is possible.

## Personas and jobs

| Persona | Job to be done | Pactra's useful outcome |
| --- | --- | --- |
| Buyer: new creator | Get a suitable kit without comparing every combination manually | A comparable set of valid bundles and understandable compromises |
| Seller: small equipment shop | Respond to price-sensitive buyers without giving away margin indiscriminately | An agent constrained by stock, price floors, and permitted terms |
| Judge or first-time visitor | Understand and exercise the core idea quickly | A guided, live scenario with an observable negotiation and sandbox transaction |

The seller is simulated in the hackathon release. A protected policy console demonstrates how a future merchant would control their agent; it does not onboard real businesses.

## The memorable interaction

The user changes the maximum spend from $500 to $430 while negotiations are active. Pactra creates a new brief version, invalidates stale offers for checkout, and asks sellers to respond to the revised requirements. One seller may offer fewer extras, another a cheaper camera, and another decline. The buyer can see why the recommended deal changes.

## Differentiation to demonstrate

- Separate buyer and seller objectives, rather than one assistant inventing both sides in a single response.
- Negotiation over product mix and terms, with policy enforcement at every proposal.
- Explicit comparison of hard constraints and weighted preferences.
- A durable link between negotiated terms, user approval, and PayPal capture.
- A useful honest failure when no seller can meet the request.

Do not claim this is the first negotiating agent marketplace or that it outperforms existing products without evidence. The demo should establish the behavior directly.

## Success measures

| Measure | Hackathon target | How to measure |
| --- | --- | --- |
| First useful seller offer | p95 at or below 30 seconds after admission when provider quota is available | Server timestamps over at least 20 quota-paced runs |
| Complete negotiation | Free-tier target: p95 at or below 150 seconds; hard stop at 300 seconds per brief version | Include provider cooldown after admission; report admission queue time separately |
| Offer validity | 100% of published offers pass deterministic checks | Validator results; invalid proposals are not published |
| Payment fidelity | No mismatch between approved snapshot and accepted capture | Integration assertions and reconciliation records |
| Budget revision | No obsolete brief can create a new checkout | Concurrency and end-to-end tests |
| Comprehension | Four of five trial users can explain why a deal was recommended | Short usability exercise |
| Honest no-deal behavior | Every impossible fixture terminates without inventing terms | Evaluations with impossible requirements |

Latency targets are engineering goals, not measured claims. Groq free-tier scheduling may constrain the number of simultaneous visitors; show real waiting states and validate these targets during M0. Negotiated savings are calculated only against the same seller's listed prices for the same items and shipping option; substitutions are shown separately.

## Commercial direction after the hackathon

Potential revenue is a merchant subscription for an agent and negotiation analytics. A transaction fee is a later option after the payment arrangement and merchant permissions are established. Do not bias buyer ranking toward commissions or paid placement.

The initial growth hypothesis is a concentrated creator-equipment community with a small set of participating shops. Validate buyer trust, seller willingness, conversion, and the actual cost per negotiation before expanding categories.

## Long-term direction

Merchant onboarding, external inventory integrations, independently hosted seller agents, broader categories, saved buyer preferences, and repeat purchasing can follow after the single-category experience works. The hackathon release is a controlled demonstration of the underlying buying experience, not a production marketplace launch.
