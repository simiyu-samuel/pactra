'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, CheckCircle2, Clock3, Handshake, LoaderCircle, LockKeyhole, ShieldCheck } from 'lucide-react';
import { money } from '@pactra/domain';
import type { PolicyDraft } from '@pactra/integrations';
import styles from './owner-console.module.css';

type Line = { id: string; listCents: number; floorCents: number; onHand: number; reserved: number; product: { name: string } };
type Snapshot = { seller: { strategy: string; privateInstructions: string; warrantyMonths: number; standardCents: number; standardDays: number; expressCents: number; expressDays: number }; listings: Array<{ id: string; floorCents: number; onHand: number }> };
type Version = { id: string; version: number; note: string; source: string; createdAt: string; snapshot: Snapshot };
type Seller = Snapshot['seller'] & { id: string; name: string; policyVersion: number; listings: Line[]; policyVersions: Version[] };
const strategies = { price_first: 'Price focused', bundle_first: 'Bundle focused', speed_first: 'Speed focused' };

async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/owner/${path}`, { method: body === undefined ? 'GET' : 'POST', cache: 'no-store', credentials: 'same-origin', headers: body === undefined ? {} : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(data.error?.message || 'Owner request could not be completed.'), { status: response.status });
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
    void run(async () => { const result = await api<{ version: number }>(`sellers/${seller.id}/publish`, draft); await load(seller.id); setNotice(`Version ${result.version} published. Future offers use the updated rules.`); });
  }

  return <><header className="header"><div className="header-inner"><a className="brand" href="/"><span className="brand-mark"><Handshake size={23}/></span>pactra<span className="brand-dot">.</span></a><div className={styles.topActions}><a href="/">Back to the market <ArrowRight size={14}/></a>{auth?.authenticated && <button disabled={busy} onClick={() => void run(async () => { await api('logout', {}); clearPrivate(); setAuth({ authenticated: false, configured: true }); })}>Sign out</button>}</div></div></header>
    <main className={styles.main}>
      <div className={styles.heading}><p className="eyebrow"><ShieldCheck size={15}/> OWNER WORKSPACE</p><h1>Your sellers.<br/><span>Their boundaries.</span></h1><p>Set the rules behind the conversation. Your seller agents negotiate within the policies you publish.</p></div>
      {error && <div className="alert" role="alert">{error}</div>}
      {notice && <div className={styles.success} role="status"><CheckCircle2 size={18}/>{notice}</div>}
      {!auth ? <p className={styles.loading}><LoaderCircle className="spin" size={18}/> Checking owner access…</p>
        : !auth.authenticated ? <section className={styles.login} aria-labelledby="owner-login-heading"><span className="icon-box"><LockKeyhole size={22}/></span><h2 id="owner-login-heading">Private seller workspace</h2><p>Sign in with your owner access code. Buyer sessions cannot open seller policies.</p>{auth.configured ? <form onSubmit={login}><label htmlFor="owner-secret">Owner access code</label><input ref={loginInput} id="owner-secret" type="password" value={secret} autoComplete="current-password" required maxLength={256} onChange={e => setSecret(e.target.value)}/><button className="primary full" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17}/> : <LockKeyhole size={17}/>} Open seller workspace <ArrowRight size={16}/></button></form> : <p className={styles.privateNote}>Owner access has not been configured on this server.</p>}<p className={styles.privateNote}>Access expires after four hours. Private policies stay behind this sign-in.</p></section>
        : !seller || !draft ? <p className={styles.loading}><LoaderCircle className="spin" size={18}/> Loading seller policies…</p>
          : <><div className={styles.tabs} role="group" aria-label="Choose a seller">{sellers.map((s, i) => <button key={s.id} disabled={busy} className={selectedId === s.id ? styles.selected : ''} onClick={() => choose(s)}><span>0{i + 1}</span><b>{s.name}</b><small>Version {s.policyVersion}</small></button>)}</div>
            <div className={styles.workspace}><form className={styles.editor} onSubmit={publish}><div className={styles.cardHeading}><div><p className={styles.kicker}>CURRENT POLICY · V{seller.policyVersion}</p><h2>{seller.name}</h2></div><button type="button" className="text-button" disabled={busy} onClick={() => void run(() => load(seller.id))}>Reload current policy</button></div>
              <fieldset disabled={busy} className={styles.fields}><legend>Agent approach</legend><div className={styles.row}><label>Negotiation strategy<select value={draft.strategy} onChange={e => edit({ strategy: e.target.value as PolicyDraft['strategy'] })}>{Object.entries(strategies).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></label><label>Warranty in months<input type="number" required min={0} max={60} value={draft.warrantyMonths} onChange={e => edit({ warrantyMonths: Number(e.target.value) })}/></label></div><label>Private agent instructions<textarea rows={3} maxLength={1000} value={draft.privateInstructions} onChange={e => edit({ privateInstructions: e.target.value })} placeholder="For example: protect camera margin; offer a microphone concession before reducing the camera price."/></label><p className={styles.help}>Only this seller’s agent receives these instructions. Pricing, stock, and buyer requirements are still enforced.</p></fieldset>
              <fieldset disabled={busy} className={styles.fields}><legend>Delivery promises</legend><div className={styles.row}><label>Standard shipping · USD<input type="number" required min={0} max={100} step="0.01" value={draft.standardCents / 100} onChange={e => edit({ standardCents: Math.round(Number(e.target.value) * 100) })}/></label><label>Standard arrival · days<input type="number" required min={1} max={30} value={draft.standardDays} onChange={e => edit({ standardDays: Number(e.target.value) })}/></label><label>Express shipping · USD<input type="number" required min={0} max={100} step="0.01" value={draft.expressCents / 100} onChange={e => edit({ expressCents: Math.round(Number(e.target.value) * 100) })}/></label><label>Express arrival · days<input type="number" required min={1} max={draft.standardDays} value={draft.expressDays} onChange={e => edit({ expressDays: Number(e.target.value) })}/></label></div></fieldset>
              <fieldset disabled={busy} className={styles.fields}><legend>Prices and inventory</legend><p className={styles.help}>Total stock includes reserved units. Stock and reservations are checked again when you publish.</p><div className={styles.tableWrap}><table><thead><tr><th>Listing</th><th>List price</th><th>Minimum · USD</th><th>Total stock</th><th>Reserved</th></tr></thead><tbody>{seller.listings.map(l => { const line = draft.listings.find(x => x.id === l.id)!; return <tr key={l.id}><td><b>{l.product.name}</b><small>{l.id}</small></td><td>{money(l.listCents)}</td><td><input aria-label={`Minimum price for ${l.product.name}`} type="number" required min={0} max={l.listCents / 100} step="0.01" value={line.floorCents / 100} onChange={e => editLine(l.id, { floorCents: Math.round(Number(e.target.value) * 100) })}/></td><td><input aria-label={`Total stock for ${l.product.name}`} type="number" required min={l.reserved} max={10000} value={line.onHand} onChange={e => editLine(l.id, { onHand: Number(e.target.value) })}/></td><td>{l.reserved}</td></tr>; })}</tbody></table></div></fieldset>
              <fieldset disabled={busy} className={styles.fields}><legend>Publish the next version</legend><label>What changed?<input required minLength={3} maxLength={200} value={draft.note} onChange={e => edit({ note: e.target.value })} placeholder="A short note for the policy history"/></label><p className={styles.help}>Publishing changes future offers and acceptance checks. Already reserved agreements keep their original terms.</p><button className="primary full" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17}/> : <ShieldCheck size={17}/>} Publish version {seller.policyVersion + 1}<ArrowRight size={16}/></button></fieldset>
            </form><aside className={styles.history}><div className={styles.historyTitle}><Clock3 size={19}/><h2>Policy history</h2></div><p className={styles.help}>Published versions are preserved. Showing the latest 20 versions.</p>{seller.policyVersions.map(v => <details key={v.id}><summary><span className={styles.version}>V{v.version}</span><span><b>{v.note}</b><small>{new Date(v.createdAt).toLocaleString()}</small></span></summary><div className={styles.historyBody}><p><b>{strategies[v.snapshot.seller.strategy as keyof typeof strategies] || v.snapshot.seller.strategy}</b> · {v.snapshot.seller.warrantyMonths}-month warranty</p><p>Standard: {money(v.snapshot.seller.standardCents)} / {v.snapshot.seller.standardDays} days<br/>Express: {money(v.snapshot.seller.expressCents)} / {v.snapshot.seller.expressDays} days</p>{v.snapshot.seller.privateInstructions && <p>{v.snapshot.seller.privateInstructions}</p>}<ul>{v.snapshot.listings.map(l => <li key={l.id}><span>{l.id}</span><span>Min. {money(l.floorCents)} · stock {l.onHand}</span></li>)}</ul><p className={styles.help}>Stock shown is the snapshot at publication. {v.source !== 'owner_publish' ? 'This baseline records the values available when history began.' : ''}</p></div></details>)}<div className={styles.merchantNote}><ShieldCheck size={19}/><p>These are fictional storefronts sharing one PayPal sandbox merchant. Policies do not change payment credentials.</p></div></aside></div></>}
    </main></>;
}
