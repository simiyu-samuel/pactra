'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, Check, CheckCircle2, ChevronLeft, Clock3, Handshake, Layers3, LoaderCircle, LockKeyhole, Radio, ShieldCheck, SlidersHorizontal, Zap } from 'lucide-react';
import { money, type Brief, type OfferTerms } from '@pactra/domain';
import { SiteHeader, SiteFooter } from './site-chrome';
import ConceptPhoto from './concept-photo';
import DealStory from './deal-story';

type Offer = { id: string; sellerId: string; sellerName: string; terms: OfferTerms; round: number; score: number; reasons: string[]; status: string };
type Seller = { id: string; name: string; strategy: string; standardDays: number; warrantyMonths: number; listings: Array<{ id: string; product: { id: string; name: string; role: string }; listCents: number; available: number; productId?: string }> };
type Room = { id: string; brief: Brief; version: number; state: string; offers: Offer[]; events: Array<{ id: string; type: string; data: { message?: string; sellerId?: string; totalCents?: number }; createdAt: string }>; checkouts: Array<{ id: string; state: string }>; briefHistory: Array<{ version: number; brief: Brief; createdAt: string; source: string }> };
type Checkout = { id: string; roomId: string; state: string; totalCents: number; captureId: string | null; snapshotHash: string; clientId: string | null; snapshot: { terms: OfferTerms; seller: { name: string } } };
type Boot = { negotiationAllowance: { limit: number; used: number; remaining: number; nextAvailableAt: string | null; recentRooms: Array<{ id: string; state: string; capCents: number; createdAt: string }> }; sellers: Seller[]; capabilities: { groq: boolean; paypal: boolean; model: string } };
type PaypalButtons = { render: (node: HTMLElement) => Promise<void>; close: () => void };
declare global { interface Window { paypal?: { Buttons: (options: Record<string, unknown>) => PaypalButtons } } }

