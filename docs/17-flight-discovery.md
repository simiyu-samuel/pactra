# Flight discovery and comparison

Implementation scope, October 19, 2026. This implements the travel-search phase of the approved marketplace expansion. Product negotiation and PayPal sandbox checkout remain separate.

## Current delivery boundary

- `/flights`: one-way or return journeys, one to six adults, cabin selection, maximum connections, and optional departure/return dates shifted together by one day in either direction (same trip length).
- Duffel v2 test-mode offer requests supply fare data. All returned itineraries are labeled test data. Only `duffel_test_` tokens are accepted in this slice; live access is a separate release decision.
- Compare total price for all travelers, stops per leg, duration, operating airlines, local departure/arrival times, included checked/cabin baggage, and known change/refund permissions. Unknown information is never translated into a free allowance or refundable fare.
- Flexible-date comparison performs up to three searches. Prices are compared within one currency; the lowest badge means lowest among the displayed returned offers, not cheapest worldwide. Incomplete date searches are disclosed.
- Users can shortlist up to three fares and refresh a selected offer to see price/availability changes. The refreshed offer must still match the owned itinerary and passenger/cabin/connection constraints. Expired fares cannot appear current.
- Duffel search does not return a universal external booking link. This release can copy a route/date summary and open the verified KAYAK flight search homepage for a separate search. It does not transfer an offer, price or reservation. Do not fabricate an exact booking link.
- A clearly labeled fictional example is available without a token. Example prices never appear as provider results and cannot be refreshed or booked.

## Architecture and limits

Use the existing web/API process and PostgreSQL. An additive `FlightSearch` table records browser ownership, canonical query, allocated provider call count, status, normalized results, and UTC creation time. It stores no passenger identity, API token or payment information. Provider calls occur outside transactions, with timeouts and no automatic retries.

`POST /api/flights/search` validates the trip, enforces same-origin/browser ownership and durable admission limits, and returns source-tagged normalized results. Successful results may be reused for 90 seconds after removing expired offers. Default limits are ten searches per browser per hour and 100 allocated Duffel calls per rolling day. A flexible request allocates three calls, including failed attempts. Cached requests do not allocate another paid search.

`POST /api/flights/refresh` accepts a search ID and offer ID, verifies ownership and membership in the original result, and refreshes only that provider offer. Refresh failures/expired offers show an explicit unavailable state. Refreshes have separate pacing and accounting; a refreshed price is never automatically approved for payment.

Only the constant Duffel API origin is called. Its test-mode response flag is checked independently of the token. Browser/provider data is rendered as text. Amounts remain provider decimal strings, currencies remain explicit, and timestamp strings preserve airport-local time rather than being silently converted to the shopper's timezone.

No airline bookings, passenger details, ticket issuance, live charges, PayPal collection for tickets, or airline-price negotiation are included. Native sandbox payment evidence remains unchanged.

## Verification gates

- Schema/date/route/adult/cabin/connection validation and bounded date expansion.
- Missing baggage, mixed currencies, stale or wrong-route offers, malformed amounts, test/live mismatch, and price-change handling.
- Real PostgreSQL ownership, atomic quota admission, caching and failed-request accounting, with stubbed provider calls in automated tests.
- Desktop/mobile search and comparison walkthrough using the fictional example; live Duffel test check only after the locally configured token is present.
- Hosted access, provider terms/account billing, real inventory, exact merchant handoff integration and live fare claims remain later release work.

## Connected provider verification

October 19, 2026: configured a local test token and restarted the production web process. The explicit verification script returned 12 retained LHR–JFK one-way offers with no failed dates. A browser search for two adults NBO–DXB, November 18–25 with ±1-day flexibility, returned 36 retained test offers across November 17/18/19 departures; return dates shifted together. Nonstop filtering returned three offers. The two-fare comparison and selected-offer refresh succeeded; browser logs contained no warnings/errors. Four search calls and one refresh were used. No booking, payment or live inventory claim was tested or enabled.

## References checked

- https://duffel.com/docs/guides/getting-started-with-flights
- https://duffel.com/docs/api/v2/offer-requests
- https://duffel.com/docs/api/v2/offers
- https://duffel.com/guides/getting-started
- https://duffel.com/pricing
- https://www.kayak.com/flights

The earlier Amadeus Self-Service links no longer open their referenced onboarding pages; their archived documentation is not sufficient evidence that new access is available. Duffel's current official test-token flow is the selected integration path.
