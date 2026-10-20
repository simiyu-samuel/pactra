'use client';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, ArrowUpRight, Camera, Check, CheckCheck, ChevronDown, Globe2, Handshake, Headphones, Layers3, LoaderCircle, Package, Plane, Search, ShieldCheck, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import type { DiscoveryResult, DiscoverySource, MarketOffer } from '@pactra/domain';
import type { Product as Channel3Product } from '@pactra/integrations';
import { ProductCard } from './channel3/product-card';
import ConceptPhoto from './concept-photo';
import { SiteHeader, SiteFooter } from './site-chrome';
import s from './marketplace.module.css';

type Product = { id: string; name: string; role: string; video: string; audio: string; mount: string };
type Seller = { id: string; name: string; standardDays: number; warrantyMonths: number; listings: Array<{ id: string; listCents: number; available: number; product: Product }> };
type Boot = { sellers: Seller[]; capabilities: { groq: boolean; paypal: boolean; channel3: boolean } };
type Source = DiscoverySource | 'pactra';
const sources: Array<{ id: Source; name: string; detail: string }> = [
  { id: 'pactra', name: 'Pactra sellers', detail: 'Browse & negotiate' },
  { id: 'channel3', name: 'Across retailers', detail: 'Powered by Channel3 · US market' },
  { id: 'jumia', name: 'Jumia', detail: 'Kenya · AI web discovery' },
  { id: 'kilimall', name: 'Kilimall', detail: 'Kenya · AI web discovery' },
  { id: 'amazon', name: 'Amazon', detail: 'US · AI web discovery' },
];
const categories = [{ name: 'All finds', query: '', role: 'all', icon: Layers3 }, { name: 'Cameras', query: '4K camera', role: 'camera', icon: Camera }, { name: 'Audio', query: 'microphone', role: 'microphone', icon: Headphones }, { name: 'Accessories', query: 'tripod camera accessories', role: 'accessories', icon: Package }];
const formatPrice = (o: MarketOffer) => o.amount === null || !o.currency ? 'Check price at store' : new Intl.NumberFormat('en', { style: 'currency', currency: o.currency, maximumFractionDigits: 2 }).format(o.amount);
const fallbackLink = (source: Source, query: string) => source === 'jumia' ? `https://www.jumia.co.ke/catalog/?q=${encodeURIComponent(query)}` : source === 'kilimall' ? `https://www.kilimall.co.ke/search?q=${encodeURIComponent(query)}` : source === 'amazon' ? `https://www.amazon.com/s?k=${encodeURIComponent(query)}` : null;
function OfferImage({ offer }: { offer: MarketOffer }) {
  const [failed, setFailed] = useState(false);
  return offer.image && !failed ? <img src={offer.image} alt={offer.title} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)}/> : offer.fictional ? <ConceptPhoto role={offer.category}/> : <div className={s.noImage}><Globe2 size={36}/><span>{offer.merchant}</span></div>;
}
function Dialog({ title, close, children }: { title: string; close: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d = ref.current!; d.showModal(); return () => d.close(); }, []);
  return <dialog ref={ref} className={s.dialog} aria-labelledby="market-dialog-title" onCancel={close} onClick={e => { if (e.target === e.currentTarget) close(); }}><div className={s.dialogHead}><h2 id="market-dialog-title">{title}</h2><button className={s.iconButton} onClick={close} aria-label="Close dialog"><X size={20}/></button></div>{children}</dialog>;
}
export default function Marketplace() {
  const [boot, setBoot] = useState<Boot | null>(null);
  const [bootError, setBootError] = useState('');
  const [source, setSource] = useState<Source>('pactra');
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [remote, setRemote] = useState<(DiscoveryResult & { products?: Channel3Product[] }) | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sort, setSort] = useState('recommended');
  const [inStock, setInStock] = useState(false);
  const [selected, setSelected] = useState<MarketOffer[]>([]);
  const [details, setDetails] = useState<MarketOffer | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [comparing, setComparing] = useState(false);
  const detailRun = useRef(0);
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => { fetch('/api/bootstrap', { cache: 'no-store' }).then(async r => { if (!r.ok) throw new Error('The catalog could not load. Please refresh to try again.'); setBoot(await r.json()); }).catch(e => setBootError(e.message)); }, []);
  const native = useMemo(() => {
    const offers: MarketOffer[] = [];
    for (const seller of boot?.sellers || []) for (const listing of seller.listings) {
      offers.push({ id: listing.id, title: listing.product.name, description: `Fictional ${listing.product.role} from ${seller.name}. ${listing.product.role === 'camera' ? listing.product.video + ' video. ' : ''}Part of the Pactra creator-kit demo.`, source: 'pactra', merchant: seller.name, url: null, image: null, amount: listing.listCents / 100, currency: 'USD', availability: listing.available > 0 ? 'in_stock' : 'out_of_stock', condition: 'Demo item', variants: [], category: listing.product.role, fictional: true, observedAt: '' });
    }
    // One product card per fictional product, with the lowest listed in-stock price.
    return [...new Map(offers.sort((a, b) => Number(b.availability === 'in_stock') - Number(a.availability === 'in_stock') || a.amount! - b.amount!).map(o => [o.title, o])).keys()].map(title => offers.find(o => o.title === title)!).sort((a, b) => Number(b.category === 'camera') - Number(a.category === 'camera') || a.title.localeCompare(b.title));
  }, [boot]);
  const offers = source === 'pactra' ? native : remote?.offers || [];
  const currencies = [...new Set(offers.map(o => o.currency).filter(Boolean))];
  const visible = offers.filter(o => {
    if (inStock && o.availability !== 'in_stock') return false;
    if (source !== 'pactra') return true;
    const cat = category === 'all' || category === o.category || category === 'accessories' && ['tripod', 'storage', 'light'].includes(o.category);
    const words = appliedQuery.toLowerCase().split(/\s+/).filter(Boolean);
    return cat && words.every(w => `${o.title} ${o.description} ${o.merchant} ${o.category}`.toLowerCase().includes(w));
  }).sort((a, b) => sort === 'price' && currencies.length === 1 ? (a.amount ?? Infinity) - (b.amount ?? Infinity) : 0);
  function changeSource(next: Source) { if (busy) return; setSource(next); setRemote(null); setError(''); setAppliedQuery(''); setInStock(false); setSort('recommended'); setCategory('all'); }
  async function submit(e?: FormEvent) {
    e?.preventDefault();
    if (busy || !boot) return;
    if (source === 'pactra') { setAppliedQuery(query.trim()); document.getElementById('finds')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    if (query.trim().length < 2) { setError('Tell us what you’re looking for, using at least two characters.'); searchRef.current?.focus(); return; }
    setBusy(true); setError(''); setRemote(null); setAppliedQuery(query.trim());
    try {
      const response = await fetch('/api/discovery', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source, query: query.trim() }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || 'Search could not complete. Please try again.');
      setRemote(result);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); document.getElementById('finds')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  }
  async function openDetails(offer: MarketOffer, product?: Channel3Product) {
    const run = ++detailRun.current;
    setDetails(offer); setDetailError('');
    if (offer.source !== 'channel3') { setRefreshing(false); return; }
    const productId = offer.productId || product?.id;
    if (!productId) { setDetailError('Search again to refresh this offer.'); return; }
    setRefreshing(true);
    try {
      const r = await fetch('/api/discovery/product', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId }) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error?.message || 'Could not refresh this offer.');
      const current = (data.offers as MarketOffer[]).find(o => o.merchant === offer.merchant && JSON.stringify(o.variants) === JSON.stringify(offer.variants) && o.condition === offer.condition);
      if (!current) throw new Error('This exact merchant offer is no longer available. Search again for current options.');
      if (run === detailRun.current) { setDetails(current); setSelected(previous => previous.map(o => o.id === current.id ? current : o)); }
    } catch (e) { if (run === detailRun.current) setDetailError((e as Error).message); }
    finally { if (run === detailRun.current) setRefreshing(false); }
  }
  const productFor = (o: MarketOffer) => remote?.products?.find(p => p.offers?.some(offer => offer.url === o.url));
  function toggleCompare(o: MarketOffer) {
    if (selected.some(x => x.id === o.id)) setSelected(selected.filter(x => x.id !== o.id));
    else if (selected.length < 3) setSelected([...selected, o]);
  }
  const selectedSource = sources.find(x => x.id === source)!;
  const externalLink = fallbackLink(source, appliedQuery || query);
  const sourceHelp = source === 'pactra' ? 'Fictional creator equipment. Prices below are listed item prices; negotiate a complete kit for delivery and final terms.' : source === 'channel3' ? 'Retailer offers supplied by Channel3 for its default US market. Shipping, taxes and destination availability must be confirmed at the store.' : 'AI web discoveries link to the original marketplace. Search pages may appear alongside listings. Price, stock and delivery are confirmed there.';
  return <div className={s.market}>
    <SiteHeader active="shop" action={<button className={s.compareTop} onClick={() => setComparing(true)} disabled={selected.length < 2}><Layers3 size={17}/><span>Compare finds</span><b>{selected.length}</b></button>}/>
    <main className={s.main}>
      <section className={s.hero}><div className={s.heroCopy}><span className={s.eyebrow}><span/> LESS SCROLLING. MORE POSSIBILITY.</span><h1>Find your next<br/><em>really good thing.</em></h1><p>For the things you’re into. And the places you’re going.<br/>Discover, compare, and make a better pact.</p><div className={s.heroActions}><a href="#finds" className={s.darkButton}>Explore the finds <ArrowUpRight size={18}/></a><a href="/negotiate" className={s.textLink}>Meet your shopping agent <Sparkles size={15}/></a></div><div className={s.heroProof}><ShieldCheck size={16}/><span>More choice. Your final say.</span></div></div><div className={s.heroVisual}><img src="/images/creator-studio.webp" alt="Original campaign artwork of a creator setting up a camera in a sunlit studio" width={1536} height={1024} fetchPriority="high"/><span className={s.visualTop}>THE NEXT CHAPTER LOOKS GOOD ON YOU.</span><a href="#finds" className={s.floatCard}><span className={s.floatIcon}><Sparkles size={20}/></span><div><b>Your next big idea starts here.</b><span>Explore the creator collection</span></div><ArrowUpRight size={19}/></a><span className={s.cornerSpark}>your find.<br/><em>your call.</em></span></div></section>
      <div className={s.promiseStrip}><span><Globe2 size={16}/> Discover across stores</span><i/><span><Layers3 size={16}/> Compare the details</span><i/><span><Handshake size={16}/> Negotiate with Pactra sellers</span><i/><span><ShieldCheck size={16}/> You approve every purchase</span></div>
      <section className={s.discovery} aria-label="Find products"><div className={s.searchIntro}><h2>What are you looking for?</h2><span>A good find starts with a little curiosity.</span></div><form className={s.searchForm} onSubmit={submit}><Search size={22}/><input ref={searchRef} aria-label="Search products" placeholder={source === 'pactra' ? 'Search cameras, microphones, tripods…' : 'Describe what you’re looking for…'} value={query} maxLength={240} onChange={e => setQuery(e.target.value)}/><button type="submit" aria-label={busy ? 'Searching…' : 'Search'} disabled={busy || !boot}>{busy ? <LoaderCircle size={18} className="spin"/> : <Sparkles size={16}/>}<span>{busy ? 'Searching…' : 'Search'}</span><ArrowRight size={16}/></button></form><div className={s.sourceRow}><span>Search in</span><div role="group" aria-label="Search source">{sources.map(x => <button key={x.id} type="button" disabled={busy} aria-pressed={source === x.id} onClick={() => changeSource(x.id)}>{x.id === 'pactra' && <span className={s.smallDot}/>} {x.name}{source === x.id && <Check size={12}/>}</button>)}</div></div><p className={s.sourceDetail}>{selectedSource.detail} {source !== 'pactra' && '· Search runs only when you submit.'}</p></section>
      <section className={s.collections} aria-label="Explore collections"><button disabled={busy} onClick={() => { changeSource('pactra'); setCategory('camera'); setQuery(''); setAppliedQuery(''); document.getElementById('finds')?.scrollIntoView({behavior:'smooth'}); }}><img src="/images/camera-concept.webp" alt="Fictional camera concept" loading="lazy"/><span><small>FOR YOUR CREATIVE SIDE</small><b>Make something great.</b><em>Explore cameras <ArrowUpRight size={16}/></em></span></button><button disabled={busy} onClick={() => { changeSource('pactra'); setCategory('microphone'); setQuery(''); setAppliedQuery(''); document.getElementById('finds')?.scrollIntoView({behavior:'smooth'}); }}><img src="/images/audio-concept.webp" alt="Fictional audio equipment concept" loading="lazy"/><span><small>EVERY DETAIL MATTERS</small><b>Find your voice.</b><em>Explore audio <ArrowUpRight size={16}/></em></span></button><a href="/flights"><img src="/images/coastal-escape.webp" alt="Original travel inspiration artwork of a sunlit coast" loading="lazy"/><span><small>A CHANGE OF SCENERY</small><b>Go a little further.</b><em>Explore flight search <ArrowUpRight size={16}/></em></span></a></section>
      <div className={s.categoryRow} role="group" aria-label="Product categories">{categories.map(c => <button key={c.name} disabled={busy} aria-pressed={category === c.role} onClick={() => { setCategory(c.role); if (source !== 'pactra') { setQuery(c.query); searchRef.current?.focus(); } else { setAppliedQuery(''); setQuery(''); } }}><c.icon size={18}/>{c.name}</button>)}<a href="/flights" className={s.flightCategory}><Plane size={17}/> Flights</a><span className={s.categoryHint}><Globe2 size={15}/> Your world. More choice.</span></div>
      <section id="finds" className={s.finds}><div className={s.sectionHead}><div><span className={s.eyebrow}>{source === 'pactra' ? 'FROM OUR SELLERS' : 'BEYOND ONE STOREFRONT'}</span><h2>{source === 'pactra' ? 'A little inspiration. A lot of possibility.' : source === 'channel3' ? 'Finds across retailers.' : `Discover on ${selectedSource.name}`}</h2></div><span className={s.resultCount}>{boot ? `${visible.length} ${source === 'pactra' ? 'products' : 'results'}` : 'Loading catalog…'}</span></div><div className={s.resultToolbar}><p>{sourceHelp}</p><div><label><input type="checkbox" checked={inStock} onChange={e => setInStock(e.target.checked)}/> In stock only</label><label className={s.sortLabel}><SlidersHorizontal size={14}/><select aria-label="Sort results" value={sort} onChange={e => setSort(e.target.value)}><option value="recommended">Recommended</option><option value="price" disabled={currencies.length !== 1}>Price: low to high</option></select><ChevronDown size={13}/></label></div></div>
        {bootError && <div role="alert" className={s.notice}>{bootError}</div>}{error && <div role="alert" className={s.notice}>{error}</div>}
        {busy ? <div className={s.empty} role="status"><LoaderCircle className="spin" size={28}/><h3>Looking beyond the usual.</h3><p>Searching {selectedSource.name} for relevant offers. This can take a moment.</p></div> : visible.length ? <div className={s.productGrid}>{visible.map(o => <article key={o.id} className={s.productCard}>{o.source === 'channel3' && productFor(o) ? <div className={s.channel3Card}><ProductCard product={{ ...productFor(o)!, offers: productFor(o)!.offers!.filter(offer => offer.url === o.url) }} showSwatches={false} onSelect={() => { void openDetails(o, productFor(o)); }}/><span className={s.sourceBadge}><Globe2 size={11}/> Channel3 find</span></div> : <button className={s.productImage} onClick={() => { void openDetails(o, productFor(o)); }} aria-label={`View ${o.title}`}><OfferImage offer={o}/><span className={`${s.sourceBadge} ${o.fictional ? s.nativeBadge : ''}`}>{o.fictional ? <Handshake size={11}/> : <Globe2 size={11}/>} {o.fictional ? 'Demo · concept image' : o.source === 'channel3' ? 'Channel3 find' : 'Web discovery'}</span></button>}<div className={s.productInfo}><span className={s.merchant}>{o.merchant}</span><button className={s.productTitle} onClick={() => { void openDetails(o, productFor(o)); }}><h3>{o.title}</h3></button><p className={s.productDescription}>{o.fictional ? `${o.category} · creator collection` : o.variants.join(' · ') || o.condition || 'Confirm details with the merchant'}</p><div className={s.priceRow}><strong className={o.amount === null ? s.unknownPrice : ''}>{formatPrice(o)}</strong>{o.currency && <small>{o.currency}</small>}</div><p className={s.stock}>{o.availability === 'in_stock' ? <><span/> Listed in stock</> : o.availability === 'out_of_stock' ? 'Listed out of stock' : 'Availability at store'}{o.fictional && ' · fictional stock'}</p><div className={s.productActions}>{o.fictional ? <button onClick={() => { void openDetails(o, productFor(o)); }}>Explore item <ArrowRight size={14}/></button> : o.source === 'channel3' ? <button onClick={() => { void openDetails(o, productFor(o)); }}>View at store <ArrowUpRight size={14}/></button> : <a href={o.url!} target="_blank" rel="noopener noreferrer">View at store <ArrowUpRight size={14}/></a>}<button className={s.compareCheck} aria-label={`Compare ${o.title} from ${o.merchant}`} aria-pressed={selected.some(x => x.id === o.id)} disabled={selected.length >= 3 && !selected.some(x => x.id === o.id)} onClick={() => toggleCompare(o)}>{selected.some(x => x.id === o.id) ? <Check size={16}/> : <Layers3 size={16}/>}</button></div></div></article>)}</div> : !boot && !bootError ? <div className={s.empty} role="status"><LoaderCircle className="spin"/><p>Finding our sellers’ collections…</p></div> : <div className={s.empty}><Search size={30}/><h3>{source === 'pactra' ? 'Let’s try another find.' : remote ? 'No matching discoveries this time.' : 'A wider world of possibilities.'}</h3><p>{source === 'pactra' ? 'Try a product name or category, or clear your filters.' : 'Enter what you’re looking for above and press Search. You can also visit the marketplace directly.'}</p>{source === 'pactra' ? <button onClick={() => { setQuery(''); setAppliedQuery(''); setCategory('all'); setInStock(false); }}>Clear filters <ArrowRight size={14}/></button> : externalLink ? <a href={externalLink} target="_blank" rel="noopener noreferrer">Search directly on {selectedSource.name} <ArrowUpRight size={14}/></a> : <button onClick={() => changeSource('pactra')}>Explore Pactra sellers <ArrowRight size={14}/></button>}</div>}
        {remote && <p className={s.dataNote}>{remote.cached ? 'Cached search' : 'Retrieved'} {new Date(remote.observedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · Prices and availability may change. {source === 'channel3' && 'Some merchant links may earn a commission; commission does not affect ordering.'}</p>}
      </section>
      <section className={s.agentBanner}><div className={s.agentStory}><img src="/images/creator-studio.webp" alt="Creator lifestyle campaign artwork" loading="lazy"/></div><div><span className={s.eyebrow}><Sparkles size={14}/> SHOP WITH A LITTLE ADVANTAGE</span><h2>Love the find?<br/>Let’s talk terms.</h2><p>Your buyer agent meets three Pactra seller agents.<br/>They work on the bundle. You make the final call.</p><a className={s.darkButton} href="/negotiate">Negotiate a creator kit <ArrowRight size={16}/></a><small>Fictional camera + microphone + tripod · PayPal sandbox</small></div><div className={s.agentDiagram}><span className={s.agentTag}><Sparkles size={14}/> THREE SELLER AGENTS. YOUR PRIORITIES.</span><div className={s.sellerChips}>{(boot?.sellers || []).map((seller, i) => <span key={seller.id}><i>{seller.name.split(' ').map(n => n[0]).join('')}</i><b>{seller.name}</b><small>{['Value focused', 'Bundle minded', 'Speed first'][i]}</small></span>)}</div></div></section>
      <section id="how-it-works" className={s.how}><div className={s.sectionHead}><div><span className={s.eyebrow}>GOOD FINDS. CLEAR CHOICES.</span><h2>A better way to make a pact.</h2></div></div><div className={s.howGrid}><article><span>01 / DISCOVER</span><Search size={25}/><h3>Start with what you want.</h3><p>Browse Pactra sellers, search retailers through Channel3, or explore another marketplace with AI.</p></article><article><span>02 / COMPARE</span><Layers3 size={25}/><h3>See the tradeoffs.</h3><p>Put up to three finds side by side. Check the product, source, currency and what still needs confirming.</p></article><article><span>03 / CHOOSE</span><Handshake size={25}/><h3>Make your move.</h3><p>Visit an external store, or negotiate a supported Pactra kit and approve its exact terms with PayPal sandbox.</p></article></div></section>
    </main><SiteFooter/>
    {selected.length > 0 && <div className={s.compareTray}><span><Layers3 size={18}/><b>{selected.length} of 3</b> finds to compare</span><div><button onClick={() => setSelected([])}>Clear</button><button className={s.darkButton} disabled={selected.length < 2} onClick={() => setComparing(true)}>Compare finds <ArrowRight size={15}/></button></div></div>}
    {details && <Dialog title={details.title} close={() => { detailRun.current++; setDetails(null); }}><div className={s.detailBody}><div className={s.detailImage}><OfferImage offer={details}/></div><div><span className={s.eyebrow}>{details.fictional ? 'PACTRA DEMO COLLECTION' : `DISCOVERED VIA ${details.source.toUpperCase()}`}</span><p>{details.description || 'View the original listing for the merchant’s full product details.'}</p><strong className={s.detailPrice}>{formatPrice(details)} {details.currency}</strong><dl><div><dt>Seller</dt><dd>{details.merchant}</dd></div><div><dt>Availability</dt><dd>{details.availability.replaceAll('_', ' ')}</dd></div><div><dt>Variant</dt><dd>{details.variants.join(' · ') || 'Confirm at source'}</dd></div><div><dt>Delivery & taxes</dt><dd>{details.fictional ? 'Calculated in the demo kit offer' : 'Confirm with merchant'}</dd></div></dl>{details.fictional ? <><p className={s.detailNote}>This is a fictional demo item shown with AI-generated concept imagery, not an exact product photograph. Negotiation currently covers a complete 4K camera, microphone and tripod kit. Your agent may propose different compatible items.</p><a className={s.darkButton} href="/negotiate">Build & negotiate a kit <ArrowRight size={16}/></a></> : <><p className={s.detailNote}>You’ll complete your purchase on {details.merchant}. Confirm the exact variant, final price and delivery there.</p>{refreshing ? <p role="status">Refreshing the merchant’s current offer…</p> : detailError ? <p role="alert">{detailError}</p> : <a className={s.darkButton} href={details.url!} target="_blank" rel="noopener noreferrer sponsored">View original offer <ArrowUpRight size={16}/></a>}</>}<button className={s.detailCompare} disabled={selected.length >= 3 && !selected.some(x => x.id === details.id)} onClick={() => toggleCompare(details)}>{selected.some(x => x.id === details.id) ? <Check size={15}/> : <Layers3 size={15}/>} {selected.some(x => x.id === details.id) ? 'Remove from comparison' : 'Add to comparison'}</button></div></div></Dialog>}
    {comparing && <Dialog title="Your finds, side by side." close={() => setComparing(false)}><p className={s.compareNote}>These are your selected options. Different models, variants and currencies are not equivalent; delivery and taxes may be extra. Fictional Pactra goods are demo alternatives.</p><div className={s.comparison}>{selected.map(o => <article key={o.id}><div className={s.comparisonImage}><OfferImage offer={o}/></div><span className={s.merchant}>{o.fictional ? 'Fictional Pactra item' : o.source === 'channel3' ? 'Channel3 offer' : 'Web discovery'}</span><h3>{o.title}</h3><strong>{formatPrice(o)} {o.currency}</strong><dl><div><dt>Merchant</dt><dd>{o.merchant}</dd></div><div><dt>Availability</dt><dd>{o.availability.replaceAll('_', ' ')}</dd></div><div><dt>Condition</dt><dd>{o.condition || 'Confirm at source'}</dd></div><div><dt>Variant</dt><dd>{o.variants.join(' · ') || 'Confirm at source'}</dd></div><div><dt>Delivery & taxes</dt><dd>{o.fictional ? 'In negotiated kit total' : 'Confirm at merchant'}</dd></div></dl>{o.fictional ? <a className={s.darkButton} href="/negotiate">Negotiate a kit <ArrowRight size={14}/></a> : o.source === 'channel3' ? <button className={s.darkButton} onClick={() => { setComparing(false); void openDetails(o, productFor(o)); }}>Refresh & view <ArrowUpRight size={14}/></button> : <a className={s.darkButton} href={o.url!} target="_blank" rel="noopener noreferrer sponsored">View at store <ArrowUpRight size={14}/></a>}<button className={s.detailCompare} onClick={() => { setSelected(selected.filter(x => x.id !== o.id)); if (selected.length <= 2) setComparing(false); }}>Remove</button></article>)}</div></Dialog>}
  </div>;
}
