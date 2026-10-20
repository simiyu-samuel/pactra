# Live negotiation window

Approved and implemented October 20, 2026. Buyer/seller negotiation is the centre of the experience; the new window replaces the activity list below the product offers.

## Experience

On desktop, a floating right-side conversation reserves space beside the offer cards. It has separate seller tabs, buyer/seller message styling, round labels, proposal cards and a pinned **Where the deal stands** summary. The summary uses the current server-validated offer and shows total, delivery, warranty, eligibility warnings and any decrease from that seller’s opening proposal for the current request. Earlier proposals are labelled; an expired or otherwise ineligible offer cannot earn the “Fits your request” label.

The buyer can expand, minimise or reopen the window. Seller tabs support arrow/Home/End keys and show unread counts for new exchanges in other threads. New messages and changed offer totals animate on arrival; reduced-motion preferences disable those animations. The thread follows new messages when already near the bottom. Reading earlier messages preserves the scroll position and exposes a jump-to-latest control. The window is a complementary panel, with no modal focus trap, and Escape minimises it. Comparing offers collapses the panel and jumps to the offer cards.

On narrow screens the default is a compact floating conversation bar; opening it reveals a bottom sheet. Minimising restores the bar. It does not force itself open or switch sellers when updates arrive.

## Actual activity and public facts

There are no additional AI calls, fabricated messages, delayed pretend typing or token playback. The browser uses the existing owned event stream and polling. The room response adds a public worker-progress projection from the durable job step, state, next-run time and lease. It distinguishes actual active work, the next turn, quota waiting, expired leases and finished runs. The UI names the actual buyer/seller actor without exposing private worker checkpoints.

Room HTTP and SSE responses now pass through `publicNegotiationEvent`. This allows only bounded public amounts, seller/offer references, round/request version and delivery/warranty facts. Raw model prose, private instructions, floors and arbitrary nested payloads are replaced by deterministic shopping updates. Historical event records are preserved. Buyer counters show the actual structured target; seller proposals show validated totals. These are readable representations of the exchanges, not hidden model reasoning or a verbatim transcript.

New offer events include arrival, warranty and request version; legacy events remain readable using the public facts they contain. The current request’s conversation starts at its confirmation/revision marker. Seller-specific exchanges never appear in another seller’s tab. Shared request/run/payment notices remain shared. The existing brief history preserves earlier request versions; no payment or stock reservation is triggered by opening the window.

## Validation

105 unit/integration tests passed, including seven new checks for event redaction, unsafe model prose, numeric evidence, seller isolation, revision boundaries, real worker turn mapping and quota/lease/terminal states. TypeScript and the production build are checked with the application release. No migration or new package is needed.

A dedicated `pactra_conversation_ui` database, with all provider credentials disabled, supported the browser checks. Synthetic offers/counters verified separate histories, live unread arrival, paused feedback, historical/expired proposal labelling, expansion/minimisation, keyboard tabs and comparison handoff. Both actual room HTTP responses and SSE removed a private-context canary and rejected a guest browser. Desktop and 390px mobile screenshots were visually reviewed; neither document overflowed horizontally. Mobile peek/open/comparison handoff passed. Screenshots ending `-fixture.jpg` show test records, not real agent negotiations or payments.

The viewport tool applied its narrow setting after a delay; once the actual DOM reported 390px, mobile checks ran at that size. Temporary overrides are reset after testing. Published owner prices, stock and listing states are not modified by this work.

## Production and live verification

The optimized production build and final TypeScript checks passed. Production HTTP checks passed all main pages and readiness, public catalog redaction, forged-origin rejection and room ownership. The temporary test database, fixture script and private test environment were removed, and the production web/worker were restored.

A real Groq run against the owner-published AeroPress product completed all 11 steps and finished with a valid $43 total including delivery, under a $50/five-day test request. The window showed the $46 opening proposal, actual buyer counter targets, a $43 second proposal, an unavailable final seller update, actual quota pauses and completion. Only Pixel Port has published stock for this run; the other shop conversations correctly had no offer. The final seller update was unavailable, so the earlier valid $43 offer remained current; there was no explicit hold event. No checkout, stock reservation, PayPal order or payment was created by this walkthrough. The live screenshot `assets/previews/pactra-live-conversation.jpg` shows this actual negotiation; it is distinct from the isolated fixture screenshots. The owned completed room is left open in the local browser.
