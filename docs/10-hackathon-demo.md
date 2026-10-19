# Hackathon and demo plan

> October 19 approved scope update: [Marketplace expansion](16-marketplace-expansion.md) supersedes the original single-category discovery/UI boundary below. Native negotiation and PayPal integrity requirements remain in force.

## Submission thesis

**Pactra makes an agreement between AI buyer and seller agents visible, enforceable, and payable.**

The submission must demonstrate actual negotiation decisions and an actual PayPal sandbox transaction for the chosen offer. A polished animation or a chat log alone does not establish the product.

## Judging alignment

| Criterion from supplied brief | Evidence to show |
| --- | --- |
| Technological implementation | Independent agent contexts, structured actions, validated floors, durable workflow, exact PayPal create/capture/reconciliation |
| Design | Coherent brief-to-room-to-review-to-receipt journey with readable tradeoffs and useful failure states |
| Potential impact | One specific buyer and seller problem, preliminary interview findings if completed, no fabricated traction |
| Innovation / idea | Multi-term agent negotiation, user steering, policy enforcement, accepted-agreement continuity |
| Presentation | A visible budget change, resulting tradeoffs, human approval, and matching sandbox receipt in under three minutes |

Most relevant awards are Best Use of Agentic Commerce, Best Use of PayPal + AI, and Best Demo Delivery. Overall judging remains the main target; do not dilute the core path to chase every sponsor award.

## Primary demo story

The buyer needs a creator kit: 4K camera, compatible microphone, and mini tripod, at most $500, arriving within four days. Video quality is the main preference. Three simulated sellers negotiate. The buyer lowers the cap to $430. Sellers respond differently within their policies. The buyer reviews one eligible offer and approves its exact PayPal sandbox payment.

A Studio Stack $419 example is feasible in the fixtures, but the live model is not required to choose that exact price or winner. Show the actual valid result. Never script a fake live agreement to match the storyboard.

## Video storyboard: target 2 minutes 45 seconds

| Time | Screen/action | Narration purpose |
| --- | --- | --- |
| 0:00–0:15 | Brief product introduction over the room | Explain the buyer's problem and the one-line idea |
| 0:15–0:35 | Enter and confirm creator-kit brief | Establish exact budget, deadline, required items, and priorities |
| 0:35–1:05 | Three seller lanes and a buyer counter | Show separate seller strategies and a genuine permitted concession |
| 1:05–1:30 | Change cap to $430; show revised offers | Demonstrate steering, substitutions, and stale-offer handling |
| 1:30–1:50 | Comparison and review of exact chosen offer | Explain the tradeoff; confirm items, shipping, and total |
| 1:50–2:20 | Official PayPal sandbox approval and receipt | Show functioning create/capture flow and matching accepted total |
| 2:20–2:35 | One short policy-boundary or no-deal example | Prove agents cannot invent a discount or impossible product |
| 2:35–2:45 | Final product view with project link | State what was built and the prototype boundary |

Groq free-tier quota pacing and payment approval can make the full journey longer than the video. One admitted live room is the default demo capacity; display real queue/cooldown states to visitors. Use clearly disclosed cuts/time compression, or an explicitly labeled earlier live run, while showing the working build. Keep a genuinely interactive hosted demo available to judges. Do not imply a sped-up sequence is measured latency.

## Rehearsal preparation

1. Verify the deployed release, worker readiness, database, provider quotas, and webhook configuration.
2. Use a clean guest session and confirm the owner console is protected.
3. Prepare the fictional catalog and a separate sandbox buyer account privately.
4. Check reservations and unresolved payments before any owner reset.
5. Run the main scenario once, then record a fresh live run.
6. Keep an owned replay as an explicitly labeled backup only if implemented.
7. Hide credentials and unnecessary payer personal details in recordings.
8. Use original product illustrations or text cards and permitted PayPal integration UI; no copyrighted soundtrack.

## Pitch draft

"Shopping assistants can recommend products, but a useful buying representative should also negotiate the deal. Pactra gives your buyer agent three seller agents to negotiate with. Each seller has its own inventory, price limits, and strategy. Change your budget and watch the offers adapt. Choose the agreement you want, then complete that exact purchase through PayPal. Our prototype demonstrates a controlled creator-equipment market with real sandbox checkout and enforceable boundaries."

## Submission checklist

- [ ] Read full official rules and confirm eligibility, timing, and required disclosures.
- [ ] Functional build meets F01–F14; latest release status is honest.
- [ ] Description explains problem, audience, AI roles, PayPal flow, architecture, and limitations.
- [ ] Public repository contains all original source/assets, setup instructions, and visible top-level license.
- [ ] Hosted URL works from a fresh browser or complete local run instructions are independently verified.
- [ ] Model/service identifiers and how AI was used are documented.
- [ ] Separate simulated storefronts and the single sandbox merchant arrangement are disclosed.
- [ ] Public YouTube video is under three minutes and shows the functioning product.
- [ ] Video contains no exposed secrets or unlicensed third-party media.
- [ ] All links, repository visibility, demo access, and video visibility are checked after submission.
- [ ] Submission is completed by the internal November 11 target; final event cutoff from supplied brief is November 12, 23:00 EAT.

The public [source repository](https://github.com/simiyu-samuel/pactra) is connected. A hosted deployment, video upload, and hackathon submission are still pending.
