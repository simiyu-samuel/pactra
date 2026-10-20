'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, CheckCircle2, Clock3, Handshake, LoaderCircle, LockKeyhole, ShieldCheck } from 'lucide-react';
import { money } from '@pactra/domain';
import type { PolicyDraft } from '@pactra/integrations';
import styles from './owner-console.module.css';
import { SiteHeader, SiteFooter } from './site-chrome';
import SellerProductForm from './seller-product-form';

type Line = { id: string; listCents: number; floorCents: number; onHand: number; reserved: number; product: { name: string } };
type Snapshot = { seller: { strategy: string; privateInstructions: string; warrantyMonths: number; standardCents: number; standardDays: number; expressCents: number; expressDays: number }; listings: Array<{ id: string; floorCents: number; onHand: number }> };
type Version = { id: string; version: number; note: string; source: string; createdAt: string; snapshot: Snapshot };
type Seller = Snapshot['seller'] & { id: string; name: string; policyVersion: number; listings: Line[]; policyVersions: Version[] };
const strategies = { price_first: 'Price focused', bundle_first: 'Bundle focused', speed_first: 'Speed focused' };

async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/owner/${path}`, { method: body === undefined ? 'GET' : 'POST', cache: 'no-store', credentials: 'same-origin', headers: body === undefined ? {} : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(data.error?.message || 'We could not complete that change. Please try again.'), { status: response.status });
  return data;
}
const draftFor = (s: Seller): PolicyDraft => ({ commandKey: crypto.randomUUID(), expectedVersion: s.policyVersion, note: '', strategy: s.strategy as PolicyDraft['strategy'], privateInstructions: s.privateInstructions, warrantyMonths: s.warrantyMonths, standardCents: s.standardCents, standardDays: s.standardDays, expressCents: s.expressCents, expressDays: s.expressDays, listings: s.listings.map(l => ({ id: l.id, floorCents: l.floorCents, onHand: l.onHand, expectedOnHand: l.onHand, expectedReserved: l.reserved })) });

export default function OwnerConsole() {
  const [auth, setAuth] = useState<{ authenticated: boolean; configured: boolean } | null>(null);
  const [secret, setSecret] = useState('');
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [draft, setDraft] = useState<PolicyDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const loginInput = useRef<HTMLInputElement>(null);
  const seller = sellers.find(s => s.id === selectedId);
  const clearPrivate = () => { setSellers([]); setDraft(null); setSelectedId(''); setSecret(''); };
  const choose = (s: Seller) => { setSelectedId(s.id); setDraft(draftFor(s)); setError(''); setNotice(''); };
  async function load(preferredId?: string) {
    const result = await api<{ sellers: Seller[] }>('sellers');
    setSellers(result.sellers);
    const selected = result.sellers.find(s => s.id === preferredId) || result.sellers[0];
    if (selected) { setSelectedId(selected.id); setDraft(draftFor(selected)); }
  }
  useEffect(() => {
    api<{ authenticated: boolean; configured: boolean }>('session').then(async status => { setAuth(status); if (status.authenticated) await load(); }).catch(e => setError(e.message));
  }, []);
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try { await action(); }
    catch (e) {
      setError((e as Error).message);
      if ((e as { status?: number }).status === 401) { clearPrivate(); setAuth({ authenticated: false, configured: true }); }
    } finally { setBusy(false); }
  }
  function login(e: FormEvent) {
    e.preventDefault(); const value = secret; setSecret('');
    void run(async () => { await api('login', { secret: value }); setAuth({ authenticated: true, configured: true }); await load(); });
  }
  function edit(change: Partial<PolicyDraft>) { setDraft(d => d ? { ...d, ...change, commandKey: crypto.randomUUID() } : d); }
  function editLine(id: string, change: { floorCents?: number; onHand?: number }) { if (draft) edit({ listings: draft.listings.map(l => l.id === id ? { ...l, ...change } : l) }); }
  function publish(e: FormEvent) {
    e.preventDefault(); if (!seller || !draft) return;
    void run(async () => { const result = await api<{ version: number }>(`sellers/${seller.id}/publish`, draft); await load(seller.id); setNotice(`Your rules are saved. Your agent will use them for new offers.`); });
  }

  const hasUnsavedChanges = !!seller && !!draft && (draft.note !== '' || ['strategy','privateInstructions','warrantyMonths','standardCents','standardDays','expressCents','expressDays'].some(k => draft[k as keyof PolicyDraft] !== seller[k as keyof Seller]) || draft.listings.some(l => { const original = seller.listings.find(x => x.id === l.id); return l.floorCents !== original?.floorCents || l.onHand !== original?.onHand; }));
  return <><SiteHeader active="seller" action={auth?.authenticated ? <button className={styles.signOut} disabled={busy} onClick={() => void run(async () => { await api('logout', {}); clearPrivate(); setAuth({ authenticated: false, configured: true }); })}>Sign out</button> : <a className={styles.backLink} href="/negotiate">Try the buyer agent <ArrowRight size={15}/></a>}/>
    <main className={styles.main}>
      <div className={styles.heading}><p className="eyebrow"><ShieldCheck size={15}/> YOUR SELLER WORKSPACE</p><h1>Your shop. Your agent.<br/><span>Your rules.</span></h1><p>Add products, set your minimum prices and tell your agent how to negotiate. Buyers get a conversation. You keep control of your margins.</p></div>
      {error && <div className="alert" role="alert">{error}</div>}
      {notice && <div className={styles.success} role="status"><CheckCircle2 size={18}/>{notice}</div>}
      {!auth ? <p className={styles.loading}><LoaderCircle className="spin" size={18}/> Opening your workspace…</p>
        : !auth.authenticated ? <section className={styles.login} aria-labelledby="owner-login-heading"><span className="icon-box"><LockKeyhole size={22}/></span><h2 id="owner-login-heading">Private seller workspace</h2><p>Use your shop access code to manage your products and the rules your agent follows.</p>{auth.configured ? <form onSubmit={login}><label htmlFor="owner-secret">Shop access code</label><input ref={loginInput} id="owner-secret" type="password" value={secret} autoComplete="current-password" required maxLength={256} onChange={e => setSecret(e.target.value)}/><button className="primary full" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17}/> : <LockKeyhole size={17}/>} Open seller workspace <ArrowRight size={16}/></button></form> : <p className={styles.privateNote}>This shop is still being set up. Please contact the demo organiser.</p>}<p className={styles.privateNote}>For your privacy, you will be signed out after four hours. Buyers cannot see your minimum prices or private notes.</p></section>
        : !seller || !draft ? <p className={styles.loading}><LoaderCircle className="spin" size={18}/> Loading your shops…</p>
          : <><div className={styles.metrics}><div><span>Products in this shop</span><b>{seller.listings.length}</b></div><div><span>Available to negotiate</span><b>{seller.listings.filter(l => l.onHand > l.reserved).length}</b></div><div><span>Standard delivery</span><b>{seller.standardDays} days</b></div></div><div className={styles.tabs} role="group" aria-label="Choose a seller">{sellers.map((s, i) => <button key={s.id} disabled={busy} className={selectedId === s.id ? styles.selected : ''} onClick={() => choose(s)}><span>0{i + 1}</span><b>{s.name}</b><small>Saved rules {s.policyVersion}</small></button>)}</div>
            <div className={styles.workspace}><form className={styles.editor} onSubmit={publish}><div className={styles.cardHeading}><div><p className={styles.kicker}>YOUR SHOP’S NEGOTIATION RULES</p><h2>{seller.name}</h2></div><button type="button" className="text-button" disabled={busy} onClick={() => void run(() => load(seller.id))}>Refresh shop</button></div>
              <fieldset disabled={busy} className={styles.fields}><legend>Agent approach</legend><div className={styles.row}><label>How should your agent negotiate?<select value={draft.strategy} onChange={e => edit({ strategy: e.target.value as PolicyDraft['strategy'] })}>{Object.entries(strategies).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></label><label>Warranty in months<input type="number" required min={0} max={60} value={draft.warrantyMonths} onChange={e => edit({ warrantyMonths: Number(e.target.value) })}/></label></div><label>Private notes for your agent<textarea rows={3} maxLength={1000} value={draft.privateInstructions} onChange={e => edit({ privateInstructions: e.target.value })} placeholder="For example: offer a small discount for a larger order, but never go below my minimum prices."/></label><p className={styles.help}>These notes stay with your seller agent. Your minimum prices and available stock always apply.</p></fieldset>
              <fieldset disabled={busy} className={styles.fields}><legend>Delivery promises</legend><div className={styles.row}><label>Standard shipping · USD<input type="number" required min={0} max={100} step="0.01" value={draft.standardCents / 100} onChange={e => edit({ standardCents: Math.round(Number(e.target.value) * 100) })}/></label><label>Standard arrival · days<input type="number" required min={1} max={30} value={draft.standardDays} onChange={e => edit({ standardDays: Number(e.target.value) })}/></label><label>Express shipping · USD<input type="number" required min={0} max={100} step="0.01" value={draft.expressCents / 100} onChange={e => edit({ expressCents: Math.round(Number(e.target.value) * 100) })}/></label><label>Express arrival · days<input type="number" required min={1} max={draft.standardDays} value={draft.expressDays} onChange={e => edit({ expressDays: Number(e.target.value) })}/></label></div></fieldset>
              <fieldset disabled={busy} className={styles.fields}><legend>Your products and price limits</legend><p className={styles.help}>Set the lowest price your agent may offer. Stock includes items held for buyers who are reviewing a deal.</p><div className={styles.tableWrap}><table><thead><tr><th>Product</th><th>Asking price</th><th>Private minimum · USD</th><th>Total stock</th><th>Held for buyers</th></tr></thead><tbody>{seller.listings.map(l => { const line = draft.listings.find(x => x.id === l.id)!; return <tr key={l.id}><td><b>{l.product.name}</b></td><td>{money(l.listCents)}</td><td><input aria-label={`Minimum price for ${l.product.name}`} type="number" required min={0} max={l.listCents / 100} step="0.01" value={line.floorCents / 100} onChange={e => editLine(l.id, { floorCents: Math.round(Number(e.target.value) * 100) })}/></td><td><input aria-label={`Total stock for ${l.product.name}`} type="number" required min={l.reserved} max={10000} value={line.onHand} onChange={e => editLine(l.id, { onHand: Number(e.target.value) })}/></td><td>{l.reserved}</td></tr>; })}</tbody></table></div></fieldset>
              <fieldset disabled={busy} className={styles.fields}><legend>Save your agent’s rules</legend><label>What changed?<input required minLength={3} maxLength={200} value={draft.note} onChange={e => edit({ note: e.target.value })} placeholder="For example: new delivery price or a seasonal discount"/></label><p className={styles.help}>Saved changes apply to new offers. Buyers who already selected a deal keep the terms they agreed to.</p><button className="primary full" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17}/> : <ShieldCheck size={17}/>} Save my rules<ArrowRight size={16}/></button></fieldset>
            </form><aside className={styles.history}><SellerProductForm key={seller.id} sellerId={seller.id} version={seller.policyVersion} disabled={busy || hasUnsavedChanges} onSaved={async () => { await load(seller.id); setNotice('Product added. Buyers can now negotiate it with your agent.'); }} report={setError} onBusy={setBusy} onExpired={() => { clearPrivate(); setAuth({authenticated:false,configured:true}); }}/><div className={styles.historyTitle}><Clock3 size={19}/><h2>Saved changes</h2></div><p className={styles.help}>Your latest 20 saved changes are kept here.</p>{seller.policyVersions.map(v => <details key={v.id}><summary><span className={styles.version}>V{v.version}</span><span><b>{v.note}</b><small>{new Date(v.createdAt).toLocaleString()}</small></span></summary><div className={styles.historyBody}><p><b>{strategies[v.snapshot.seller.strategy as keyof typeof strategies] || v.snapshot.seller.strategy}</b> · {v.snapshot.seller.warrantyMonths}-month warranty</p><p>Standard: {money(v.snapshot.seller.standardCents)} / {v.snapshot.seller.standardDays} days<br/>Express: {money(v.snapshot.seller.expressCents)} / {v.snapshot.seller.expressDays} days</p>{v.snapshot.seller.privateInstructions && <p>{v.snapshot.seller.privateInstructions}</p>}<ul>{v.snapshot.listings.map(l => <li key={l.id}><span>{seller.listings.find(x => x.id === l.id)?.product.name || 'Earlier product'}</span><span>Min. {money(l.floorCents)} · stock {l.onHand}</span></li>)}</ul><p className={styles.help}>Stock shown is what was recorded when you saved. {v.source !== 'owner_publish' ? 'This is an earlier record of your shop’s rules.' : ''}</p></div></details>)}<div className={styles.merchantNote}><ShieldCheck size={19}/><p>These demo shops use PayPal test payments. No real money or goods change hands.</p></div></aside></div></>}
    </main><SiteFooter/></>;
}