async function api<T>(path: string, payload?: unknown): Promise<T> {
  const response = await fetch(`/api/${path}`, { method: payload === undefined ? 'GET' : 'POST', headers: payload === undefined ? {} : { 'Content-Type': 'application/json' }, body: payload === undefined ? undefined : JSON.stringify(payload), cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Request could not be completed.');
  return data;
}
const defaultBrief: Brief = { goal: 'Find a fair price for my selected products, with delivery included.', capCents: 15000, maxDays: 5, preference: 'quality', discloseBudget: false, items: [] };
const colors = ['#7961d7', '#188b7d', '#c58a38'];
const paymentStates: Record<string, { title: string; lead: string; label: string; message: string }> = {
  refunded: { title: 'Payment refunded.', lead: 'This test payment was fully refunded. Your original accepted terms are preserved below.', label: 'Payment refunded', message: 'The original test payment reference reference is preserved. No replacement payment has been started.' },
  reversed: { title: 'Payment reversed.', lead: 'PayPal reported a reversal of this test payment. Your original accepted terms are preserved below.', label: 'Payment reversed', message: 'The original test payment reference reference is preserved. Contact the support team if you need help with this payment.' },
  review_required: { title: 'Let’s check this payment.', lead: 'We need to check this payment before confirming the result. Your accepted terms are preserved below.', label: 'Payment needs review', message: 'Please contact the support team. Keep this agreement for reference and wait for the payment to be resolved before starting another.' },
};

function Payment({ checkout, refresh, report }: { checkout: Checkout; refresh: () => void; report: (s: string) => void }) {
  const node = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!checkout.clientId || !['reserved', 'awaiting_approval'].includes(checkout.state)) return;
    let cancelled = false;
    let buttons: PaypalButtons | undefined;
    async function mount() {
      if (!window.paypal) await new Promise<void>((resolve, reject) => {
        let script = document.getElementById('paypal-sdk') as HTMLScriptElement | null;
        if (!script) { script = document.createElement('script'); script.id = 'paypal-sdk'; script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(checkout.clientId!)}&currency=USD&intent=capture&components=buttons`; document.body.appendChild(script); }
        script.addEventListener('load', () => resolve(), { once: true }); script.addEventListener('error', () => reject(new Error('PayPal checkout could not load.')), { once: true });
      });
      if (cancelled || !node.current || !window.paypal) return;
      buttons = window.paypal.Buttons({ style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay' },
        createOrder: async () => (await api<{ id: string }>(`checkouts/${checkout.id}/paypal-order`, {})).id,
        onApprove: async (data: { orderID: string }) => { try { await api(`checkouts/${checkout.id}/capture`, { orderId: data.orderID }); refresh(); } catch (e) { report((e as Error).message); refresh(); } },
        onCancel: () => report('PayPal approval was cancelled. Your reservation remains until you cancel it or it expires.'),
        onError: () => { report('PayPal could not confirm the payment. Check its status before trying again.'); refresh(); }, });
      await buttons.render(node.current);
    }
    mount().catch(e => report((e as Error).message));
    return () => { cancelled = true; buttons?.close(); };
  }, [checkout.id, checkout.state, checkout.clientId, refresh, report]);
  return <div ref={node} className="paypal-mount"/>;
}

export default function Pactra() {
  const [boot, setBoot] = useState<Boot | null>(null);
  const [brief, setBrief] = useState<Brief>(defaultBrief);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [checkoutId, setCheckoutId] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [connected, setConnected] = useState(false);
  const requestKey = useRef(crypto.randomUUID());
  const checkoutKeys = useRef<Record<string, string>>({});
  useEffect(() => {
    api<Boot>('bootstrap').then(data => {
      setBoot(data);
      if (location.pathname === '/negotiate') {
        const products = data.sellers.flatMap(s => s.listings.map(l => l.product));
        const requested = new URLSearchParams(location.search).get('product');
        const product = products.find(p => p.id === requested) || products.find(p => p.id === 'BAG-01') || products[0];
        if (product) setBrief(current => ({ ...current, items: [{ productId: product.id, quantity: 1 }] }));
      }
    }).catch(e => setError(e.message));
    const restore = () => { const parts = location.pathname.split('/'); setRoomId(parts[1] === 'rooms' ? parts[2] : null); setCheckoutId(parts[1] === 'checkout' ? parts[2] : null); };
    restore(); window.addEventListener('popstate', restore); return () => window.removeEventListener('popstate', restore);
  }, []);
  const refreshRoom = useCallback(async () => { if (roomId) { const r = await api<Room>(`shopping-sessions/${roomId}`); setRoom(r); } }, [roomId]);
  const refreshCheckout = useCallback(() => { if (checkoutId) api<Checkout>(`checkouts/${checkoutId}`).then(c => { setCheckout(c); setRoomId(c.roomId); }).catch(e => setError(e.message)); }, [checkoutId]);
  useEffect(() => {
    if (!roomId || !boot) return;
    refreshRoom().catch(e => setError(e.message));
    const source = new EventSource(`/api/shopping-sessions/${roomId}/events`);
    source.onopen = () => setConnected(true);
    source.onmessage = () => { refreshRoom().catch(() => {}); };
    source.onerror = () => setConnected(false);
    const timer = setInterval(() => refreshRoom().catch(() => {}), 4000);
    return () => { source.close(); clearInterval(timer); };
  }, [roomId, boot, refreshRoom]);
  useEffect(() => { if (!checkoutId || !boot) return; refreshCheckout(); const timer = setInterval(refreshCheckout, 4000); return () => clearInterval(timer); }, [checkoutId, boot, refreshCheckout]);

  const navigate = (path: string) => history.pushState(null, '', path);
  async function run(task: () => Promise<void>) { setBusy(true); setError(''); try { await task(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }
  const start = () => run(async () => {
    const r = await api<Room>('shopping-sessions', { brief, commandKey: requestKey.current });
    setRoomId(r.id); setRoom(null); navigate(`/rooms/${r.id}`); setEditing(false);
  });
  const revise = () => run(async () => {
    const r = await api<Room>(`shopping-sessions/${roomId}/revisions`, { brief, expectedVersion: room!.version });
    setEditing(false); await refreshRoom();
  });
  const select = (offer: Offer) => run(async () => {
    checkoutKeys.current[offer.id] ||= crypto.randomUUID();
    const c = await api<Checkout>('checkouts', { offerId: offer.id, commandKey: checkoutKeys.current[offer.id] });
    setCheckoutId(c.id); navigate(`/checkout/${c.id}`); refreshCheckout();
  });
  const home = () => { window.location.assign('/'); };
  const offerBySeller = (id: string) => room?.offers?.find(x => x.sellerId === id);
  const recommended = room?.offers?.find(x => !x.reasons.length && x.status === 'active');
  const active = room && ['queued', 'running'].includes(room.state);
  const paymentState = checkout ? paymentStates[checkout.state] : undefined;

  const products = [...new Map((boot?.sellers || []).flatMap(s => s.listings).map(l => [l.product.id, l.product])).values()];
  const commonSellers = brief.items?.length ? boot?.sellers.filter(s => brief.items!.every(i => s.listings.some(l => l.product.id === i.productId && l.available >= i.quantity))).length || 0 : 0;
  const selectedNames = (room?.brief.items || brief.items || []).map(i => `${products.find(p => p.id === i.productId)?.name || 'Selected product'} × ${i.quantity}`).join(', ');
  const briefForm = <div className="brief-form">
    <label htmlFor="add-product">What would you like to negotiate?</label>
    <select id="add-product" value="" disabled={(brief.items?.length || 0) >= 8 || busy} onChange={e => { if (e.target.value) setBrief({ ...brief, items: [...(brief.items || []), { productId: e.target.value, quantity: 1 }] }); }}><option value="">Add a product from the marketplace</option>{products.filter(p => !brief.items?.some(i => i.productId === p.id)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
    <div className="request-products">{brief.items?.map(i => { const p = products.find(p => p.id === i.productId); return <div key={i.productId}><ConceptPhoto role={p?.role || 'other'}/><span>{p?.name || 'Selected product'}</span><input aria-label={`Quantity for ${p?.name || 'selected product'}`} type="number" min={1} max={5} value={i.quantity} onChange={e => setBrief({ ...brief, items: brief.items!.map(x => x.productId === i.productId ? { ...x, quantity: Math.max(1,Math.min(5,Number(e.target.value))) } : x) })}/><button aria-label={`Remove ${p?.name || 'selected product'}`} onClick={() => setBrief({ ...brief, items: brief.items!.filter(x => x.productId !== i.productId) })}>Remove</button></div>; })}</div>
    {!brief.items && <p className="required">This saved request uses the earlier camera-kit format. Add your products above to make a new product selection.</p>}
    <p className="product-availability">{commonSellers ? `${commonSellers} seller${commonSellers === 1 ? '' : 's'} can supply your selection.` : 'Choose products that at least one seller has in stock.'} Up to 8 products, 5 of each.</p>
    <label htmlFor="goal">What does a good deal look like?</label>
    <textarea id="goal" value={brief.goal} onChange={e => setBrief({ ...brief, goal: e.target.value })} rows={3}/>
    <button className="text-button" disabled={busy || !boot?.capabilities.groq} onClick={() => run(async () => { const d = await api<{ draft: Brief }>('briefs/interpret', { text: brief.goal }); if (d.draft.capCents < 100) throw new Error('Add a budget before confirming this brief.'); setBrief({ ...d.draft, items: brief.items }); })}> Help me set my budget and delivery</button>
    <div className="brief-fields"><label>Total budget <span className="money-input"><span>$</span><input type="number" min="1" max="10000" value={brief.capCents / 100} onChange={e => setBrief({ ...brief, capCents: Math.round(Number(e.target.value) * 100) })}/><small>USD</small></span></label><label>Arrives within <span className="money-input"><input type="number" min="1" max="30" value={brief.maxDays} onChange={e => setBrief({ ...brief, maxDays: Number(e.target.value) })}/><small>days</small></span></label></div>
    <label>What matters most?</label><div className="preference"><button className={brief.preference === 'quality' ? 'chosen' : ''} onClick={() => setBrief({ ...brief, preference: 'quality' })}> Price & delivery</button><button className={brief.preference === 'price' ? 'chosen' : ''} onClick={() => setBrief({ ...brief, preference: 'price' })}><Layers3 size={15}/> Lowest total</button></div>
    <p className="required">Your selected products, quantities, total budget and delivery deadline are checked for every deal. Notes guide your buyer agent; they do not add unlisted product features.</p>
    <label className="checkbox"><input type="checkbox" checked={brief.discloseBudget} onChange={e => setBrief({ ...brief, discloseBudget: e.target.checked })}/> Share my maximum budget with sellers</label>
    <button className="primary full" disabled={busy || !boot?.capabilities.groq || (!roomId && boot?.negotiationAllowance.remaining === 0) || (!!brief.items && !commonSellers)} onClick={roomId ? revise : start}>{busy ? <LoaderCircle className="spin" size={17}/> : <Handshake size={17}/>} {roomId ? 'Save request & negotiate again' : 'Start my negotiation'}<ArrowRight size={16}/></button>
    {!roomId && boot && <p className="allowance-note">{boot.negotiationAllowance.remaining} of {boot.negotiationAllowance.limit} new negotiations available. This limit covers the last 24 hours.{boot.negotiationAllowance.nextAvailableAt && ` Next slot: ${new Date(boot.negotiationAllowance.nextAvailableAt).toLocaleString()}.`} You can always return to your recent conversations.</p>}
    <p className="micro">You choose the offer. Your agent cannot spend money.</p>
  </div>;

  return <><SiteHeader active="agent" action={<span className="sandbox"><ShieldCheck size={13}/> Demo marketplace · test payments</span>}/>
    <main className="main">
      {error && <div role="alert" className="alert">{error}<button onClick={() => setError('')} aria-label="Dismiss error">×</button></div>}
      {boot && (!boot.capabilities.groq || !boot.capabilities.paypal) && <div className="setup-note"><ShieldCheck size={17}/><span>{!boot.capabilities.groq ? 'Negotiation is being set up. You can browse products in the meantime.' : 'Your agents are ready. Payments are still being set up.'}</span></div>}
      {!roomId && !checkoutId && !!boot?.negotiationAllowance.recentRooms.length && <section className="recent-negotiations" aria-label="Recent negotiations"><div><h2>Pick up where you left off.</h2><p>Return to a recent conversation and compare the offers.</p></div><div className="recent-rooms">{boot.negotiationAllowance.recentRooms.map(r => <a key={r.id} href={`/rooms/${r.id}`}><span><b>{money(r.capCents)} budget</b><small>{new Date(r.createdAt).toLocaleString()} · {r.state.replaceAll('_', ' ')}</small></span>Continue <ArrowRight size={14}/></a>)}</div></section>}
      {checkoutId ? !checkout ? <div className="loading"><LoaderCircle className="spin"/> Loading your agreement…</div> : <section className="checkout-layout"><div><button className="back text-button" onClick={() => { setCheckoutId(null); setCheckout(null); navigate(`/rooms/${checkout.roomId}`); }}><ChevronLeft size={16}/> Back to negotiation</button><p className="eyebrow">YOUR TERMS, IN ONE PLACE</p><h1>{checkout.state === 'paid' ? 'That’s a pact.' : paymentState?.title || 'A good deal.\nYour final say.'}</h1><p className="lead">{checkout.state === 'paid' ? 'PayPal confirmed this test payment. Your accepted terms are preserved below.' : paymentState?.lead || `Review your exact agreement with ${checkout.snapshot.seller.name}. Payment requires your approval.`}</p><div className="receipt-items">{checkout.snapshot.terms.items.map(item => <div key={item.listingId}><div className="receipt-product"><ConceptPhoto role={item.product.role}/><span>{item.product.name}<small>{item.product.role} · quantity {item.quantity}</small></span></div><b>{money(item.unitPriceCents * item.quantity)}</b></div>)}<div><span>{checkout.snapshot.terms.shipping} shipping<small>Demo delivery: {checkout.snapshot.terms.arrivalDays} days</small></span><b>{money(checkout.snapshot.terms.shippingCents)}</b></div><div className="receipt-total"><span>Exact agreed total <small>USD · no tax in this demo</small></span><strong>{money(checkout.totalCents)}</strong></div></div></div><aside className="payment-card"><span className="icon-box"><LockKeyhole size={24}/></span><h2>{checkout.state === 'paid' ? 'Payment confirmed' : paymentState?.label || 'Approve with PayPal'}</h2><p className="state-label">Status: {checkout.state.replaceAll('_', ' ')}</p>{checkout.state === 'paid' ? <><CheckCircle2 className="paid-icon" size={54}/><p>Test payment reference</p><code>{checkout.captureId}</code><button className="primary full" onClick={home}>Start a fresh negotiation <ArrowRight size={16}/></button></> : paymentState ? <><p>{paymentState.message}</p>{checkout.captureId && <><p className="micro">Original payment reference</p><code>{checkout.captureId}</code></>}</> : ['reserved', 'awaiting_approval'].includes(checkout.state) ? <><p className="muted">Stock is reserved for a limited approval window. The amount below matches your accepted offer.</p><Payment checkout={checkout} refresh={refreshCheckout} report={setError}/><button className="text-button" disabled={busy} onClick={() => run(async () => { await api(`checkouts/${checkout.id}/cancel`, {}); refreshCheckout(); })}>Cancel unpaid reservation</button></> : <p className="muted">{['cancelled', 'expired', 'failed'].includes(checkout.state) ? 'This checkout is closed. Return to your room and select a fresh current offer.' : 'Checking the provider result. Please keep this agreement open; do not start a replacement payment.'}</p>}<div className="trust-note"><ShieldCheck size={16}/><span>One accepted agreement. One payment. No automatic charges.</span></div><p className="micro">Demo purchase only. No physical goods are sent. Receipt access remains in this browser for 24 hours.</p></aside></section>
      : roomId ? <section><div className="room-heading"><div><p className="eyebrow">YOUR NEGOTIATION · REQUEST {room?.version || 1}</p><h1 className="room-title">Good things are taking shape.</h1><p className="muted">Independent agents. Different strategies. Your final decision.</p></div><span className={`live-pill ${active ? '' : 'settled'}`}><Radio size={14}/>{active ? connected ? 'Market is moving' : 'Updating offers' : room?.state?.replaceAll('_', ' ') || 'Loading room'}</span></div>{room && <><div className="brief-bar"><span><b>{money(room.brief.capCents)}</b> maximum</span><span><Clock3 size={15}/>{room.brief.maxDays}-day arrival</span><span>{room.brief.preference === 'quality' ? 'Price & delivery' : 'Lowest total'}</span><span className="brief-version">{room.brief.items ? selectedNames : 'Earlier camera-kit request'}</span><button className="text-button" disabled={room.version >= 2} onClick={() => { setBrief(room.brief); setEditing(!editing); }}><SlidersHorizontal size={15}/> Edit request</button></div>{room.briefHistory?.length > 1 && <details className="brief-history"><summary>Your earlier requests · {room.briefHistory.length} versions</summary>{room.briefHistory.map(v => <div key={v.version}><b>Version {v.version} · {money(v.brief.capCents)} maximum · {v.brief.maxDays}-day arrival</b><p>{v.brief.goal}</p><small>{v.brief.preference === "quality" ? "Quality first" : "Price first"} · {v.brief.discloseBudget ? "Budget shared with sellers" : "Budget kept private"}</small></div>)}</details>}{editing && <div className="revision-panel"><h2>Change your terms.</h2><p className="muted">Changing your request starts a new conversation. Your earlier offers remain in the history.</p>{briefForm}</div>}<div className="seller-grid">{boot?.sellers.map((seller, i) => { const offer = offerBySeller(seller.id); return <article key={seller.id} className={`seller-card ${recommended?.id === offer?.id && offer ? 'recommended' : ''}`}><div className="seller-top"><span className="seller-avatar" style={{ background: colors[i] }}>{seller.name.split(' ').map(s => s[0]).join('')}</span><div><h3>{seller.name}</h3><p>{({price_first:'Value focused',bundle_first:'Bundle minded',speed_first:'Speed first'} as Record<string,string>)[seller.strategy] || 'Seller'} agent</p></div>{recommended?.id === offer?.id && offer && <span className="best-badge">Best fit</span>}</div><div className="product-stage"><ConceptPhoto role={offer?.terms.items[0]?.product.role || products.find(p => p.id === room.brief.items?.[0]?.productId)?.role || 'other'}/><span className="stage-chip">{offer?.terms.items[0]?.product.name || 'Waiting for an offer'}</span></div>{offer ? <><div className="offer-price"><strong>{money(offer.terms.totalCents)}</strong><span>all-in · round {offer.round}</span></div><div className="kit-items">{offer.terms.items.map(x => <span key={x.listingId}><Check size={12}/>{x.product.name}</span>)}</div><div className="offer-facts"><span><Clock3 size={14}/>{offer.terms.arrivalDays} days</span><span><ShieldCheck size={14}/>{offer.terms.warrantyMonths}-month demo warranty</span></div><p className="seller-message">Includes delivery in the {money(offer.terms.totalCents)} total. Arrives within {offer.terms.arrivalDays} days.</p>{offer.reasons.length ? <p className="ineligible">{offer.reasons.join(' · ')}</p> : <p className="eligible"><CheckCircle2 size={14}/> Matches your request</p>}<button className={recommended?.id === offer.id ? 'primary full' : 'secondary full'} disabled={busy || !!offer.reasons.length || offer.status === 'locked'} onClick={() => select(offer)}>Review this agreement <ArrowRight size={15}/></button></> : <div className="seller-wait"><h3>{active ? 'Working on your terms' : 'No current offer'}</h3><p>{active ? 'Your agent is discussing the price and delivery with each seller. Offers appear as they are ready.' : 'This seller has no available deal for your request.'}</p></div>}</article>; })}</div>{room.checkouts.some(c => !['cancelled', 'expired', 'failed'].includes(c.state)) && <button className="secondary" onClick={() => { const c = room.checkouts.find(x => !['cancelled', 'expired', 'failed'].includes(x.state))!; setCheckoutId(c.id); navigate(`/checkout/${c.id}`); }}>Open your reserved agreement <ArrowRight size={16}/></button>}<section className="activity"><div className="section-heading"><h2><Radio size={18}/> Behind your next good deal</h2><span>Conversation updates</span></div>{room.events?.length ? <ol>{room.events.slice(-10).reverse().map(e => <li key={e.id}><div><span className="event-type">{({ 'brief.confirmed':'Request saved', 'brief.revised':'Request changed', 'buyer.countered':'Your agent replied', 'offer.published':'New offer', 'seller.decline':'Seller declined', 'seller.hold':'Seller kept their offer', 'run.completed':'Offers ready', 'run.no_deal':'No matching deal', 'run.limit_reached':'Conversation paused', 'seller.unavailable':'Seller update', 'checkout.reserved':'Deal selected', 'payment.completed':'Payment confirmed' } as Record<string,string>)[e.type] || 'Conversation update'}</span><p>{e.type === 'offer.published' && e.data.totalCents ? `A new offer at ${money(e.data.totalCents)}, including delivery, is ready to compare.` : e.data.message || 'Your conversation has been updated.'}</p></div><time>{new Date(e.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time></li>)}</ol> : <p className="muted">Your conversation updates will appear here.</p>}</section></>}</section>
      : <><section className="hero agent-hero"><div className="agent-intro"><p className="eyebrow">YOUR BUYER AGENT</p><h1>Your next deal.<br/><em>On your terms.</em></h1><p className="lead">Choose your products. Set your limits. Your agent negotiates with seller agents on your behalf.</p><p className="hero-detail">Compare complete offers, including delivery. Choose the deal you want and approve your payment with PayPal.</p><DealStory/><a className="seller-entry" href="/seller-console">Selling instead? Set up your seller agent <ArrowRight size={16}/></a></div><div className="brief-card"><div className="card-heading"><span className="icon-box"><SlidersHorizontal size={19}/></span><div><h2>Tell your agent what matters.</h2><p>You set the limits. Your agent does the talking.</p></div></div>{briefForm}</div></section><section className="market-preview"><div className="section-heading"><div><p className="eyebrow">MEET THE OTHER SIDE</p><h2>Three sellers. Three ways to make a deal.</h2></div><span className="market-label"> Fictional market · USD</span></div><div className="preview-grid">{(boot?.sellers || [{ id: 'pixel_port', name: 'Pixel Port', strategy: 'price_first', standardDays: 5, warrantyMonths: 12 }, { id: 'studio_stack', name: 'Studio Stack', strategy: 'bundle_first', standardDays: 4, warrantyMonths: 24 }, { id: 'swift_gear', name: 'Swift Gear', strategy: 'speed_first', standardDays: 2, warrantyMonths: 12 }]).map((s, i) => <article className="preview-card" key={s.id}><div className="preview-illustration" style={{ background: ['#f0edfa', '#eaf4f1', '#faf2e5'][i] }}><ConceptPhoto role={['bags','home','electronics'][i]}/><span>{['VALUE', 'BETTER TOGETHER', 'ON YOUR SCHEDULE'][i]}</span></div><div className="preview-content"><span className="mini-label">SELLER AGENT 0{i + 1}</span><h3>{s.name}<ArrowUpRight size={17}/></h3><p>{['Flexible on price. Firm on the essentials.', 'Builds a stronger bundle around your priorities.', 'Trades on speed, when timing matters most.'][i]}</p><div><span><ShieldCheck size={13}/> Your rules, respected</span><span><Zap size={13}/> Negotiates for you</span></div></div></article>)}</div></section><section className="how-strip"><div><span>01</span><h3>Set your terms</h3><p>Choose products and confirm your budget and delivery deadline.</p></div><ArrowRight/><div><span>02</span><h3>Watch the market respond</h3><p>Agents counter, adjust, and explain their offers.</p></div><ArrowRight/><div><span>03</span><h3>Make a pact</h3><p>Review the exact terms and approve with PayPal.</p></div></section></>}
    </main><SiteFooter/></>;
}
