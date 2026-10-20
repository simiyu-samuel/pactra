'use client';
import { useEffect, useState } from 'react';
import { Package } from 'lucide-react';
import ConceptPhoto from './concept-photo';
export type PhotoProduct = { name?: string; role?: string; images?: string[]; isDemo?: boolean };
export default function ProductPhoto({ product, className }: { product?: PhotoProduct; className?: string }) {
  const src=product?.images?.[0];const [failed,setFailed]=useState(false);useEffect(()=>setFailed(false),[src]);
  if(src&&!failed)return <img src={src} alt={product?.name||'Product photo'} className={className} width={800} height={800} loading="lazy" referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>;
  if(product&&product.isDemo!==false&&!src)return <ConceptPhoto role={product.role||'other'} className={className}/>;
  return <div className={`product-photo-empty ${className||''}`}><Package size={34}/><span>{src?'Photo unavailable':'Product photo'}</span></div>;
}
export function ProductGallery({images,title}:{images:string[];title:string}){
  const [selected,setSelected]=useState(0);useEffect(()=>setSelected(0),[images.join('|')]);
  return <div className="product-gallery"><ProductPhoto product={{name:title,images:[images[selected]||images[0]],isDemo:false}}/><div>{images.map((image,i)=><button key={image} type="button" aria-label={`Photo ${i+1} of ${title}`} aria-pressed={i===selected} onClick={()=>setSelected(i)}><img src={image} alt="" referrerPolicy="no-referrer"/></button>)}</div></div>;
}
