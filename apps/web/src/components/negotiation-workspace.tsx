'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowDownRight, ArrowRight, ArrowUpRight, Check, ChevronDown, Clock3, Handshake, Maximize2, MessageSquare, Minimize2, Minus, ShieldCheck } from 'lucide-react';
import { conversationThread, money, type ConversationEvent, type NegotiationProgress, type OfferTerms } from '@pactra/domain';
import s from './negotiation-workspace.module.css';

type Seller = { id: string; name: string };
type Offer = { id: string; sellerId: string; terms: OfferTerms; round: number; reasons: string[]; status: string };
export type ConversationRoom = { id: string; version: number; state: string; events: ConversationEvent[]; offers: Offer[]; progress?: NegotiationProgress };
const labels: Record<string, string> = {
  'brief.confirmed': 'Request confirmed', 'brief.revised': 'Request updated', 'buyer.countered': 'Counteroffer',
  'offer.published': 'Seller proposal', 'seller.hold': 'Holding the offer', 'seller.decline': 'No proposal',
  'seller.unavailable': 'Update delayed', 'run.completed': 'Ready to compare', 'run.no_deal': 'No matching deal',
  'run.limit_reached': 'Conversation paused', 'checkout.reserved': 'Deal selected', 'checkout.cancelled': 'Reservation cancelled',
  'payment.completed': 'Test payment confirmed', 'payment.refunded': 'Test payment refunded',
};
const initials = (name: string) => name.split(' ').map(part => part[0]).join('').slice(0, 2);

