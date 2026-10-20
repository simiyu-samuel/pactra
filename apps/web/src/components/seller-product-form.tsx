import { useState, type FormEvent } from 'react';
import { Plus, ArrowRight } from 'lucide-react';
import s from './owner-console.module.css';
export default function SellerProductForm({ sellerId, version, disabled, onSaved, report, onExpired, onBusy }: { sellerId: string; version: number; disabled: boolean; onSaved: () => Promise<void>; report: (message: string) => void; onExpired: () => void; onBusy: (busy: boolean) => void }) {
  const [form, setForm] = useState({ name: '', category: 'home', description: '', price: '', minimum: '', stock: '5' });
  const [saving, setSaving] = useState(false);
  const [commandKey, setCommandKey] = useState(() => crypto.randomUUID());
  const edit = (change: Partial<typeof form>) => { setForm({ ...form, ...change }); setCommandKey(crypto.randomUUID()); };
  async function submit(e: FormEvent) {
    e.preventDefault(); if (disabled || saving) return; setSaving(true); onBusy(true);
    try {
      const response = await fetch(`/api/owner/sellers/${sellerId}/products`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({commandKey,expectedVersion:version,name:form.name,category:form.category.trim().toLowerCase(),description:form.description,listCents:Math.round(Number(form.price)*100),floorCents:Math.round(Number(form.minimum)*100),onHand:Number(form.stock)}) });
      const result = await response.json(); if (response.status === 401) onExpired(); if (!response.ok) throw new Error(result.error?.message || 'Your product could not be added.');
      await onSaved(); setForm({name:'',category:'home',description:'',price:'',minimum:'',stock:'5'});setCommandKey(crypto.randomUUID());
    } catch(e) { report((e as Error).message); } finally { setSaving(false); onBusy(false); }
  }
  return <form onSubmit={submit} className={s.addProduct}><h2><Plus size={19}/> Add a product</h2><p>List an item from any category. Your agent will negotiate it within your price limits.</p><fieldset disabled={disabled || saving}><label>Product name<input required minLength={2} maxLength={100} value={form.name} onChange={e=>edit({name:e.target.value})}/></label><label>Category<input required list="shop-categories" maxLength={40} value={form.category} onChange={e=>edit({category:e.target.value.toLowerCase()})}/><datalist id="shop-categories">{['home','electronics','fashion','bags','books','sports','beauty','other'].map(x=><option key={x} value={x}/>)}</datalist></label><label>Product details<textarea required minLength={10} maxLength={1000} rows={3} value={form.description} onChange={e=>edit({description:e.target.value})} placeholder="Include the exact size, colour or model buyers will receive."/></label><div className={s.row}><label>Asking price · USD<input type="number" required min={1} max={10000} step="0.01" value={form.price} onChange={e=>edit({price:e.target.value})}/></label><label>Private minimum · USD<input type="number" required min={0} max={Number(form.price)||10000} step="0.01" value={form.minimum} onChange={e=>edit({minimum:e.target.value})}/></label></div><label>Quantity in stock<input type="number" required min={1} max={10000} value={form.stock} onChange={e=>edit({stock:e.target.value})}/></label><button className="primary full" disabled={disabled||saving}>{saving?'Adding product…':'Add to my shop'}<ArrowRight size={16}/></button></fieldset>{disabled&&!saving&&<p>Save your current rule changes before adding a product.</p>}<small>Demo marketplace. Your minimum price stays private. A category illustration is shown until product photography is added.</small></form>;
}
