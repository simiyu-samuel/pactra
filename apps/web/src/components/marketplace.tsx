'use client';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, ArrowUpRight, Camera, Check, CheckCheck, ChevronDown, Globe2, Handshake, Headphones, Layers3, LoaderCircle, Package, Plane, Search, ShieldCheck, SlidersHorizontal, X } from 'lucide-react';
import type { DiscoveryResult, DiscoverySource, MarketOffer } from '@pactra/domain';
import type { Product as Channel3Product } from '@pactra/integrations';
import { ProductCard } from './channel3/product-card';
import ConceptPhoto from './concept-photo';
import { ProductGallery } from './product-photo';
import { SiteHeader, SiteFooter } from './site-chrome';
import s from './marketplace.module.css';

type Product = { id: string; name: string; role: string; video: string; audio: string; mount: string; description?: string; images: string[]; brand: string; sourceUrl: string | null; isDemo: boolean };
type Seller = { id: string; name: string; standardDays: number; warrantyMonths: number; listings: Array<{ id: string; listCents: number; available: number; product: Product }> };
type Boot = { sellers: Seller[]; capabilities: { groq: boolean; paypal: boolean; channel3: boolean } };
type Source = DiscoverySource | 'pactra';
const sources: Array<{ id: Source; name: string; detail: string }> = [
  { id: 'pactra', name: 'Pactra sellers', detail: 'Browse & negotiate' },
  { id: 'channel3', name: 'Across retailers', detail: 'Powered by Channel3 · US market' },
  { id: 'jumia', name: 'Jumia', detail: 'Kenya · Store search' },
  { id: 'kilimall', name: 'Kilimall', detail: 'Kenya · Store search' },
  { id: 'amazon', name: 'Amazon', detail: 'US · Store search' },
];
const categories = [{name:'All products',query:'',role:'all',icon:Layers3},{name:'Everyday essentials',query:'backpack',role:'bags',icon:Package},{name:'Home',query:'home',role:'home',icon:Package},{name:'Electronics',query:'electronics',role:'electronics',icon:Headphones},{name:'Fashion',query:'shoes',role:'fashion',icon:Package},{name:'Cameras & audio',query:'camera microphone',role:'creative',icon:Camera}];
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
      offers.push({ id: listing.id, productId: listing.product.id, title: listing.product.name, description: listing.product.description || `Available from ${seller.name}.`, source:'pactra',merchant:seller.name,url:null,image:listing.product.images[0]||null,images:listing.product.images,brand:listing.product.brand,productSourceUrl:listing.product.sourceUrl,amount:listing.listCents/100,currency:'USD',availability:listing.available>0?'in_stock':'out_of_stock',condition:'Seller-listed product',variants:[],category:listing.product.role,fictional:listing.product.isDemo,observedAt:'' });
    }
    // One card per exact product, preferring a seller with stock and the lowest asking price.
    return [...new Map(offers.sort((a, b) => Number(b.availability === 'in_stock') - Number(a.availability === 'in_stock') || a.amount! - b.amount!).map(o => [o.productId, o])).keys()].map(id => offers.find(o => o.productId === id)!).sort((a, b) => Number(['bags','home','electronics','fashion'].includes(b.category)) - Number(['bags','home','electronics','fashion'].includes(a.category)) || a.title.localeCompare(b.title));
  }, [boot]);
  const offers = source === 'pactra' ? native : remote?.offers || [];
  const currencies = [...new Set(offers.map(o => o.currency).filter(Boolean))];
  const visible = offers.filter(o => {
    if (inStock && o.availability !== 'in_stock') return false;
    if (source !== 'pactra') return true;
    const cat = category === 'all' || category === o.category || category === 'creative' && ['camera','microphone','tripod','storage','light'].includes(o.category);
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
  const sourceHelp = source === 'pactra' ? 'These are seller asking prices. Your agents negotiate the full price, including delivery.' : source === 'channel3' ? 'Retailer offers supplied by Channel3 for its default US market. Shipping, taxes and destination availability must be confirmed at the store.' : 'AI web discoveries link to the original marketplace. Search pages may appear alongside listings. Price, stock and delivery are confirmed there.';
  return <div className={s.market}>
    <SiteHeader active="shop" action={<button className={s.compareTop} onClick={() => setComparing(true)} disabled={selected.length < 2}><Layers3 size={17}/><span>Compare finds</span><b>{selected.length}</b></button>}/>
    <main className={s.main}>
      <section className={s.hero}><div className={s.heroCopy}><span className={s.eyebrow}> BUYER AGENTS. SELLER AGENTS. BETTER AGREEMENTS.</span><h1>Your agent negotiates.<br/><em>You make the call.</em></h1><p>Buyers want better terms. Sellers need fair margins.<br/>Pactra gives each side an agent to work towards a deal.</p><div className={s.heroActions}><a href="/negotiate" className={s.darkButton}>Start a negotiation <ArrowUpRight size={18}/></a><a href="/seller-console" className={s.textLink}>Set up your seller agent </a></div><div className={s.heroProof}><ShieldCheck size={16}/><span>More choice. Your final say.</span></div></div><div className={s.heroVisual}><img className={s.shoppingHero} src="/images/shopping-moment.webp" alt="Original campaign artwork of a shopper relaxing at home while choosing her next purchase" width={1536} height={1024} fetchPriority="high"/><div className={s.heroCaption}><Handshake size={23}/><div><b>A little less back-and-forth.</b><span>A little more time for you.</span></div></div></div></section>
      <div className={s.promiseStrip}><span><Handshake size={16}/> Agents negotiate for both sides</span><span><ShieldCheck size={16}/> Buyer budgets and seller limits respected</span><span><Layers3 size={16}/> Compare complete offers</span><span><ShieldCheck size={16}/> You approve the payment</span></div>
      <section id="find-products" className={s.discovery} aria-label="Find products"><div className={s.searchIntro}><h2>Find your next negotiation.</h2><span>Choose a product. Let your agent handle the conversation.</span></div><form className={s.searchForm} onSubmit={submit}><Search size={22}/><input ref={searchRef} aria-label="Search products" placeholder={source === 'pactra' ? 'Search products from Pactra sellers…' : 'Describe what you’re looking for…'} value={query} maxLength={240} onChange={e => setQuery(e.target.value)}/><button type="submit" aria-label={busy ? 'Searching…' : 'Search'} disabled={busy || !boot}>{busy ? <LoaderCircle size={18} className="spin"/> : null}<span>{busy ? 'Searching…' : 'Search'}</span><ArrowRight size={16}/></button></form><details className={s.extraTools}><summary>Looking elsewhere? Search other stores</summary><div className={s.sourceRow}><span>Search in</span><div role="group" aria-label="Search source">{sources.map(x => <button key={x.id} type="button" disabled={busy} aria-pressed={source === x.id} onClick={() => changeSource(x.id)}>{x.name}{source === x.id && <Check size={12}/>}</button>)}</div></div></details><p className={s.sourceDetail}>{selectedSource.detail} {source !== 'pactra' && '· Search runs only when you submit.'}</p></section>
      <div className={s.categoryRow} role="group" aria-label="Product categories">{categories.map(c => <button key={c.name} disabled={busy} aria-pressed={category === c.role} onClick={() => { setCategory(c.role); if (source !== 'pactra') { setQuery(c.query); searchRef.current?.focus(); } else { setAppliedQuery(''); setQuery(''); } }}><c.icon size={18}/>{c.name}</button>)}<span className={s.categoryHint}><Globe2 size={15}/> Products from Pactra sellers</span></div>
      <section id="finds" className={s.finds}><div className={s.sectionHead}><div><span className={s.eyebrow}>{source === 'pactra' ? 'FROM OUR SELLERS' : 'BEYOND ONE STOREFRONT'}</span><h2>{source === 'pactra' ? 'Choose the product. Negotiate the deal.' : source === 'channel3' ? 'Finds across retailers.' : `Discover on ${selectedSource.name}`}</h2></div><span className={s.resultCount}>{boot ? `${visible.length} ${source === 'pactra' ? (visible.length===1?'product':'products') : (visible.length===1?'result':'results')}` : 'Loading catalog…'}</span></div><div className={s.resultToolbar}><p>{sourceHelp}</p><div><label><input type="checkbox" checked={inStock} onChange={e => setInStock(e.target.checked)}/> In stock only</label><label className={s.sortLabel}><SlidersHorizontal size={14}/><select aria-label="Sort results" value={sort} onChange={e => setSort(e.target.value)}><option value="recommended">Recommended</option><option value="price" disabled={currencies.length !== 1}>Price: low to high</option></select><ChevronDown size={13}/></label></div></div>
        {bootError && <div role="alert" className={s.notice}>{bootError}</div>}{error && <div role="alert" className={s.notice}>{error}</div>}
        {busy ? <div className={s.empty} role="status"><LoaderCircle className="spin" size={28}/><h3>Looking beyond the usual.</h3><p>Searching {selectedSource.name} for relevant offers. This can take a moment.</p></div> : visible.length ? <div className={s.productGrid}>{visible.map(o => <article key={o.id} className={s.productCard}>{o.source === 'channel3' && productFor(o) ? <div className={s.channel3Card}><ProductCard product={{ ...productFor(o)!, offers: productFor(o)!.offers!.filter(offer => offer.url === o.url) }} showSwatches={false} onSelect={() => { void openDetails(o, productFor(o)); }}/><span className={s.sourceBadge}><Globe2 size={11}/> Channel3 find</span></div> : <button className={s.productImage} onClick={() => { void openDetails(o, productFor(o)); }} aria-label={`View ${o.title}`}><OfferImage offer={o}/><span className={`${s.sourceBadge} ${o.source === 'pactra' ? s.nativeBadge : ''}`}>{o.source === 'pactra' ? <Handshake size={11}/> : <Globe2 size={11}/>} {o.source === 'pactra' ? 'Pactra seller' : o.source === 'channel3' ? 'Channel3 find' : 'Store search'}</span></button>}<div className={s.productInfo}><span className={s.merchant}>{o.merchant}</span><button className={s.productTitle} onClick={() => { void openDetails(o, productFor(o)); }}><h3>{o.title}</h3></button><p className={s.productDescription}>{o.source === 'pactra' ? `${o.category} · Pactra collection` : o.variants.join(' · ') || o.condition || 'Confirm details with the merchant'}</p><div className={s.priceRow}><strong className={o.amount === null ? s.unknownPrice : ''}>{formatPrice(o)}</strong>{o.currency && <small>{o.currency}</small>}</div><p className={s.stock}>{o.availability === 'in_stock' ? <>Available from this seller</> : o.availability === 'out_of_stock' ? 'Listed out of stock' : 'Availability at store'}{o.source === 'pactra' && ''}</p><div className={s.productActions}>{o.source === 'pactra' ? <a href={`/negotiate?product=${encodeURIComponent((o.productId || ''))}`}>Negotiate this item <ArrowRight size={14}/></a> : o.source === 'channel3' ? <button onClick={() => { void openDetails(o, productFor(o)); }}>View at store <ArrowUpRight size={14}/></button> : <a href={o.url!} target="_blank" rel="noopener noreferrer">View at store <ArrowUpRight size={14}/></a>}<button className={s.compareCheck} aria-label={`Compare ${o.title} from ${o.merchant}`} aria-pressed={selected.some(x => x.id === o.id)} disabled={selected.length >= 3 && !selected.some(x => x.id === o.id)} onClick={() => toggleCompare(o)}>{selected.some(x => x.id === o.id) ? <Check size={16}/> : <Layers3 size={16}/>}</button></div></div></article>)}</div> : !boot && !bootError ? <div className={s.empty} role="status"><LoaderCircle className="spin"/><p>Finding our sellers’ collections…</p></div> : <div className={s.empty}><Search size={30}/><h3>{source === 'pactra' ? native.length ? 'Let’s try another find.' : 'Good things are on their way.' : remote ? 'No matching discoveries this time.' : 'A wider world of possibilities.'}</h3><p>{source === 'pactra' ? native.length ? 'Try a product name or category, or clear your filters.' : 'Our shops are preparing their product listings. Products appear here when sellers publish them.' : 'Enter what you’re looking for above and press Search. You can also visit the marketplace directly.'}</p>{source === 'pactra' ? <button onClick={() => { setQuery(''); setAppliedQuery(''); setCategory('all'); setInStock(false); }}>Clear filters <ArrowRight size={14}/></button> : externalLink ? <a href={externalLink} target="_blank" rel="noopener noreferrer">Search directly on {selectedSource.name} <ArrowUpRight size={14}/></a> : <button onClick={() => changeSource('pactra')}>Explore Pactra sellers <ArrowRight size={14}/></button>}</div>}
        {remote && <p className={s.dataNote}>{remote.cached ? 'Cached search' : 'Retrieved'} {new Date(remote.observedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · Prices and availability may change. {source === 'channel3' && 'Some merchant links may earn a commission; commission does not affect ordering.'}</p>}
      </section>
      <section className={s.agentBanner}><div className={s.agentStory}><img src="/brand/pactra-mark.svg" alt="Pactra agreement mark" loading="lazy"/></div><div><span className={s.eyebrow}> SHOP WITH A LITTLE ADVANTAGE</span><h2>Your side has an agent.<br/>So does theirs.</h2><p>Your agent asks for better terms. Seller agents protect their limits.<br/>You compare the offers and choose what works for you.</p><a className={s.darkButton} href="/negotiate">Meet your buyer agent <ArrowRight size={16}/></a><small>Your products. Your priorities. Your approval.</small></div><div className={s.agentDiagram}><span className={s.agentTag}> THREE SELLER AGENTS. YOUR PRIORITIES.</span><div className={s.sellerChips}>{(boot?.sellers || []).map((seller, i) => <span key={seller.id}><i>{seller.name.split(' ').map(n => n[0]).join('')}</i><b>{seller.name}</b><small>{['Value focused', 'Bundle minded', 'Speed first'][i]}</small></span>)}</div></div></section>
      <section id="how-it-works" className={s.how}><div className={s.sectionHead}><div><span className={s.eyebrow}>GOOD FINDS. CLEAR CHOICES.</span><h2>A better way to make a pact.</h2></div></div><div className={s.howGrid}><article><span>01 / DISCOVER</span><Search size={25}/><h3>Tell your buyer agent.</h3><p>Choose any product listed by a Pactra seller. Set your budget, quantity and delivery deadline.</p></article><article><span>02 / COMPARE</span><Layers3 size={25}/><h3>Let both sides negotiate.</h3><p>Your buyer agent and seller agents exchange offers. Sellers keep control of their minimum prices and stock.</p></article><article><span>03 / CHOOSE</span><Handshake size={25}/><h3>Make the final call.</h3><p>Compare the full price and delivery terms. Choose your agreement, then approve a PayPal test payment.</p></article></div></section>
    </main><SiteFooter/>
    {selected.length > 0 && <div className={s.compareTray}><span><Layers3 size={18}/><b>{selected.length} of 3</b> finds to compare</span><div><button onClick={() => setSelected([])}>Clear</button><button className={s.darkButton} disabled={selected.length < 2} onClick={() => setComparing(true)}>Compare finds <ArrowRight size={15}/></button></div></div>}
    {details && <Dialog title={details.title} close={() => { detailRun.current++; setDetails(null); }}><div className={s.detailBody}><div className={s.detailImage}>{details.source === 'pactra' && details.images?.length ? <ProductGallery images={details.images} title={details.title}/> : <OfferImage offer={details}/>}</div><div><span className={s.eyebrow}>{details.source === 'pactra' ? 'FROM PACTRA SELLERS' : `FOUND WITH ${details.source.toUpperCase()}`}</span><p>{details.description || 'View the original listing for the merchant’s full product details.'}</p><strong className={s.detailPrice}>{formatPrice(details)} {details.currency}</strong><dl><div><dt>Seller</dt><dd>{details.merchant}</dd></div><div><dt>Availability</dt><dd>{details.availability.replaceAll('_', ' ')}</dd></div><div><dt>Variant</dt><dd>{details.source==='pactra'?'Model and finish shown in the product name':details.variants.join(' · ') || 'Check available options'}</dd></div><div><dt>{details.source==='pactra'?'Delivery':'Delivery & taxes'}</dt><dd>{details.source === 'pactra' ? 'Included in the negotiated total' : 'Confirm with merchant'}</dd></div></dl>{details.source === 'pactra' ? <><p className={s.detailNote}>Your agent negotiates this exact product and quantity with the seller. You review the total price and delivery before agreeing.</p><a className={s.darkButton} href={`/negotiate?product=${encodeURIComponent(boot?.sellers.flatMap(s=>s.listings).find(l=>l.id===details.id)?.product.id || '')}`}>Negotiate this product <ArrowRight size={16}/></a></> : <><p className={s.detailNote}>You’ll complete your purchase on {details.merchant}. Confirm the exact variant, final price and delivery there.</p>{refreshing ? <p role="status">Refreshing the merchant’s current offer…</p> : detailError ? <p role="alert">{detailError}</p> : <a className={s.darkButton} href={details.url!} target="_blank" rel="noopener noreferrer sponsored">View original offer <ArrowUpRight size={16}/></a>}</>}<button className={s.detailCompare} disabled={selected.length >= 3 && !selected.some(x => x.id === details.id)} onClick={() => toggleCompare(details)}>{selected.some(x => x.id === details.id) ? <Check size={15}/> : <Layers3 size={15}/>} {selected.some(x => x.id === details.id) ? 'Remove from comparison' : 'Add to comparison'}</button></div></div></Dialog>}
    {comparing && <Dialog title="Your finds, side by side." close={() => setComparing(false)}><p className={s.compareNote}>These are your selected options. Different models, variants and currencies are not equivalent; delivery and taxes may be extra. Pactra offers are negotiated with the participating seller.</p><div className={s.comparison}>{selected.map(o => <article key={o.id}><div className={s.comparisonImage}><OfferImage offer={o}/></div><span className={s.merchant}>{o.source === 'pactra' ? 'Pactra seller' : o.source === 'channel3' ? 'Channel3 offer' : 'Store search'}</span><h3>{o.title}</h3><strong>{formatPrice(o)} {o.currency}</strong><dl><div><dt>Merchant</dt><dd>{o.merchant}</dd></div><div><dt>Availability</dt><dd>{o.availability.replaceAll('_', ' ')}</dd></div><div><dt>Condition</dt><dd>{o.condition || 'Check available options'}</dd></div><div><dt>Variant</dt><dd>{o.variants.join(' · ') || 'Check available options'}</dd></div><div><dt>{o.source==='pactra'?'Delivery':'Delivery & taxes'}</dt><dd>{o.source === 'pactra' ? 'In the negotiated total' : 'Confirm at merchant'}</dd></div></dl>{o.source === 'pactra' ? <a className={s.darkButton} href="/negotiate">Start negotiating <ArrowRight size={14}/></a> : o.source === 'channel3' ? <button className={s.darkButton} onClick={() => { setComparing(false); void openDetails(o, productFor(o)); }}>Refresh & view <ArrowUpRight size={14}/></button> : <a className={s.darkButton} href={o.url!} target="_blank" rel="noopener noreferrer sponsored">View at store <ArrowUpRight size={14}/></a>}<button className={s.detailCompare} onClick={() => { setSelected(selected.filter(x => x.id !== o.id)); if (selected.length <= 2) setComparing(false); }}>Remove</button></article>)}</div></Dialog>}
  </div>;
}