export default function NegotiationWorkspace({ room, sellers, connected, children }: {
  room: ConversationRoom | null; sellers: Seller[]; connected: boolean; children: ReactNode;
}) {
  const [selectedId, setSelectedId] = useState(sellers[0]?.id || '');
  const [minimized, setMinimized] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [seen, setSeen] = useState<Record<string, number>>({});
  const [pending, setPending] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const tabs = useRef<Record<string, HTMLButtonElement | null>>({});
  const nearBottom = useRef(true);
  const previous = useRef({ sellerId: '', count: 0, version: 0 });
  const initialized = useRef<number | null>(null);
  const selected = sellers.find(seller => seller.id === selectedId) || sellers[0];
  const threads = sellers.map(seller => ({ ...seller, events: room ? conversationThread(room.events, room.version, seller.id) : [] }));
  const messages = threads.find(seller => seller.id === selected?.id)?.events || [];
  const lastId = messages.at(-1)?.id;
  const offer = room?.offers.find(offer => offer.sellerId === selected?.id);
  const usable = offer && !offer.reasons.length && ['active', 'locked'].includes(offer.status);
  const active = !!room && ['queued', 'running'].includes(room.state);
  const progress = room?.progress;
  const currentActor = progress?.actor === 'buyer' ? 'Your buyer agent' : sellers.find(seller => seller.id === progress?.sellerId)?.name;
  const progressText = !active ? room?.state === 'completed' ? 'Offers are ready to compare' : room?.state === 'no_deal' ? 'No matching deal this time' : 'This conversation has paused'
    : !connected ? 'Reconnecting to conversation updates'
    : progress?.state === 'paused' ? 'Taking a short pause before the next turn'
    : progress?.state === 'complete' ? 'Checking the final offers'
    : progress?.state === 'working' && currentActor ? `${currentActor}${progress.actor === 'seller' ? '’s agent' : ''} is preparing ${progress.actor === 'buyer' ? 'counteroffers' : 'a response'}`
    : currentActor ? `Next up: ${currentActor}${progress?.actor === 'seller' ? '’s agent' : ''}` : 'Getting the conversation started';
  const firstTotal = messages.find(event => event.type === 'offer.published' && event.data.totalCents !== undefined)?.data.totalCents;
  const improvement = usable && firstTotal !== undefined && firstTotal > offer.terms.totalCents ? firstTotal - offer.terms.totalCents : 0;
  const counts = Object.fromEntries(threads.map(thread => [thread.id, thread.events.filter(event => event.data.sellerId === thread.id).length]));
  const countKey = JSON.stringify(counts);

  useEffect(() => {
    if (!room || initialized.current === room.version) return;
    initialized.current = room.version;
    setSeen(counts);
  }, [room, countKey]); // Existing history is read; only newly arriving updates earn a badge.
  useEffect(() => {
    if (!selected) return;
    const narrow = window.matchMedia('(max-width: 1050px)').matches;
    if (!minimized && (!narrow || expanded)) setSeen(current => ({ ...current, [selected.id]: counts[selected.id] || 0 }));
  }, [selected?.id, countKey, expanded, minimized]);
  useEffect(() => {
    const changedThread = previous.current.sellerId !== selected?.id || previous.current.version !== room?.version;
    if (changedThread || nearBottom.current) {
      if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
      nearBottom.current = true;
      setPending(0);
    } else setPending(current => current + Math.max(0, messages.length - previous.current.count));
    previous.current = { sellerId: selected?.id || '', count: messages.length, version: room?.version || 0 };
  }, [selected?.id, lastId, expanded, minimized, room?.version]);

  function minimize() {
    setMinimized(true); setExpanded(false);
    requestAnimationFrame(() => launcher.current?.focus({ preventScroll: true }));
  }
  function jumpToLatest() {
    if (scroller.current) scroller.current.scrollTo({ top: scroller.current.scrollHeight, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    nearBottom.current = true; setPending(0);
  }
  const unread = threads.reduce((total, thread) => total + Math.max(0, (counts[thread.id] || 0) - (seen[thread.id] || 0)), 0);

  return <div className={`${s.workspace} ${minimized ? s.minimized : ''} ${expanded ? s.expanded : ''} ${room ? '' : s.loading}`}>
    <div className={s.market}>{children}</div>
    {room && <>
      <aside className={s.panel} aria-label="Live agent negotiation" onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); minimize(); } }}>
        <header className={s.heading}>
          <span className={s.mark}><Handshake size={21}/></span>
          <div><span>BEHIND YOUR NEXT GOOD DEAL</span><h2>Let’s make a pact.</h2></div>
          <button className={s.expandButton} onClick={() => setExpanded(!expanded)} aria-label={expanded ? 'Make conversation compact' : 'Expand conversation'} aria-expanded={expanded}>{expanded ? <Minimize2 size={16}/> : <Maximize2 size={16}/>}</button>
          <button onClick={minimize} aria-label="Minimize conversation"><Minus size={18}/></button>
        </header>
        <div className={s.tabs} role="tablist" aria-label="Seller conversations">
          {threads.map((thread, index) => {
            const newCount = Math.max(0, (counts[thread.id] || 0) - (seen[thread.id] || 0));
            return <button key={thread.id} id={`conversation-tab-${thread.id}`} role="tab" aria-selected={selected?.id === thread.id} aria-controls="seller-conversation" tabIndex={selected?.id === thread.id ? 0 : -1} ref={node => { tabs.current[thread.id] = node; }}
              onClick={() => setSelectedId(thread.id)} onKeyDown={event => {
                const next = event.key === 'ArrowRight' ? (index + 1) % threads.length : event.key === 'ArrowLeft' ? (index + threads.length - 1) % threads.length : event.key === 'Home' ? 0 : event.key === 'End' ? threads.length - 1 : -1;
                if (next >= 0) { event.preventDefault(); setSelectedId(threads[next].id); tabs.current[threads[next].id]?.focus(); }
              }}><span>{initials(thread.name)}</span><b>{thread.name}</b>{newCount > 0 && <small aria-label={`${newCount} new updates`}>{newCount}</small>}</button>;
          })}
        </div>
        <section className={s.summary} aria-label="Where the deal stands">
          <div className={s.summaryTitle}><span>WHERE THE DEAL STANDS</span>{offer?.status === 'locked' ? <b><Check size={12}/>Selected</b> : usable ? <b><Check size={12}/>Fits your request</b> : <span>{active ? 'In conversation' : 'Review your options'}</span>}</div>
          {offer ? <><div className={s.total} key={`${selected?.id}-${offer.id}`}><strong>{money(offer.terms.totalCents)}</strong><span>USD total<br/>delivery included</span></div>
            <div className={s.facts}><span><Clock3 size={13}/>{offer.terms.arrivalDays}-day arrival</span><span><ShieldCheck size={13}/>{offer.terms.warrantyMonths}-month warranty</span></div>
            {improvement > 0 && <p className={s.improvement}><ArrowDownRight size={14}/>{money(improvement)} lower than the opening proposal</p>}
            {!!offer.reasons.length && <p className={s.caution}>{offer.reasons.join(' · ')}</p>}</>
            : <div className={s.noOffer}><ArrowUpRight size={23}/><p>{active ? 'A little conversation. A better possibility.' : 'No current offer from this seller.'}<small>{active ? 'Their proposal will appear here when it is ready.' : 'Check another seller or adjust your request.'}</small></p></div>}
        </section>
        <div className={s.thread} id="seller-conversation" role="tabpanel" aria-labelledby={`conversation-tab-${selected?.id}`}>
          <div className={s.threadIntro}><span className={s.buyerAvatar}>YOU</span><span>Your buyer agent <ArrowRight size={12}/> {selected?.name}’s agent</span><span className={s.sellerAvatar}>{initials(selected?.name || 'Seller')}</span></div>
          <div className={s.messages} ref={scroller} role="log" aria-label={`Conversation with ${selected?.name}`} aria-live="off" tabIndex={0} onScroll={() => {
            const node = scroller.current; if (!node) return;
            nearBottom.current = node.scrollHeight - node.scrollTop - node.clientHeight < 45;
            if (nearBottom.current) setPending(0);
          }}>
            {messages.map(event => {
              const buyer = event.type === 'buyer.countered';
              const seller = !!event.data.sellerId && !buyer;
              const historical = event.type === 'offer.published' && (event.data.offerId !== offer?.id || !usable);
              return <article key={event.id} className={`${s.message} ${buyer ? s.buyer : seller ? s.seller : s.notice}`}>
                {(buyer || seller) && <div className={s.speaker}><span>{buyer ? 'YOU' : initials(selected?.name || 'Seller')}</span><b>{buyer ? 'Your buyer agent' : `${selected?.name}’s agent`}</b><time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time></div>}
                <div className={s.bubble}><span className={s.messageLabel}>{labels[event.type] || 'Conversation update'}{event.data.round ? ` · round ${event.data.round}` : ''}</span>
                  {event.type === 'offer.published' && event.data.totalCents !== undefined ? <><div className={s.proposal}><strong>{money(event.data.totalCents)}</strong><span>including delivery</span></div><p>{event.data.arrivalDays ? `Delivery within ${event.data.arrivalDays} days.` : 'The seller’s proposed total for your request.'}</p>{historical && <small className={s.earlier}>Earlier proposal · see current terms above</small>}</>
                    : buyer && event.data.targetCents !== undefined ? <p>Asked for a total of <b>{money(event.data.targetCents)}</b>, including delivery.</p>
                    : <p>{event.data.message || 'Your conversation has been updated.'}</p>}
                </div>
              </article>;
            })}
            {!messages.length && <div className={s.emptyThread}><Handshake size={27}/><p>Your agent is here for the conversation.</p><small>Updates appear as the agents exchange proposals.</small></div>}
          </div>
          {pending > 0 && <button className={s.latest} onClick={jumpToLatest}><ArrowDown size={13}/>{pending} new {pending === 1 ? 'update' : 'updates'}</button>}
        </div>
        <div className={`${s.progress} ${active && connected && progress?.state === 'working' ? s.working : ''}`} role="status"><ArrowRight size={15}/><span>{progressText}</span>{active && progress?.round && <small>{progress.round}/3</small>}</div>
        <footer className={s.footer}><span>You choose. You approve.</span><a href="#negotiation-offers" onClick={() => { setMinimized(true); setExpanded(false); }}>Compare offers <ArrowRight size={13}/></a></footer>
      </aside>
      <button ref={launcher} className={s.launcher} onClick={() => { setMinimized(false); setExpanded(true); }} aria-label="Open live negotiation" aria-expanded={!minimized && expanded}>
        <span className={s.launcherIcon}><MessageSquare size={21}/></span><span><b>{active ? 'Your agents are on it.' : 'Your negotiation'}</b><small>{active ? progressText : 'Open the conversation'}</small></span>{unread > 0 && <span className={s.unread}>{unread}</span>}<ChevronDown size={17}/>
      </button>
    </>}
  </div>;
}
