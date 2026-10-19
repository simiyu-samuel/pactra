'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, Check, CheckCircle2, ChevronLeft, Clock3, Handshake, Layers3, LoaderCircle, LockKeyhole, Radio, ShieldCheck, SlidersHorizontal, Sparkles, Zap } from 'lucide-react';
import { money, type Brief, type OfferTerms } from '@pactra/domain';

type Offer = { id: string; sellerId: string; sellerName: string; terms: OfferTerms; round: number; score: number; reasons: string[]; status: string };
type Seller = { id: string; name: string; strategy: string; standardDays: number; warrantyMonths: number; listings: Array<{ id: string; product: { name: string; role: string }; listCents: number }> };
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
function Camera({ color = '#7561d5', small = false }: { color?: string; small?: boolean }) {
  return <svg viewBox="0 0 320 210" className={small ? 'camera small' : 'camera'} aria-hidden="true"><defs><linearGradient id={`g${color.slice(1)}`} x2="1" y2="1"><stop stopColor="#3b3e4c"/><stop offset="1" stopColor="#171923"/></linearGradient></defs><ellipse cx="167" cy="180" rx="110" ry="12" fill="#22223b" opacity=".1"/><path d="M58 67h42l14-23h68l17 23h45a18 18 0 0 1 18 18v70a18 18 0 0 1-18 18H58a18 18 0 0 1-18-18V85a18 18 0 0 1 18-18" fill={`url(#g${color.slice(1)})`}/><rect x="46" y="80" width="48" height="82" rx="10" fill="#30313d"/><rect x="217" y="80" width="28" height="14" rx="4" fill={color}/><circle cx="161" cy="121" r="59" fill="#0e1019"/><circle cx="161" cy="121" r="48" fill="#424756"/><circle cx="161" cy="121" r="39" fill="#151e34"/><circle cx="161" cy="121" r="28" fill={color} opacity=".45"/><circle cx="153" cy="112" r="16" fill="#5b87ad" opacity=".35"/><circle cx="147" cy="105" r="6" fill="#fff" opacity=".4"/><rect x="211" y="52" width="30" height="12" rx="4" fill="#353846"/><path d="M122 53h47" stroke="#8d92a1" strokeWidth="3" strokeLinecap="round"/><text x="56" y="104" fill="#b9bdc9" fontSize="9" fontFamily="sans-serif" letterSpacing="2">PACTRA</text></svg>;
}
const defaultBrief: Brief = { goal: 'A starter creator kit with a 4K camera, a microphone and a mini tripod. Video quality matters more than extras.', capCents: 50000, maxDays: 4, preference: 'quality', discloseBudget: false };
const colors = ['#7961d7', '#188b7d', '#c58a38'];

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
    api<Boot>('bootstrap').then(setBoot).catch(e => setError(e.message));
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

  const briefForm = <div className="brief-form">
    <label htmlFor="goal">What does a good deal look like?</label>
    <textarea id="goal" value={brief.goal} onChange={e => setBrief({ ...brief, goal: e.target.value })} rows={3}/>
    <button className="text-button" disabled={busy || !boot?.capabilities.groq} onClick={() => run(async () => { const d = await api<{ draft: Brief }>('briefs/interpret', { text: brief.goal }); if (d.draft.capCents < 100) throw new Error('Add a budget before confirming this brief.'); setBrief(d.draft); })}><Sparkles size={14}/> Read my brief with Groq</button>
    <div className="brief-fields"><label>Total budget <span className="money-input"><span>$</span><input type="number" min="1" max="10000" value={brief.capCents / 100} onChange={e => setBrief({ ...brief, capCents: Math.round(Number(e.target.value) * 100) })}/><small>USD</small></span></label><label>Arrives within <span className="money-input"><input type="number" min="1" max="30" value={brief.maxDays} onChange={e => setBrief({ ...brief, maxDays: Number(e.target.value) })}/><small>days</small></span></label></div>
    <label>What matters most?</label><div className="preference"><button className={brief.preference === 'quality' ? 'chosen' : ''} onClick={() => setBrief({ ...brief, preference: 'quality' })}><Sparkles size={15}/> Camera quality</button><button className={brief.preference === 'price' ? 'chosen' : ''} onClick={() => setBrief({ ...brief, preference: 'price' })}><Layers3 size={15}/> Lowest total</button></div>
    <p className="required"><Check size={14}/> Required: one 4K camera, compatible microphone, and tripod.</p>
    <label className="checkbox"><input type="checkbox" checked={brief.discloseBudget} onChange={e => setBrief({ ...brief, discloseBudget: e.target.checked })}/> Share my maximum budget with sellers</label>
    <button className="primary full" disabled={busy || !boot?.capabilities.groq || (!roomId && boot?.negotiationAllowance.remaining === 0)} onClick={roomId ? revise : start}>{busy ? <LoaderCircle className="spin" size={17}/> : <Handshake size={17}/>} {roomId ? 'Confirm revised brief' : 'Confirm brief & open the market'}<ArrowRight size={16}/></button>
    {!roomId && boot && <p className="allowance-note">{boot.negotiationAllowance.remaining} of {boot.negotiationAllowance.limit} new negotiations available in this browser’s rolling 24-hour window.{boot.negotiationAllowance.nextAvailableAt && ` Next slot: ${new Date(boot.negotiationAllowance.nextAvailableAt).toLocaleString()}.`} Reopening a room uses no new slot.</p>}
    <p className="micro">You choose the offer. Your agent cannot spend money.</p>
  </div>;

  return <><header className="header"><div className="header-inner"><button className="brand" onClick={home}><span className="brand-mark"><Handshake size={23}/></span>pactra<span className="brand-dot">.</span></button><nav aria-label="Main"><button className={!roomId && !checkoutId ? 'nav-active' : ''} onClick={home}>Explore marketplace</button>{roomId && <button onClick={() => { setCheckoutId(null); setCheckout(null); navigate(`/rooms/${roomId}`); }}>Your negotiation</button>}<a href="https://github.com/simiyu-samuel/pactra" target="_blank" rel="noreferrer">The project <ArrowUpRight size={13}/></a></nav><span className="sandbox"><span/> Sandbox experience</span></div></header>
    <main className="main">
      {error && <div role="alert" className="alert">{error}<button onClick={() => setError('')} aria-label="Dismiss error">×</button></div>}
      {boot && (!boot.capabilities.groq || !boot.capabilities.paypal) && <div className="setup-note"><ShieldCheck size={17}/><span>{!boot.capabilities.groq ? 'Live agents need the server’s Groq key. You can explore the market while setup is completed.' : 'Groq is configured. PayPal sandbox credentials are needed to complete a purchase.'}</span></div>}
      {!roomId && !checkoutId && !!boot?.negotiationAllowance.recentRooms.length && <section className="recent-negotiations" aria-label="Recent negotiations"><div><h2>Pick up where you left off.</h2><p>Continue a room from this browser without using another new-negotiation slot.</p></div><div className="recent-rooms">{boot.negotiationAllowance.recentRooms.map(r => <a key={r.id} href={`/rooms/${r.id}`}><span><b>{money(r.capCents)} creator kit</b><small>{new Date(r.createdAt).toLocaleString()} · {r.state.replaceAll('_', ' ')}</small></span>Continue <ArrowRight size={14}/></a>)}</div></section>}
      {checkoutId ? !checkout ? <div className="loading"><LoaderCircle className="spin"/> Loading your agreement…</div> : <section className="checkout-layout"><div><button className="back text-button" onClick={() => { setCheckoutId(null); setCheckout(null); navigate(`/rooms/${checkout.roomId}`); }}><ChevronLeft size={16}/> Back to negotiation</button><p className="eyebrow">YOUR TERMS, IN ONE PLACE</p><h1>{checkout.state === 'paid' ? 'That’s a pact.' : 'A good deal.\nYour final say.'}</h1><p className="lead">{checkout.state === 'paid' ? 'PayPal confirmed this sandbox payment. Your accepted terms are preserved below.' : `Review your exact agreement with ${checkout.snapshot.seller.name}. Payment requires your approval.`}</p><div className="receipt-items">{checkout.snapshot.terms.items.map(item => <div key={item.listingId}><span>{item.product.name}<small>{item.product.role} · quantity {item.quantity}</small></span><b>{money(item.unitPriceCents * item.quantity)}</b></div>)}<div><span>{checkout.snapshot.terms.shipping} shipping<small>Fictional delivery: {checkout.snapshot.terms.arrivalDays} days</small></span><b>{money(checkout.snapshot.terms.shippingCents)}</b></div><div className="receipt-total"><span>Exact agreed total <small>USD · zero-tax demo fixture</small></span><strong>{money(checkout.totalCents)}</strong></div></div></div><aside className="payment-card"><span className="icon-box"><LockKeyhole size={24}/></span><h2>{checkout.state === 'paid' ? 'Payment confirmed' : 'Approve with PayPal'}</h2><p className="state-label">Status: {checkout.state.replaceAll('_', ' ')}</p>{checkout.state === 'paid' ? <><CheckCircle2 className="paid-icon" size={54}/><p>Sandbox capture</p><code>{checkout.captureId}</code><button className="primary full" onClick={home}>Start a fresh negotiation <ArrowRight size={16}/></button></> : ['reserved', 'awaiting_approval'].includes(checkout.state) ? <><p className="muted">Stock is reserved for a limited approval window. The amount below matches your accepted offer.</p><Payment checkout={checkout} refresh={refreshCheckout} report={setError}/><button className="text-button" disabled={busy} onClick={() => run(async () => { await api(`checkouts/${checkout.id}/cancel`, {}); refreshCheckout(); })}>Cancel unpaid reservation</button></> : <p className="muted">{['cancelled', 'expired', 'failed'].includes(checkout.state) ? 'This checkout is closed. Return to your room and select a fresh current offer.' : 'Checking the provider result. Please keep this agreement open; do not start a replacement payment.'}</p>}<div className="trust-note"><ShieldCheck size={16}/><span>One accepted agreement. One payment. No automatic charges.</span></div><p className="micro">Fictional products and fulfillment. No physical goods ship. Receipt access remains in this browser for 24 hours.</p></aside></section>
      : roomId ? <section><div className="room-heading"><div><p className="eyebrow">YOUR NEGOTIATION ROOM · BRIEF V{room?.version || 1}</p><h1 className="room-title">Let the offers come to you.</h1><p className="muted">Independent agents. Different strategies. Your final decision.</p></div><span className={`live-pill ${active ? '' : 'settled'}`}><Radio size={14}/>{active ? connected ? 'Market is moving' : 'Updating offers' : room?.state?.replaceAll('_', ' ') || 'Loading room'}</span></div>{room && <><div className="brief-bar"><span><b>{money(room.brief.capCents)}</b> maximum</span><span><Clock3 size={15}/>{room.brief.maxDays}-day arrival</span><span><Sparkles size={15}/>{room.brief.preference === 'quality' ? 'Quality first' : 'Price first'}</span><span className="brief-version">4K camera + microphone + tripod</span><button className="text-button" disabled={room.version >= 2} onClick={() => { setBrief(room.brief); setEditing(!editing); }}><SlidersHorizontal size={15}/> Revise brief</button></div>{room.briefHistory?.length > 1 && <details className="brief-history"><summary>Confirmed brief history · {room.briefHistory.length} versions</summary>{room.briefHistory.map(v => <div key={v.version}><b>Version {v.version} · {money(v.brief.capCents)} maximum · {v.brief.maxDays}-day arrival</b><p>{v.brief.goal}</p><small>{v.brief.preference === "quality" ? "Quality first" : "Price first"} · {v.brief.discloseBudget ? "Budget shared with sellers" : "Budget kept private"}</small></div>)}</details>}{editing && <div className="revision-panel"><h2>Change your terms.</h2><p className="muted">New requirements start a fresh round. Previous offers won’t be available for the revised brief.</p>{briefForm}</div>}<div className="seller-grid">{boot?.sellers.map((seller, i) => { const offer = offerBySeller(seller.id); return <article key={seller.id} className={`seller-card ${recommended?.id === offer?.id && offer ? 'recommended' : ''}`}><div className="seller-top"><span className="seller-avatar" style={{ background: colors[i] }}>{seller.name.split(' ').map(s => s[0]).join('')}</span><div><h3>{seller.name}</h3><p>{seller.strategy.replaceAll('_', ' ')} agent</p></div>{recommended?.id === offer?.id && offer && <span className="best-badge">Best fit</span>}</div><div className="product-stage"><Camera color={colors[i]}/><span className="stage-chip">{offer ? offer.terms.items.find(x => x.product.role === 'camera')?.product.name : 'Creator equipment'}</span></div>{offer ? <><div className="offer-price"><strong>{money(offer.terms.totalCents)}</strong><span>all-in · round {offer.round}</span></div><div className="kit-items">{offer.terms.items.map(x => <span key={x.listingId}><Check size={12}/>{x.product.name}</span>)}</div><div className="offer-facts"><span><Clock3 size={14}/>{offer.terms.arrivalDays} days</span><span><ShieldCheck size={14}/>{offer.terms.warrantyMonths}mo demo warranty</span></div><p className="seller-message">“{offer.terms.message}”</p>{offer.reasons.length ? <p className="ineligible">{offer.reasons.join(' · ')}</p> : <p className="eligible"><CheckCircle2 size={14}/> Meets your confirmed requirements</p>}<button className={recommended?.id === offer.id ? 'primary full' : 'secondary full'} disabled={busy || !!offer.reasons.length || offer.status === 'locked'} onClick={() => select(offer)}>Review this agreement <ArrowRight size={15}/></button></> : <div className="seller-wait"><span className="waiting-dots">•••</span><h3>{active ? 'Working on your terms' : 'No current offer'}</h3><p>{active ? 'Groq calls are paced to the shared free-tier quota. Each seller has its own context and pricing policy.' : 'This seller has not produced a current valid proposal.'}</p></div>}</article>; })}</div>{room.checkouts.some(c => !['cancelled', 'expired', 'failed'].includes(c.state)) && <button className="secondary" onClick={() => { const c = room.checkouts.find(x => !['cancelled', 'expired', 'failed'].includes(x.state))!; setCheckoutId(c.id); navigate(`/checkout/${c.id}`); }}>Open your reserved agreement <ArrowRight size={16}/></button>}<section className="activity"><div className="section-heading"><h2><Radio size={18}/> The conversation, in motion</h2><span>Validated actions only</span></div>{room.events?.length ? <ol>{room.events.slice(-10).reverse().map(e => <li key={e.id}><span className="event-dot"/><div><span className="event-type">{e.type.replaceAll('.', ' · ').replaceAll('_', ' ')}</span><p>{e.data.message || (e.data.totalCents ? `A new offer at ${money(e.data.totalCents)} is ready to compare.` : 'Your room has been updated.')}</p></div><time>{new Date(e.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time></li>)}</ol> : <p className="muted">Your agents’ validated actions will appear here.</p>}</section></>}</section>
      : <><section className="hero"><div className="hero-copy"><span className="eyebrow"><span className="tiny-dot"/> YOUR PACTRA SHOPPING AGENT</span><h1>Your terms.<br/><span>Negotiated.</span></h1><p className="lead">One buyer agent. Three seller agents.<br/>A better deal is a conversation away.</p><p className="hero-detail">Tell us what matters. Watch independent seller agents compete on price, bundles, and delivery. Choose the agreement that works for you.</p><div className="hero-points"><span><CheckCircle2 size={16}/> Your budget stays in your control</span><span><CheckCircle2 size={16}/> You approve every purchase</span></div><div className="powered"><span className="groq-word">groq</span><span>powers the agents</span><i/><strong className="paypal-word">PayPal</strong><span>completes the pact</span></div></div><div className="brief-card"><div className="card-heading"><span className="icon-box"><SlidersHorizontal size={19}/></span><div><h2>Build your creator kit.</h2><p>Start with a creator camera kit.</p></div><span className="step-count">01 / 03</span></div>{briefForm}</div></section><section className="market-preview"><div className="section-heading"><div><p className="eyebrow">MEET THE OTHER SIDE</p><h2>Three sellers. Three ways to make a deal.</h2></div><span className="market-label"><span/> Fictional market · USD</span></div><div className="preview-grid">{(boot?.sellers || [{ id: 'pixel_port', name: 'Pixel Port', strategy: 'price_first', standardDays: 5, warrantyMonths: 12 }, { id: 'studio_stack', name: 'Studio Stack', strategy: 'bundle_first', standardDays: 4, warrantyMonths: 24 }, { id: 'swift_gear', name: 'Swift Gear', strategy: 'speed_first', standardDays: 2, warrantyMonths: 12 }]).map((s, i) => <article className="preview-card" key={s.id}><div className="preview-illustration" style={{ background: ['#f0edfa', '#eaf4f1', '#faf2e5'][i] }}><Camera small color={colors[i]}/><span>{['VALUE', 'THE COMPLETE KIT', 'ON YOUR SCHEDULE'][i]}</span></div><div className="preview-content"><span className="mini-label">SELLER AGENT 0{i + 1}</span><h3>{s.name}<ArrowUpRight size={17}/></h3><p>{['Flexible on price. Firm on the essentials.', 'Builds a stronger bundle around your priorities.', 'Trades on speed, when timing matters most.'][i]}</p><div><span><ShieldCheck size={13}/> Policy-controlled</span><span><Zap size={13}/> Groq-powered</span></div></div></article>)}</div></section><section className="how-strip"><div><span>01</span><h3>Set your terms</h3><p>Confirm your budget, required kit, and priorities.</p></div><ArrowRight/><div><span>02</span><h3>Watch the market respond</h3><p>Agents counter, adjust, and explain their offers.</p></div><ArrowRight/><div><span>03</span><h3>Make a pact</h3><p>Review the exact terms and approve with PayPal.</p></div></section></>}
    </main><footer><span className="footer-brand">pactra.</span><p>Simulated sellers. Fictional products and fulfillment. PayPal sandbox payments only.</p><a href="/seller-console">Seller workspace</a></footer></>;
}
